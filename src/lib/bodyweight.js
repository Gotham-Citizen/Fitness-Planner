// Bodyweight helpers: profile canonical value + per-session stamp fallback.
// Session shape: { bodyweight, bodyweightUnit, startedAt, completedAt }
// User shape:    { bodyweight, bodyweightUnit, gender }

import { toKg } from "./units.js"

export { fromKg,toKg } from "./units.js"
export const BODYWEIGHT_FALLBACK_KG = 75

/** Canonical profile bodyweight in kg (null when never logged). */
export const profileBodyweightKg = (user) => {
  if (!user) return null
  return toKg(user.bodyweight, user.bodyweightUnit || "kg")
}

/** Best bodyweight for one session: stamped value, else profile, else null. */
export const sessionBodyweightKg = (session, profileKg) => {
  const stamped = toKg(session?.bodyweight, session?.bodyweightUnit || "kg")
  if (stamped) return stamped
  if (profileKg > 0) return profileKg
  return null
}

export const isValidBodyweight = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 20 && n < 400
}
