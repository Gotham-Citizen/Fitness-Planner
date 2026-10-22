export const GENDERS = ['male', 'female', 'other']

export const MAX_WEIGHT = 1500

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Finite positive number below the sanity cap (default covers both kg and lbs). */
export function isPositiveNumber(n, max = MAX_WEIGHT) {
  return Number.isFinite(n) && n > 0 && n < max
}
