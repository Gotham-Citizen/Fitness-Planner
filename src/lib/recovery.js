import { isBodyweightExercise, MUSCLES, musclesOf } from "./muscleMap.js"
import { titleCase } from "./muscles.js"
import { LBS_TO_KG } from "./units.js"

export const RECOVERY_HOURS = 72

// --- openGym-style fatigue / retained-strength (modes 2 + 3 of the muscle map) ---
export const FATIGUE_HALF_LIFE_MS = 36 * 3600 * 1000
export const FATIGUE_REF_VOLUME = 2000
export const FATIGUE_MIN_SESSIONS = 3
export const FATIGUE_SCAN_MS = 30 * 24 * 3600 * 1000
export const STRENGTH_FULL_MS = 14 * 24 * 3600 * 1000
export const STRENGTH_HALF_LIFE_MS = 28 * 24 * 3600 * 1000
export const STRENGTH_FLOOR = 0.5
export const BODYWEIGHT_REF_KG = 75

export const FATIGUE_STATES = Object.freeze({ READY: "ready", RECOVERING: "recovering", FATIGUED: "fatigued" })
export const halfLifeDecay = (ageMs, halfLifeMs) => 0.5 ** (ageMs / halfLifeMs)

// Absolute shade bands for the Fatigue view (same numbers as openGym's Stats:
// levels must not renormalize to the hardest muscle on screen).
export const FATIGUE_LEVELS = Object.freeze([
  { at: 0, level: 0 },
  { at: 0.15, level: 1 },
  { at: 0.25, level: 2 },
  { at: 0.4, level: 3 },
  { at: 0.55, level: 4, exclusive: true },
])

// Absolute shade bands for the Strength view (raw retained strength 0.5-1.0:
// floor/untrained sits at L0, full strength within 14d at L4).
export const STRENGTH_LEVELS = Object.freeze([
  { at: 0, level: 0 },
  { at: 0.625, level: 1 },
  { at: 0.75, level: 2 },
  { at: 0.875, level: 3 },
  { at: 0.97, level: 4, exclusive: true },
])

/** Consumer-facing fatigue state for one numeric fatigue value (openGym boundaries). */
export const fatigueStateOf = (value) => {
  if (value < 0.25) return FATIGUE_STATES.READY
  if (value <= 0.5) return FATIGUE_STATES.RECOVERING
  return FATIGUE_STATES.FATIGUED
}

// A typical solid session lands around this total stimulus; scales the 0-100% bar.
const FATIGUE_SCALE = 3000

const weightKg = (set) => {
  const raw = typeof set.weight === "number" ? set.weight : parseFloat(set.weight)
  const w = Number.isFinite(raw) ? raw : 0
  const unit = String(set.weight_unit ?? set.weightUnit ?? "kg").toLowerCase()
  return unit === "lbs" ? w * LBS_TO_KG : w
}

const repsOf = (set) => {
  const raw = typeof set.reps === "number" ? set.reps : parseInt(set.reps, 10)
  return Number.isFinite(raw) && raw > 0 ? raw : 1
}

const sessionTime = (session) => {
  return session.completedAt || session.startedAt || null
}

const stateFor = (percent) => {
  if (percent >= 85) return "recovered"
  if (percent >= 40) return "recovering"
  return "fatigued"
}

/**
 * Per-target (muscle) recovery from completed sessions.
 *
 * Each logged set adds fatigue proportional to its volume (reps x weight,
 * lbs normalized to kg), decaying linearly to zero over `recoveryHours`
 * from the session date. Muscles never trained (or fully decayed) report 100%.
 */
export const computeRecovery = ({ exercises, allSessions, now = Date.now(), recoveryHours = RECOVERY_HOURS }) => {
  const nowMs = typeof now === "number" ? now : new Date(now).getTime()
  const windowMs = Math.max(1, recoveryHours) * 3600 * 1000

  const byExercise = new Map((exercises || []).map((ex) => [ex.id, ex]))
  const targets = new Map()

  const ensure = (ex) => {
    const key = `${ex.category}|||${ex.target}`
    if (!targets.has(key)) {
      targets.set(key, {
        key,
        name: ex.target,
        label: titleCase(ex.target),
        category: ex.category,
        categoryLabel: titleCase(ex.category),
        fatigue: 0,
        lastTrainedAt: null,
        setCount: 0,
      })
    }
    return targets.get(key)
  }

  // Seed every known target so untrained muscles show as recovered.
  for (const ex of exercises || []) ensure(ex)

  for (const session of allSessions || []) {
    if (!session || !session.completedAt) continue
    const at = sessionTime(session)
    const atMs = at ? new Date(at).getTime() : NaN
    if (!Number.isFinite(atMs) || atMs > nowMs) continue
    const elapsed = nowMs - atMs
    if (elapsed >= windowMs) continue
    const decay = 1 - elapsed / windowMs
    for (const set of session.sets || []) {
      const ex = byExercise.get(set?.exercise_id)
      if (!ex) continue
      const entry = ensure(ex)
      const load = Math.max(repsOf(set) * (weightKg(set) || 1), 1)
      entry.fatigue += load * decay
      entry.setCount += 1
      if (!entry.lastTrainedAt || atMs > new Date(entry.lastTrainedAt).getTime()) {
        entry.lastTrainedAt = at
      }
    }
  }

  return [...targets.values()].map((t) => {
    const percent = Math.round(Math.max(0, Math.min(100, 100 * (1 - t.fatigue / FATIGUE_SCALE))))
    return {
      key: t.key,
      name: t.name,
      label: t.label,
      category: t.category,
      categoryLabel: t.categoryLabel,
      percent: t.lastTrainedAt ? percent : 100,
      state: t.lastTrainedAt ? stateFor(percent) : "recovered",
      lastTrainedAt: t.lastTrainedAt,
      setCount: t.setCount,
    }
  })
}

export const formatLastTrained = (iso, lang) => {
  const zh = String(lang || "").toLowerCase().startsWith("zh")
  if (!iso) return zh ? "从未训练" : "not trained yet"
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return zh ? "刚刚" : "just now"
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return zh ? "刚刚" : "just now"
  if (mins < 60) return zh ? `${mins}分钟前` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return zh ? `${hours}小时前` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return zh ? `${days}天前` : `${days}d ago`
}

// ---------- shared internals for fatigueOf / strengthOf ----------

const emptyMuscleMap = (value) => Object.fromEntries(MUSCLES.map((slug) => [slug, value]))

const sessionStartMs = (s) => {
  const t = s?.startedAt || s?.completedAt
  const ms = t ? new Date(t).getTime() : NaN
  return Number.isFinite(ms) ? ms : null
}

const loadKgFor = (ex, set, session, bodyweightKg) => {
  const raw = typeof set?.weight === "number" ? set.weight : parseFloat(set?.weight)
  const w = Number.isFinite(raw) ? Math.max(0, raw) : 0
  const unit = String(set?.weight_unit ?? set?.weightUnit ?? "kg").toLowerCase()
  const addedKg = unit === "lbs" || unit === "lb" ? w * LBS_TO_KG : w
  const isBw = isBodyweightExercise(ex)
  if (!isBw) return addedKg
  const stamped = session?.bodyweight ? Number(session.bodyweight) : NaN
  let bodyKg = BODYWEIGHT_REF_KG
  if (Number.isFinite(stamped) && stamped > 0) {
    const u = String(session?.bodyweightUnit || "kg").toLowerCase()
    bodyKg = (u === "lbs" || u === "lb" ? stamped * LBS_TO_KG : stamped)
  } else if (bodyweightKg > 0) {
    bodyKg = bodyweightKg
  }
  return bodyKg + addedKg
}

const epley1RM = (load, reps) => load * (1 + Math.min(reps || 1, 12) / 30)

const session1RMs = (session, byExercise, bodyweightKg) => {
  const best = new Map()
  for (const set of session?.sets || []) {
    const reps = Number(set?.reps) || 0
    if (!(reps > 0)) continue
    const ex = byExercise.get(set?.exercise_id || set?.exerciseId)
    const load = loadKgFor(ex, set, session, bodyweightKg)
    if (!(load > 0)) continue
    const est = epley1RM(load, reps)
    const id = set?.exercise_id || set?.exerciseId
    if (!best.has(id) || est > best.get(id)) best.set(id, est)
  }
  return best
}

const sessionTonnages = (session, byExercise, bodyweightKg) => {
  const sums = emptyMuscleMap(0)
  const oneRms = session1RMs(session, byExercise, bodyweightKg)
  for (const set of session?.sets || []) {
    const reps = Number(set?.reps) || 0
    if (!(reps > 0)) continue
    const id = set?.exercise_id || set?.exerciseId
    const ex = byExercise.get(id)
    if (!ex) continue
    const load = loadKgFor(ex, set, session, bodyweightKg)
    const oneRm = oneRms.get(id) || 0
    let tonnage = load * reps
    const isBw = isBodyweightExercise(ex)
    if (!isBw && oneRm > 0 && load > 0) tonnage = tonnage * Math.min(1, load / oneRm) ** 1.5
    if (!(tonnage > 0)) tonnage = FATIGUE_REF_VOLUME / 3 / 10
    const weights = musclesOf(ex)
    for (const [slug, w] of Object.entries(weights)) {
      if (slug in sums) sums[slug] += tonnage * w
    }
  }
  return sums
}

/**
 * Per-muscle fatigue 0..1 (openGym model): chronological stimuli with a 36h half-life,
 * causal downward-only EWMA reference per muscle, saturating 1-exp(-v) normalization.
 */
export const fatigueOf = ({ sessions, exercises, now = Date.now(), bodyweightKg = 0 } = {}) => {
  const nowMs = typeof now === "number" ? now : new Date(now).getTime()
  const result = emptyMuscleMap(0)
  if (!Number.isFinite(nowMs)) return result
  const byExercise = new Map((exercises || []).map((ex) => [ex.id, ex]))
  const cutoff = nowMs - FATIGUE_SCAN_MS
  const ordered = (sessions || [])
    .map((s, index) => ({ s, index, t: sessionStartMs(s) }))
    .filter((x) => Number.isFinite(x.t) && x.s?.completedAt && x.t > cutoff && x.t <= nowMs)
    .sort((a, b) => a.t - b.t || a.index - b.index)
  const references = emptyMuscleMap(FATIGUE_REF_VOLUME)
  const byMuscle = Object.fromEntries(MUSCLES.map((slug) => [slug, []]))
  for (const { s, t } of ordered) {
    const sums = sessionTonnages(s, byExercise, bodyweightKg)
    for (const slug of MUSCLES) {
      const stimulus = sums[slug]
      if (!(stimulus > 0)) continue
      byMuscle[slug].push({ t, stimulus: stimulus / references[slug] })
      const ewma = references[slug] + (stimulus - references[slug]) / FATIGUE_MIN_SESSIONS
      references[slug] = Math.min(references[slug], ewma)
    }
  }
  for (const slug of MUSCLES) {
    const events = byMuscle[slug].sort((a, b) => a.t - b.t)
    if (!events.length) { result[slug] = 0; continue }
    let value = 0
    let last = events[0].t
    for (const ev of events) {
      value *= halfLifeDecay(ev.t - last, FATIGUE_HALF_LIFE_MS)
      value += ev.stimulus
      last = ev.t
    }
    value *= halfLifeDecay(Math.max(0, nowMs - last), FATIGUE_HALF_LIFE_MS)
    result[slug] = 1 - Math.exp(-value)
  }
  return result
}

/**
 * Retained per-muscle strength 0.5..1 plus trained-ness: 1.0 within 14d of
 * last stimulus, then 28d half-life toward the 0.5 floor. Never-trained
 * muscles sit at the floor with trained[slug] === false, so the view can
 * label "Not trained" distinctly from decayed "Weak".
 */
export const strengthMetaOf = ({ sessions, exercises, now = Date.now() } = {}) => {
  const nowMs = typeof now === "number" ? now : new Date(now).getTime()
  const latest = Object.fromEntries(MUSCLES.map((slug) => [slug, -Infinity]))
  const byExercise = new Map((exercises || []).map((ex) => [ex.id, ex]))
  for (const s of sessions || []) {
    if (!s?.completedAt) continue
    const t = sessionStartMs(s)
    if (!Number.isFinite(t)) continue
    for (const set of s.sets || []) {
      if (!(Number(set?.reps) > 0)) continue
      const ex = byExercise.get(set?.exercise_id || set?.exerciseId)
      if (!ex) continue
      for (const slug of Object.keys(musclesOf(ex))) {
        if (slug in latest && t > latest[slug]) latest[slug] = t
      }
    }
  }
  const values = emptyMuscleMap(STRENGTH_FLOOR)
  const trained = Object.fromEntries(MUSCLES.map((slug) => [slug, Number.isFinite(latest[slug])]))
  if (!Number.isFinite(nowMs)) return { values, trained }
  for (const slug of MUSCLES) {
    const last = latest[slug]
    if (!Number.isFinite(last)) continue
    const age = nowMs - last
    values[slug] = age <= STRENGTH_FULL_MS ? 1 : Math.max(STRENGTH_FLOOR, halfLifeDecay(age - STRENGTH_FULL_MS, STRENGTH_HALF_LIFE_MS))
  }
  return { values, trained }
}

export const strengthOf = ({ sessions, exercises, now = Date.now() } = {}) => {
  return strengthMetaOf({ sessions, exercises, now }).values
}

export const fatigueStateFor = (value) => {
  if (value > 0.5) return "fatigued"
  if (value >= 0.25) return "recovering"
  return "ready"
}
