// Pure helpers for the workout journal calendar.
// All date keys are local YYYY-MM-DD so ticks don't shift across timezones.

import { resolveNowMs,trailingCutoffMs } from "./timeWindow.js"
import { LBS_TO_KG,toKg } from "./units.js"

export const dateKeyLocal = (input) => {
  const d = input instanceof Date ? input : new Date(input)
  if (!Number.isFinite(d?.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const todayKeyLocal = (now = new Date()) => {
  return dateKeyLocal(now)
}

// Only completed sessions earn a tick. Keyed off completedAt (local date).
export const groupCompletedByDate = (sessions) => {
  const groups = new Map()
  for (const s of sessions || []) {
    if (!s?.completedAt) continue
    const key = dateKeyLocal(s.completedAt)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }
  return groups
}

// 6x7 Sunday-start grid covering the month. Each cell: { date, key, inMonth }.
export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1)
  const lead = first.getDay()
  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(year, month, 1 - lead + i)
    cells.push({
      date,
      key: dateKeyLocal(date),
      inMonth: date.getMonth() === month,
    })
  }
  return cells
}

// Sunday-start week key (matches buildMonthGrid): YYYY-MM-DD of the week's Sunday.
export const weekKeyLocal = (input) => {
  const d = input instanceof Date ? input : new Date(input)
  if (!Number.isFinite(d?.getTime())) return null
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 12, 0, 0, 0)
  return dateKeyLocal(start)
}

// Consecutive trained weeks ending in the current week (or last week if this
// week is rest) — openGym-style week streak.
export const streakWeeks = (groups, now = new Date()) => {
  const weeks = new Set()
  for (const key of groups?.keys?.() || []) {
    const wk = weekKeyLocal(new Date(`${key}T12:00:00`))
    if (wk) weeks.add(wk)
  }
  if (weeks.size === 0) return 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 12, 0, 0, 0)
  if (!weeks.has(dateKeyLocal(cursor))) cursor.setDate(cursor.getDate() - 7)
  let streak = 0
  while (weeks.has(dateKeyLocal(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

// openGym-style subtitle inputs: sessions + sets trained in the current week.
export const weekStats = (groups, now = new Date()) => {
  const currentWeek = weekKeyLocal(now)
  let doneThisWeek = 0
  let setsThisWeek = 0
  let totalSessions = 0
  for (const [key, list] of groups || []) {
    totalSessions += list.length
    if (weekKeyLocal(new Date(`${key}T12:00:00`)) === currentWeek) {
      doneThisWeek += list.length
      for (const s of list) setsThisWeek += (s?.sets || []).length
    }
  }
  return { weekStreak: streakWeeks(groups, now), doneThisWeek, setsThisWeek, totalSessions }
}

export const monthStats = (groups, year, month) => {
  let trainedDays = 0
  let totalSessions = 0
  let totalSets = 0
  for (const [key, list] of groups) {
    const d = new Date(`${key}T12:00:00`)
    if (d.getFullYear() === year && d.getMonth() === month) {
      trainedDays += 1
      totalSessions += list.length
      for (const s of list) totalSets += (s?.sets || []).length
    }
  }
  // Current streak ending today (or yesterday if today is rest).
  let streak = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  if (!groups.has(dateKeyLocal(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (groups.has(dateKeyLocal(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return { trainedDays, totalSessions, totalSets, streak }
}

// Trailing-30-day last minus first weigh-in, in the display unit (null when
// fewer than 2 weigh-ins landed in the window).
export const trailing30dWeightDelta = (weighIns, displayUnit = "kg", now = Date.now()) => {
  const nowMs = resolveNowMs(now)
  const cutoff = trailingCutoffMs(nowMs, 30)
  const inWindow = []
  for (const w of weighIns || []) {
    const t = w?.loggedAt ? new Date(w.loggedAt).getTime() : NaN
    if (!Number.isFinite(t) || t <= cutoff) continue
    const raw = typeof w?.weight === "number" ? w.weight : parseFloat(w?.weight)
    if (!Number.isFinite(raw) || raw <= 0) continue
    inWindow.push({ t, raw, unit: w?.unit || "kg" })
  }
  if (inWindow.length < 2) return null
  inWindow.sort((a, b) => a.t - b.t)
  const toDisplay = (raw, unit) => {
    const u = String(unit || "kg").toLowerCase()
    const du = String(displayUnit || "kg").toLowerCase()
    const kg = (u === "lbs" || u === "lb") ? raw * LBS_TO_KG : raw
    const v = (du === "lbs" || du === "lb") ? kg / LBS_TO_KG : kg
    return v
  }
  const delta = toDisplay(inWindow[inWindow.length - 1].raw, inWindow[inWindow.length - 1].unit)
    - toDisplay(inWindow[0].raw, inWindow[0].unit)
  return Math.round(delta * 10) / 10
}

// Exercises progressed in the trailing 30 days vs prior history: higher max
// set weight, higher max single-set reps, or more sets than the preceding 30
// days. Null-weight sets still count via reps/sets (bodyweight moves).
// First-time exercises count.
export const trailing30dProgressedCount = (sessions, now = Date.now()) => {
  const nowMs = resolveNowMs(now)
  const windowStart = trailingCutoffMs(nowMs, 30)
  const prevStart = trailingCutoffMs(nowMs, 60)
  const numReps = (reps) => {
    const n = typeof reps === "number" ? reps : parseInt(reps, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  // Per exercise: { wWin, rWin, nWin, wPrior, rPrior, nPrev }
  const byExercise = new Map()
  const row = (id) => {
    if (!byExercise.has(id)) byExercise.set(id, { wWin: 0, rWin: 0, nWin: 0, wPrior: 0, rPrior: 0, nPrev: 0 })
    return byExercise.get(id)
  }
  for (const s of sessions || []) {
    if (!s?.completedAt) continue
    const t = new Date(s.completedAt).getTime()
    if (!Number.isFinite(t) || t > nowMs) continue
    const inWindow = t > windowStart
    const inPrev = t > prevStart && t <= windowStart
    for (const set of s?.sets || []) {
      if (!set?.exercise_id) continue
      const r = row(set.exercise_id)
      const kg = toKg(set.weight, set.weight_unit)
      const reps = numReps(set.reps)
      if (inWindow) {
        r.nWin += 1
        if (kg > 0 && kg > r.wWin) r.wWin = kg
        if (reps !== null && reps > r.rWin) r.rWin = reps
      } else {
        // Prior bests cover everything before the window (prev window + older).
        if (kg > 0 && kg > r.wPrior) r.wPrior = kg
        if (reps !== null && reps > r.rPrior) r.rPrior = reps
        if (inPrev) r.nPrev += 1
      }
    }
  }
  let count = 0
  for (const r of byExercise.values()) {
    if (r.nWin === 0) continue
    if ((r.wWin > 0 && (!(r.wPrior > 0) || r.wWin > r.wPrior))
      || (r.rWin > 0 && (!(r.rPrior > 0) || r.rWin > r.rPrior))
      || r.nWin > r.nPrev) count += 1
  }
  return count
}
