// Shared date formatting for history/summary/account views.
// NOTE: never pass `undefined` as locale — on a Chinese OS that renders
// English-mode dates in Chinese. Default to en-US, callers pass zh-CN/en-US.

/** Full timestamp: "Oct 14, 2026, 09:40 AM". */
export const formatDateTime = (iso, locale) => {
  const d = new Date(iso)
  return d.toLocaleDateString(locale || "en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Long calendar date: "October 14, 2026" ("—" when missing/invalid). */
export const formatLongDate = (value, locale) => {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(locale || "en-US", { year: "numeric", month: "long", day: "numeric" })
}
