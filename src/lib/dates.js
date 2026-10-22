// Sunday-start week helpers (matching the journal calendar).
// Note: journal.js weekKeyLocal intentionally uses a noon-anchored local-day
// variant for timezone-safe streak math — it is NOT unified here.

/** Start of the Sunday-start week containing `time`, as epoch ms. */
export const startOfWeekSundayMs = (time) => {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

/** YYYY-MM-DD of the Sunday starting the week containing `input`. */
export const weekKeySunday = (input) => {
  const d = input instanceof Date ? input : new Date(input)
  if (!Number.isFinite(d?.getTime())) return null
  const start = new Date(startOfWeekSundayMs(d.getTime()))
  const m = String(start.getMonth() + 1).padStart(2, "0")
  const day = String(start.getDate()).padStart(2, "0")
  return `${start.getFullYear()}-${m}-${day}`
}
