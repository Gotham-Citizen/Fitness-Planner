// Muscle taxonomy + volume map, adapted from openGym's frontend/src/lib/muscles.js
// (AGPL-3.0, by DuarteSantos8). Re-implemented for this app's shapes:
// exercise = { id, name, category, target, equipment, secondary_muscles[] }
// session  = { id, listId, startedAt, completedAt, sets: [{ exercise_id, reps, weight, weight_unit }] }
import i18n from "../utils/i18n.js"
import { normalizeLang } from "../utils/locale.js"

import { startOfWeekSundayMs } from "./dates.js"
import { resolveNowMs,trailingCutoffMs } from "./timeWindow.js"

/** A set performed with no external load (reps carry bodyweight). */
export const isBodyweightExercise = (ex) => {
  return String(ex?.equipment || "").toLowerCase() === "body weight"
}

export const MUSCLES = [
  "trapezius", "deltoids", "chest", "upper-back", "serratus",
  "biceps", "triceps", "forearm",
  "abs", "obliques", "lower-back",
  "gluteal", "quadriceps", "hamstring", "adductors", "hip-flexors",
  "calves", "tibialis",
]

export const MUSCLE_LABEL = {
  trapezius: "Traps", deltoids: "Shoulders", chest: "Chest", "upper-back": "Upper back",
  serratus: "Serratus", biceps: "Biceps", triceps: "Triceps", forearm: "Forearms",
  abs: "Abs", obliques: "Obliques", "lower-back": "Lower back", gluteal: "Glutes",
  quadriceps: "Quads", hamstring: "Hamstrings", adductors: "Adductors",
  "hip-flexors": "Hip flexors", calves: "Calves", tibialis: "Shins",
}

export const muscleLabel = (slug) => MUSCLE_LABEL[slug] || slug

// Localized bodymap muscle label (zh via utils/locales, else English).
// Called during render; components re-render on language change via
// useTranslation, so reading the shared instance here stays current.
export const localizedMuscleLabel = (slug) => {
  const fallback = muscleLabel(slug)
  if (normalizeLang(i18n.language) !== "zh") return fallback
  return i18n.t(`muscles.map.${slug}`, { defaultValue: "" }) || fallback
}

// Which muscles the bodymap artwork draws per side (verified against the keys of
// src/lib/body-paths.js male + female front/back views — identical sets).
// Muscles drawn on both sides (trapezius, deltoids, triceps, forearm, adductors,
// calves) appear in both lists so each list matches exactly what its view draws.
export const FRONT_MUSCLES = [
  "trapezius", "deltoids", "chest", "serratus",
  "biceps", "triceps", "forearm",
  "abs", "obliques",
  "quadriceps", "adductors", "hip-flexors",
  "calves", "tibialis",
]

export const BACK_MUSCLES = [
  "trapezius", "deltoids", "upper-back",
  "triceps", "forearm",
  "lower-back",
  "gluteal", "hamstring", "adductors",
  "calves",
]

/** Slugs drawn in the given bodymap view: 'front' | 'back'. */
export const musclesForSide = (side) => {
  return side === "back" ? BACK_MUSCLES : FRONT_MUSCLES
}

const ALIAS = {
  abs: "abs", core: "abs", abdominals: "abs", "lower abs": "abs",
  pectorals: "chest", chest: "chest", "upper chest": "chest",
  biceps: "biceps", brachialis: "biceps",
  glutes: "gluteal", abductors: "gluteal",
  delts: "deltoids", deltoids: "deltoids", shoulders: "deltoids", "rear deltoids": "deltoids", "rotator cuff": "deltoids",
  triceps: "triceps",
  "upper back": "upper-back", back: "upper-back", lats: "upper-back", "latissimus dorsi": "upper-back", rhomboids: "upper-back", trapezius: "trapezius", traps: "trapezius", "levator scapulae": "trapezius",
  calves: "calves", soleus: "calves",
  quads: "quadriceps", quadriceps: "quadriceps",
  forearms: "forearm", wrists: "forearm", "wrist flexors": "forearm", "wrist extensors": "forearm", "grip muscles": "forearm",
  hamstrings: "hamstring",
  spine: "lower-back", "lower back": "lower-back",
  adductors: "adductors", groin: "adductors", "inner thighs": "adductors",
  "serratus anterior": "serratus",
  obliques: "obliques",
  "hip flexors": "hip-flexors",
  shins: "tibialis",
}

// Custom exercises carry only a body part (local `category`), so they fall back to it.
// Weights inside a group sum to ~1.
const BY_BODYPART = {
  chest: { chest: 1 },
  back: { "upper-back": 0.75, "lower-back": 0.25 },
  shoulders: { deltoids: 1 },
  "upper arms": { biceps: 0.5, triceps: 0.5 },
  "lower arms": { forearm: 1 },
  waist: { abs: 0.7, obliques: 0.3 },
  "upper legs": { quadriceps: 0.4, hamstring: 0.35, gluteal: 0.25 },
  "lower legs": { calves: 0.8, tibialis: 0.2 },
  neck: { trapezius: 1 },
  cardio: {},
}

export const SECONDARY_WEIGHT = 0.4

export const canonicalMuscle = (value) => {
  const name = String(value || "").toLowerCase().trim()
  if (!name) return null
  if (MUSCLES.includes(name)) return name
  return ALIAS[name] || null
}

/** { slug: weight } for one exercise. Primary target = 1, each secondary = 0.4. */
export const musclesOf = (ex) => {
  const out = {}
  const add = (name, w) => {
    const slug = canonicalMuscle(name)
    if (slug) out[slug] = Math.max(out[slug] || 0, w)
  }
  if (!ex || typeof ex !== "object") return out
  add(ex.target, 1)
  const secondary = Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : []
  secondary.forEach((m) => add(m, SECONDARY_WEIGHT))
  if (Object.keys(out).length === 0) {
    const fb = BY_BODYPART[String(ex.category || "").toLowerCase()] || {}
    Object.assign(out, fb)
  }
  return out
}

const sessionStartMs = (s) => {
  const t = s?.startedAt || s?.completedAt || s?.start || s?.d
  const ms = t ? new Date(t).getTime() : NaN
  return Number.isFinite(ms) ? ms : 0
}

const repsOf = (set) => {
  const n = typeof set?.reps === "number" ? set.reps : parseInt(set?.reps, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Training load per muscle in "effective sets".
 * items = [{ id, sets }] — a 4x8 bench weighs 4x a single set.
 * Volume in kg is deliberately NOT used here.
 */
export const loadOf = (items, exercisesById) => {
  const load = {}
  for (const item of items || []) {
    if (!item || !(item.sets > 0)) continue
    const ex = item.ex || (exercisesById ? exercisesById.get(item.id) : null) || null
    const m = musclesOf(ex)
    for (const slug of Object.keys(m)) load[slug] = (load[slug] || 0) + m[slug] * item.sets
  }
  return load
}

/** Load for finished sessions (only sets with reps > 0 count). `pick` optionally filters sets. */
export const loadOfSessions = (sessions, exercises, pick) => {
  const byId = new Map((exercises || []).map((ex) => [ex.id, ex]))
  const perExercise = new Map()
  for (const s of sessions || []) {
    if (!s || !s.completedAt) continue
    for (const set of s.sets || []) {
      if (repsOf(set) <= 0) continue
      if (pick && !pick(set)) continue
      const id = set.exercise_id || set.exerciseId
      if (!id) continue
      perExercise.set(id, (perExercise.get(id) || 0) + 1)
    }
  }
  return loadOf([...perExercise].map(([id, sets]) => ({ id, sets })), byId)
}

/**
 * Sessions in one muscle-balance window. win: 0 = all, 7 = this week (Sunday-start,
 * matching the journal), 30 = last 30 days.
 */
export const muscleBalanceWindow = (sessions, win, now = Date.now()) => {
  const list = sessions || []
  if (win === 0) return list
  const nowMs = resolveNowMs(now)
  if (win === 7) {
    const start = startOfWeekSundayMs(nowMs)
    return list.filter((s) => sessionStartMs(s) >= start)
  }
  return list.filter((s) => sessionStartMs(s) > trailingCutoffMs(nowMs, win))
}

/**
 * Shade buckets 0-4 per muscle.
 * Without `thresholds`, levels are relative to the hardest-worked muscle in
 * the same load (original balance-map behavior). With `thresholds` — an
 * ordered array of `{ at, level, exclusive? }` rules, last match wins —
 * levels use that absolute scale instead (openGym semantics for the
 * fatigue/strength views, whose bands must not renormalize per screen).
 */
export const levelsOf = (load, thresholds) => {
  if (thresholds) {
    const lv = {}
    MUSCLES.forEach((m) => {
      const value = Number(load[m] || 0)
      let level = 0
      for (const rule of thresholds) {
        const matches = rule.exclusive ? value > rule.at : value >= rule.at
        if (matches) level = Math.max(0, Math.min(4, rule.level))
      }
      lv[m] = level
    })
    return lv
  }
  const max = Math.max(0, ...MUSCLES.map((m) => load[m] || 0))
  const lv = {}
  MUSCLES.forEach((m) => {
    const v = load[m] || 0
    lv[m] = !v || max <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((v / max) * 4)))
  })
  return lv
}

/** Muscles sorted hardest-worked first; untrained last in body order. */
export const rankOf = (load) => {
  const worked = MUSCLES.filter((m) => (load[m] || 0) > 0)
    .sort((a, b) => load[b] - load[a] || MUSCLES.indexOf(a) - MUSCLES.indexOf(b))
  const missed = MUSCLES.filter((m) => !(load[m] > 0))
  return { worked, missed }
}
