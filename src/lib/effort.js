// RIR (reps-in-reserve) effort statistics.
//
// Semantics inspired by openGym's effort model (AGPL-3.0, DuarteSantos8/openGym):
// RIR is the internal scale (0 = set taken to failure, null = never rated),
// HARD_RIR = 3 separates working sets from warm-up territory, averages are
// withheld below MIN_RATED rated sets, and weekly points need >= 2 rated sets.
// This implementation is original code written for our session shape
// ({ completedAt, sets: [{ reps, rir }] }).

import { normalizeEffortScale } from "../../shared/normalize.js"
import { hasReps } from "../../shared/setRules.js"
import { startOfWeekSundayMs } from "./dates.js"
import { resolveNowMs,trailingCutoffMs } from "./timeWindow.js"

export { normalizeEffortScale }

export const HARD_RIR = 3
export const HARD_RPE = 7
export const MIN_RATED = 5
export const RIR_MIN = 0
export const RIR_MAX = 4
export const RIR_STEP = 0.5
export const RPE_MIN = 6
export const RPE_MAX = 10
export const RPE_STEP = 0.5

/** RIR (0 = failure) <-> RPE (10 = failure). RPE = 10 - RIR. Null stays null. */
export const rirToRpe = (rir) => {
  if (rir == null) return null
  const n = Number(rir)
  if (!Number.isFinite(n)) return null
  return Math.round((10 - n) * 10) / 10
}

export const rpeToRir = (rpe) => {
  if (rpe == null) return null
  const n = Number(rpe)
  if (!Number.isFinite(n)) return null
  return Math.round((10 - n) * 10) / 10
}

// Six bands, hardest first: coarse where estimation is coarse (4+ shares one
// bucket), fine near failure where 0 vs 0.5 vs 1 changes the training.
// Colors ride the shared brand ramp (fatigue rose -> solar amber -> mint) so
// effort tints match the recovery bar and bodymap instead of adding new hues.
export const RIR_BANDS = [
  { rir: 0, max: 0.25, color: "var(--fatigue, var(--danger))", feel: "Nothing left, went to failure", feelKey: "effortFeel.failure" },
  { rir: 0.5, max: 0.75, color: "#e86a5a", feel: "Maybe half a rep left", feelKey: "effortFeel.half" },
  { rir: 1, max: 1.5, color: "var(--recovering)", feel: "One more rep in the tank", feelKey: "effortFeel.one" },
  { rir: 2, max: 2.5, color: "var(--recovering-strong)", feel: "Two more reps", feelKey: "effortFeel.two" },
  { rir: 3, max: 3.5, color: "var(--ready)", feel: "Three more reps", feelKey: "effortFeel.three" },
  { rir: 4, max: Infinity, color: "var(--text-muted)", feel: "Easy, warm-up territory", feelKey: "effortFeel.easy" },
]

export const RIR_PRESETS = RIR_BANDS.map((b) => ({ rir: b.rir, color: b.color, feel: b.feel, feelKey: b.feelKey }))

// RPE presets mirror the RIR bands (RPE = 10 - RIR). The easy tail collapses to
// "6-" since the picker only supports RPE 6-10; harder values display exactly.
export const RPE_PRESETS = RIR_BANDS.map((b) => ({
  rpe: rirToRpe(b.rir),
  rir: b.rir,
  color: b.color,
  feel: b.feel,
  feelKey: b.feelKey,
}))

/** A set's RIR rating, or null when never rated. 0 is a rating (failure), not empty. */
export const rirOf = (set) => {
  const raw = set?.rir
  if (raw == null || raw === "") return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null
}

/**
 * Which scale a set was logged with ('rir' | 'rpe'). Old rows without a scale
 * predate the preference and are RIR. Never throws — defaults to 'rir'.
 */
export const effortScaleOf = (set) => {
  return normalizeEffortScale(set?.effortScale ?? set?.effort_scale ?? set?.scale)
}

/** Display number for a canonical RIR value in the given scale. Null stays null. */
export const effortDisplayValue = (rir, scale) => {
  if (rir == null) return null
  return normalizeEffortScale(scale) === "rpe" ? rirToRpe(rir) : rir
}

/** Display number for a set in its own logged scale (old sets stay RIR). */
export const effortDisplayValueOfSet = (set) => {
  return effortDisplayValue(rirOf(set), effortScaleOf(set))
}

/** 'RIR' | 'RPE' label for a scale value. */
export const effortScaleLabel = (scale) => {
  return normalizeEffortScale(scale) === "rpe" ? "RPE" : "RIR"
}

/**
 * Short tag for one set in its own logged scale, e.g. 'RIR 2' or 'RPE 8'.
 * Null when the set was never rated — keeps history/summary tags clean and
 * matches what the Effort graph counts (rated = rirOf != null).
 */
export const effortTagForSet = (set) => {
  const rir = rirOf(set)
  if (rir == null) return null
  const scale = effortScaleOf(set)
  const val = effortDisplayValue(rir, scale)
  if (val == null) return null
  return `${effortScaleLabel(scale)} ${val}`
}

/**
 * Compact session-level effort for journal cards: how many sets were rated
 * and their average in the majority logged scale. Null when nothing rated.
 * Ties the day card to the graph's `rated of done` coverage line.
 */
export const sessionEffortBadge = (sets) => {
  let rated = 0
  let rpeCount = 0
  let sum = 0
  for (const s of sets || []) {
    const r = rirOf(s)
    if (r == null) continue
    rated += 1
    sum += r
    if (effortScaleOf(s) === "rpe") rpeCount += 1
  }
  if (rated === 0) return null
  const useRpe = rpeCount * 2 >= rated
  const avgRir = sum / rated
  const avg = useRpe ? rirToRpe(avgRir) : avgRir
  const rounded = Math.round(avg * 10) / 10
  const scale = effortScaleLabel(useRpe ? "rpe" : "rir")
  return { rated, scale, avg: rounded, text: `${scale} ${rounded}` }
}

/** Band index (0-5) for a rated value; null stays null (neutral control, no tint). */
export const rirBand = (rir) => {
  if (rir == null) return null
  for (let i = 0; i < RIR_BANDS.length; i += 1) {
    if (rir <= RIR_BANDS[i].max) return i
  }
  return RIR_BANDS.length - 1
}

/** Tint color for one RIR value; null when unrated. */
export const effortColor = (rir) => {
  const band = rirBand(rir)
  return band == null ? null : RIR_BANDS[band].color
}

/** Plain-language feel sentence for one RIR value; null when unrated. */
export const effortFeel = (rir) => {
  const band = rirBand(rir)
  return band == null ? null : RIR_BANDS[band].feel
}

/** i18n key for the feel sentence; null when unrated. */
export const effortFeelKey = (rir) => {
  const band = rirBand(rir)
  return band == null ? null : RIR_BANDS[band].feelKey
}

const completedInWindow = (sessions, days) => {
  const cutoff = days ? trailingCutoffMs(resolveNowMs(), days) : 0
  return (sessions || []).filter((s) => s?.completedAt && (!days || new Date(s.completedAt).getTime() > cutoff))
}

const eachLoggedSet = (sessions, fn) => {
  for (const s of sessions) {
    for (const set of s?.sets || []) {
      if (hasReps(set)) fn(set, s)
    }
  }
}

/**
 * Headline numbers for a window: how hard (avg), how much of it was hard
 * (<= HARD_RIR), and how much training was rated at all. avg/hardPct are null
 * below MIN_RATED rated sets so one tap never reads as a finding.
 */
export const effortSummary = (sessions, days) => {
  const inWin = completedInWindow(sessions, days)
  let done = 0
  let rated = 0
  let sum = 0
  let hard = 0
  eachLoggedSet(inWin, (set) => {
    done += 1
    const r = rirOf(set)
    if (r == null) return
    rated += 1
    sum += r
    if (r <= HARD_RIR) hard += 1
  })
  const ok = rated >= MIN_RATED
  return {
    done,
    rated,
    coverage: done ? rated / done : 0,
    avg: ok ? sum / rated : null,
    hardPct: ok ? hard / rated : null,
  }
}

/** Any rated set at all? Decides whether the effort UI exists. */
export const hasEffort = (sessions) => {
  for (const s of sessions || []) {
    for (const set of s?.sets || []) {
      if (s?.completedAt && rirOf(set) != null) return true
    }
  }
  return false
}

/**
 * Whether RIR/RPE effort logging applies to an exercise.
 * Stretching moves (name contains "stretch") and cardio never take RIR —
 * effort is meaningless there. Matches on canonical English fields so both
 * UI languages share one rule; customs are covered too.
 */
export const isRirEligible = (exercise) => {
  if (!exercise) return false
  const category = String(exercise.category ?? "").trim().toLowerCase()
  if (category === "cardio") return false
  const name = String(exercise.name ?? "")
  if (/\bstretch/i.test(name)) return false
  return true
}

/**
 * Show logged effort for an exercise: the list flag wins when known,
 * otherwise fall back to the data itself (deleted workouts, stale lists)
 * so rated sets stay traceable to the Effort graph.
 */
export const resolveShowEffort = (exerciseMeta, exSets) => {
  if (exerciseMeta && exerciseMeta.rirEnabled !== undefined) {
    return Boolean(exerciseMeta.rirEnabled) && isRirEligible(exerciseMeta)
  }
  return (exSets || []).some((s) => rirOf(s) != null)
}

const startOfWeekSunday = (time) => startOfWeekSundayMs(time)

/**
 * Average RIR per calendar week (Sunday-start, matching the journal calendar),
 * with rated-set counts alongside. Weeks with a single rated set are dropped.
 * `sets` is the week's total logged-set count (rated or not), carried so the
 * chart tooltip can pair volume with effort like openGym does.
 */
export const effortWeeks = (sessions, days) => {
  const inWin = completedInWindow(sessions, days)
  const byWeek = new Map()
  eachLoggedSet(inWin, (set, s) => {
    const t = startOfWeekSunday(new Date(s.completedAt).getTime())
    let b = byWeek.get(t)
    if (!b) byWeek.set(t, (b = { t, sum: 0, n: 0, sets: 0 }))
    b.sets += 1
    const r = rirOf(set)
    if (r == null) return
    b.sum += r
    b.n += 1
  })
  return [...byWeek.values()]
    .filter((b) => b.n >= 2)
    .sort((a, b) => a.t - b.t)
    .map((b) => ({ t: b.t, rir: b.sum / b.n, n: b.n, sets: b.sets }))
}

/** Spread across the scale: buckets 0,1,2,3 and a 4+ tail, with shares. */
export const effortHistogram = (sessions, days) => {
  const inWin = completedInWindow(sessions, days)
  const bins = [0, 0, 0, 0, 0]
  let rated = 0
  eachLoggedSet(inWin, (set) => {
    const r = rirOf(set)
    if (r == null) return
    rated += 1
    bins[Math.min(4, Math.max(0, Math.floor(r)))] += 1
  })
  return bins.map((n, i) => ({ rir: i, tail: i === 4, n, pct: rated ? n / rated : 0 }))
}
