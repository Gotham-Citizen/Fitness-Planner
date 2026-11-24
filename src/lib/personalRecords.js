// Aggregates per-exercise personal records across all completed sessions.
// Pure logic — no React, no i18n — so it stays verifiable in plain Node.

import { LBS_TO_KG } from "./units.js"

const toKg = (weight, unit) => {
  const w = Number(weight)
  if (!Number.isFinite(w) || w <= 0) return null
  return String(unit).toLowerCase() === "lbs" ? w * LBS_TO_KG : w
}

// Epley: 1RM = weight * (1 + reps / 30). A single rep is the weight itself.
const estimate1RM = (kg, reps) => {
  if (!Number.isFinite(kg) || kg <= 0) return null
  const r = Number(reps)
  if (!Number.isFinite(r) || r <= 0) return null
  return r === 1 ? kg : kg * (1 + r / 30)
}

// Normalize an exercise id so "0025", 25, " 25 " all resolve to the same key.
// Non-numeric ids (e.g. "ex_25") are trimmed and left as-is.
const normalizeId = (id) => {
  if (id == null) return null
  const s = String(id).trim()
  return /^-?\d+$/.test(s) ? String(Number(s)) : s
}

// The exercise library doesn't always use `name`; accept the common aliases.
const pickName = (obj) =>
  obj?.name || obj?.title || obj?.nameEn || obj?.displayName || obj?.label || null

// Accept array / Map / {id: exercise} shape for the exercises prop.
const toExerciseList = (exercises) => {
  if (Array.isArray(exercises)) return exercises
  if (exercises instanceof Map) return [...exercises.values()]
  if (exercises && typeof exercises === "object") return Object.values(exercises)
  return []
}

const blankRecord = (id) => ({
  exerciseId: id,
  maxWeightKg: 0,
  maxWeightDate: null,
  maxWeightSessionId: null,
  best1RMKg: 0,
  best1RMDate: null,
  best1RMSessionId: null,
  setCount: 0,
  lastDate: null,
})

/**
 * One record per exercise across every session, sorted by estimated 1RM
 * (descending). `limit` caps the list; pass 0 for all.
 *
 * `exercises` (the full library array) is used two ways:
 *  - `name` resolves via `normalizeId`, so number/string id drift and
 *    leading-zero drift ("0025" vs 25) don't fall back to "Exercise #<id>";
 *  - the matched `meta` row is attached so callers can call rankForWeight
 *    without maintaining a parallel lookup.
 */
export const computePersonalRecords = (sessions, { limit = 5, exercises } = {}) => {
  const metaById = new Map()
  for (const ex of toExerciseList(exercises)) {
    if (ex?.id != null) metaById.set(normalizeId(ex.id), ex)
  }

  const byExercise = new Map()
  for (const s of sessions || []) {
    const sets = s?.sets
    if (!Array.isArray(sets)) continue
    const date = s.completedAt || s.startedAt || null
    for (const set of sets) {
      const rawId = set?.exerciseId ?? set?.exercise_id
      if (rawId == null) continue
      const kg = toKg(set.weight, set.weight_unit ?? set.weightUnit)
      if (kg === null) continue
      const reps = Number(set.reps)
      if (!Number.isFinite(reps) || reps <= 0) continue
      const est = estimate1RM(kg, reps)

      // Key by normalized id so "0025" / "25" / 25 collapse into one record.
      const key = normalizeId(rawId)
      // Keep the raw id for display fallback, so we don't reformat user data.
      const displayId = String(rawId)

      let rec = byExercise.get(key)
      if (!rec) {
        rec = blankRecord(displayId)
        byExercise.set(key, rec)
      }
      rec.setCount += 1
      if (kg > rec.maxWeightKg) {
        rec.maxWeightKg = kg
        rec.maxWeightDate = date
        rec.maxWeightSessionId = s.id
      }
      if (est !== null && est > rec.best1RMKg) {
        rec.best1RMKg = est
        rec.best1RMDate = date
        rec.best1RMSessionId = s.id
      }
      if (date && (!rec.lastDate || date > rec.lastDate)) rec.lastDate = date
    }
  }

  const list = [...byExercise.values()].map((r) => {
    const meta = metaById.get(normalizeId(r.exerciseId)) || null
    const name = pickName(meta) || `Exercise #${r.exerciseId}`
    return { ...r, name, meta }
  })
  list.sort((a, b) => b.best1RMKg - a.best1RMKg)
  return limit > 0 ? list.slice(0, limit) : list
}