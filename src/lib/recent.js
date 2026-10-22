import { loadJsonKey } from "./storage.js"

const VIEWED_KEY = "recently-viewed-targets"
const MAX_VIEWED = 50

export const loadViewedTargets = () => {
  return loadJsonKey(VIEWED_KEY, [], (parsed) => {
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (v) => v && typeof v.category === "string" && typeof v.target === "string" && typeof v.at === "string",
    ).slice(0, MAX_VIEWED)
  })
}

export const appendViewedTarget = (log, category, target) => {
  const entry = { category, target, at: new Date().toISOString() }
  const next = [entry, ...(Array.isArray(log) ? log : [])]
    .filter((v, i, arr) => v && typeof v.category === "string" && typeof v.target === "string" && arr.findIndex((o) => o.category === v.category && o.target === v.target) === i)
    .slice(0, MAX_VIEWED)
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — state still updates
  }
  return next
}

const stampOf = (entry) => {
  const trained = entry.lastTrainedAt ? Date.parse(entry.lastTrainedAt) : 0
  const viewed = entry.lastViewedAt ? Date.parse(entry.lastViewedAt) : 0
  return Math.max(Number.isFinite(trained) ? trained : 0, Number.isFinite(viewed) ? viewed : 0)
}

// Per-muscle recency combining completed training sessions ("trained")
// with locally viewed movements ("viewed"). Muscles with neither end up
// in `unexplored`.
export const buildRecentRows = ({ hierarchy, allSessions, viewedLog }) => {
  const targets = new Map()
  const byExercise = new Map()
  for (const part of hierarchy || []) {
    for (const t of part.targets || []) {
      targets.set(`${part.name}|||${t.name}`, {
        category: part.name,
        target: t.name,
        label: t.label,
        categoryLabel: part.label,
        lastTrainedAt: null,
        lastViewedAt: null,
      })
      for (const ex of t.exercises || []) byExercise.set(ex.id, `${part.name}|||${t.name}`)
    }
  }

  for (const session of allSessions || []) {
    if (!session || !session.completedAt) continue
    const at = session.completedAt || session.startedAt
    if (!at) continue
    for (const set of session.sets || []) {
      const entry = targets.get(byExercise.get(set?.exercise_id))
      if (entry && (!entry.lastTrainedAt || at > entry.lastTrainedAt)) entry.lastTrainedAt = at
    }
  }

  for (const v of viewedLog || []) {
    const entry = targets.get(`${v.category}|||${v.target}`)
    if (entry && v.at && (!entry.lastViewedAt || v.at > entry.lastViewedAt)) entry.lastViewedAt = v.at
  }

  const touched = []
  const unexplored = []
  for (const entry of targets.values()) {
    if (entry.lastTrainedAt || entry.lastViewedAt) touched.push(entry)
    else unexplored.push(entry)
  }
  touched.sort((a, b) => stampOf(b) - stampOf(a))
  unexplored.sort((a, b) => a.label.localeCompare(b.label))
  return { touched, unexplored }
}
