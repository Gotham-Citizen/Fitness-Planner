// Shared string-enum normalizers (imported by both server/db.js and src/lib).
// Single source of truth so client and server never drift on defaults.

export const GENDERS = ['male', 'female', 'other']

export function normalizeEnum(value, allowed, fallback = null) {
  const v = String(value ?? '').trim().toLowerCase()
  return allowed.includes(v) ? v : fallback
}

export function normalizeGender(value) {
  if (value === null || value === undefined || value === '') return null
  return normalizeEnum(value, GENDERS, null)
}

export function normalizeDisplayName(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim().slice(0, 30)
  return trimmed.length >= 2 ? trimmed : null
}

/** 'rir' | 'rpe' — user preference or per-set scale. Defaults to 'rir'. */
export function normalizeEffortScale(value) {
  return normalizeEnum(value, ['rpe'], 'rir') === 'rpe' ? 'rpe' : 'rir'
}
