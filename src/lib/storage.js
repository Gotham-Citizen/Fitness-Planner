// Safe localStorage JSON helpers (quota/private-mode errors swallowed).
// `validate`, when given, receives the parsed value and must return the value
// to use (falling back itself when the shape is wrong).

export const loadJsonKey = (key, fallback, validate) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (validate) return validate(parsed)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const saveJsonKey = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value ?? {}))
  } catch {
    // ignore quota errors
  }
}
