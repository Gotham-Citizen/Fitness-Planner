// Pure helpers for the journal bodyweight card: point building, range
// filtering, 30-day delta, and SVG line-chart geometry. Dependency-free.

import { fromKg,toKg } from "./bodyweight.js"
import { startOfWeekSundayMs } from "./dates.js"
import { filterTrailing } from "./timeWindow.js"

/** Weigh-ins → sorted [{ t, y }] in the display unit. Drops invalid rows. */
export const weighInPoints = (weighIns, displayUnit = "kg") => {
  const pts = []
  for (const w of weighIns || []) {
    const kg = toKg(w?.weight, w?.unit || "kg")
    if (!(kg > 0)) continue
    const t = w?.loggedAt ? new Date(w.loggedAt).getTime() : NaN
    if (!Number.isFinite(t)) continue
    const y = fromKg(kg, displayUnit)
    if (!(y > 0)) continue
    pts.push({ t, y })
  }
  return pts.sort((a, b) => a.t - b.t)
}

/** Points within the last `rangeDays` (0 = all time). */
export const pointsInRange = (points, rangeDays, now = Date.now()) => {
  return filterTrailing(points, (p) => p?.t, rangeDays, now)
}

/** Sunday-start week key (yyyy-mm-dd of the Sunday) for a timestamp. */
export const weekKeySunday = (t) => {
  const start = new Date(startOfWeekSundayMs(t))
  const m = String(start.getMonth() + 1).padStart(2, "0")
  const day = String(start.getDate()).padStart(2, "0")
  return `${start.getFullYear()}-${m}-${day}`
}

/**
 * Weigh-ins grouped into Sunday-start weeks, newest week first.
 * Each week carries its mean (display unit), entry count, the change of its
 * mean vs the previous week that has any (null for the oldest), and its
 * entries newest first (original weigh-in objects with t/y attached).
 * Returns [{ key, avg, n, delta, entries }].
 */
export const weeklyGroups = (weighIns, displayUnit = "kg") => {
  const byWeek = new Map()
  for (const w of weighIns || []) {
    const kg = toKg(w?.weight, w?.unit || "kg")
    if (!(kg > 0)) continue
    const t = w?.loggedAt ? new Date(w.loggedAt).getTime() : NaN
    if (!Number.isFinite(t)) continue
    const y = fromKg(kg, displayUnit)
    if (!(y > 0)) continue
    const key = weekKeySunday(t)
    if (!byWeek.has(key)) byWeek.set(key, [])
    byWeek.get(key).push({ ...w, t, y })
  }
  const weeks = [...byWeek.keys()].sort().map((key) => {
    const entries = byWeek.get(key).slice().sort((a, b) => b.t - a.t)
    const avg = Math.round((entries.reduce((sum, e) => sum + e.y, 0) / entries.length) * 10) / 10
    return { key, n: entries.length, avg, entries }
  })
  weeks.forEach((week, i) => {
    week.delta = i ? Math.round((week.avg - weeks[i - 1].avg) * 10) / 10 : null
  })
  return weeks.reverse()
}

/** Delta tint: gains accent, losses danger, flat/missing inherits. */
export const deltaColor = (delta) => {
  if (delta === null || delta === 0) return "inherit"
  return delta > 0 ? "var(--accent)" : "var(--danger)"
}

export const formatWeighInDate = (iso, locale) => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(locale || "en-US", { year: "numeric", month: "short", day: "numeric" })
}

export const toDateInputValue = (iso) => {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
