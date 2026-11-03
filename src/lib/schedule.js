// Plan & schedule helpers — resolve the user's saved plan into today's
// entry and provide weekday labels/order for the editor and home card.
//
// Schedule shape (server-normalized, see normalizeSchedule in server/db.js):
//   fixed:    { mode:'fixed', weekStartsOn, fixed: { '0'..'6': listId } }
//   rotation: { mode:'rotation', weekStartsOn, rotation: [entry...],
//               rotationStartedAt: 'YYYY-MM-DD' }
// Entries: { type:'workout', listId } | { type:'rest' }.

// 2023-01-01 is a Sunday — offset by weekday for stable Intl labels.
const SUNDAY_ANCHOR = new Date(2023, 0, 1)

export const weekdayName = (weekday, locale = "en") =>
  new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en", { weekday: "long" })
    .format(new Date(SUNDAY_ANCHOR.getTime() + weekday * 86400000))

// Weekdays in display order, starting from the user's chosen week start.
export const orderedWeekdays = (weekStartsOn) => {
  const start = Number.isInteger(weekStartsOn) && weekStartsOn >= 0 && weekStartsOn <= 6 ? weekStartsOn : 0
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7)
}

// Sentinel <select> value for a rest-day row in the rotation loop.
export const REST_DAY_VALUE = "__rest"

// Weekday (0-6) of a stored YYYY-MM-DD, read as a *local* calendar date so a
// UTC parse can never shift it to the previous day. Null when unparseable.
export const weekdayFromISODate = (iso) => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""))
  if (!parts) return null
  const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
  return Number.isNaN(d.getTime()) ? null : d.getDay()
}

// Local YYYY-MM-DD of the next occurrence of `weekday`, on or after today.
export const nextOccurrenceISO = (weekday, now = new Date()) => {
  const day = Number.isInteger(Number(weekday)) && Number(weekday) >= 0 && Number(weekday) <= 6
    ? Number(weekday)
    : 0
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7))
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Local calendar date (no time component) as epoch ms.
const dateOnlyMs = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

// Today's entry for the saved schedule. Returns:
//   { type: "workout", listId } | { type: "rest" } | null (no schedule/loop).
export const todayEntry = (schedule, now = new Date()) => {
  if (!schedule || typeof schedule !== "object") return null
  if (schedule.mode === "fixed") {
    const listId = schedule.fixed?.[String(now.getDay())]
    return listId ? { type: "workout", listId } : { type: "rest" }
  }
  if (schedule.mode === "rotation") {
    const entries = Array.isArray(schedule.rotation) ? schedule.rotation : []
    if (entries.length === 0) return null
    const started = Date.parse(`${schedule.rotationStartedAt}T00:00:00`)
    if (Number.isNaN(started)) return null
    // Round the day delta so DST shifts never off-by-one the loop position.
    const dayDelta = Math.round((dateOnlyMs(now) - started) / 86400000)
    const entry = entries[((dayDelta % entries.length) + entries.length) % entries.length]
    return entry || null
  }
  return null
}
