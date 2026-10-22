// Estimated one-rep max (openGym frontend/src/lib/onerm.js, AGPL-3.0 — re-implemented).
// Knows nothing about the exercise DB: needs weight + reps only.

export const REP_CAP = 12

export const FORMULAS = {
  epley: (w, r) => w * (1 + r / 30),
  brzycki: (w, r) => (w * 36) / (37 - r),
  lombardi: (w, r) => w * Math.pow(r, 0.1),
}
export const DEFAULT_FORMULA = "epley"

export const estimate1RM = (w, r, formula = DEFAULT_FORMULA) => {
  const weight = Number(w)
  const reps = Number(r)
  if (!isFinite(weight) || !isFinite(reps)) return null
  if (weight <= 0 || reps < 1) return null
  if (reps > REP_CAP) return null
  const fn = FORMULAS[formula] || FORMULAS[DEFAULT_FORMULA]
  const est = reps === 1 ? weight : fn(weight, Math.round(reps))
  if (!isFinite(est) || est <= 0) return null
  return Math.round(est * 10) / 10
}

/** Epley run the other way: the load a 1RM shows for `reps` reps. */
export const loadForReps = (oneRmKg, reps) => (reps > 1 ? oneRmKg / (1 + reps / 30) : oneRmKg)

/**
 * A lift read as the load it shows for `reps` reps (for ATG-style "BW for N" standards).
 * A set of at least that many reps proves its own load; shorter sets go up to the 1RM
 * (Epley) and back down — without estimate1RM's rounding so exact-BW sets don't read low.
 */
export const loadAtReps = (loadKg, setReps, reps) => {
  const w = Number(loadKg)
  const r = Math.round(Number(setReps))
  if (!isFinite(w) || w <= 0 || !(r >= 1)) return null
  if (r >= reps) return w
  const oneRm = r === 1 ? w : FORMULAS.epley(w, r)
  return loadForReps(oneRm, reps)
}
