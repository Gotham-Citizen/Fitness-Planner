import { KG_TO_LBS, LBS_TO_KG } from "./units.js"

// Real-world objects for the fun volume comparison, ascending.
const COMPARISONS_KG = [
  { amount: 20, label: "an Olympic barbell (20 kg)" },
  { amount: 30, label: "a golden retriever (30 kg)" },
  { amount: 100, label: "a giant panda (100 kg)" },
  { amount: 250, label: "an upright piano (250 kg)" },
  { amount: 500, label: "a concert grand piano (500 kg)" },
  { amount: 1000, label: "a small car (1,000 kg)" },
  { amount: 1211, label: "a great white shark (1,211 kg)" },
  { amount: 2000, label: "a rhinoceros (2,000 kg)" },
  { amount: 4000, label: "an African elephant (4,000 kg)" },
  { amount: 8000, label: "a school bus (8,000 kg)" },
]

const COMPARISONS_LBS = [
  { amount: 44, label: "an Olympic barbell (44 lbs)" },
  { amount: 66, label: "a golden retriever (66 lbs)" },
  { amount: 220, label: "a giant panda (220 lbs)" },
  { amount: 550, label: "an upright piano (550 lbs)" },
  { amount: 1100, label: "a concert grand piano (1,100 lbs)" },
  { amount: 2200, label: "a small car (2,200 lbs)" },
  { amount: 2670, label: "a great white shark (2,670 lbs)" },
  { amount: 4400, label: "a rhinoceros (4,400 lbs)" },
  { amount: 8800, label: "an African elephant (8,800 lbs)" },
  { amount: 17600, label: "a school bus (17,600 lbs)" },
]

const weightAs = (weight, unit, target) => {
  const w = typeof weight === "number" ? weight : parseFloat(weight)
  if (!Number.isFinite(w)) return null
  const isLbs = String(unit).toLowerCase() === "lbs"
  if (target === "lbs") return isLbs ? w : w * KG_TO_LBS
  return isLbs ? w * LBS_TO_KG : w
}

export const formatDuration = (ms, lang) => {
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const zh = String(lang || "").toLowerCase().startsWith("zh")
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return zh ? `${h}小时 ${String(m).padStart(2, "0")}分` : `${h}h ${String(m).padStart(2, "0")}m`
  if (m > 0) return zh ? `${m}分 ${String(s).padStart(2, "0")}秒` : `${m}m ${String(s).padStart(2, "0")}s`
  return zh ? `${s}秒` : `${s}s`
}

export const comparisonFor = (volume, unit = "kg", labelList = null) => {
  const ladder = labelList
    ? labelList.map((label, i) => ({ amount: (unit === "lbs" ? COMPARISONS_LBS : COMPARISONS_KG)[i].amount, label }))
    : (unit === "lbs" ? COMPARISONS_LBS : COMPARISONS_KG)
  if (!Number.isFinite(volume) || volume <= 0) return null
  let best = null
  for (const entry of ladder) {
    if (volume >= entry.amount) best = entry
    else break
  }
  if (!best) return { ...ladder[0], times: 0 }
  return { ...best, times: Math.max(1, Math.floor(volume / best.amount)) }
}

export const summarizeSession = (session, list, labels = null) => {
  const sets = session?.sets || []
  const byExercise = new Map()
  for (const s of sets) {
    if (!s?.exercise_id) continue
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, [])
    byExercise.get(s.exercise_id).push(s)
  }

  const exerciseMeta = new Map((list?.exercises || []).map((ex) => [ex.id, ex]))

  const perExercise = [...byExercise.entries()].map(([exerciseId, exSets]) => {
    let volumeKg = 0
    let volumeLbs = 0
    let totalReps = 0
    let maxKg = null
    let maxLbs = null
    for (const s of exSets) {
      const reps = typeof s.reps === "number" ? s.reps : parseInt(s.reps, 10)
      const kg = weightAs(s.weight, s.weight_unit, "kg")
      const lbs = weightAs(s.weight, s.weight_unit, "lbs")
      if (Number.isFinite(reps) && reps > 0) totalReps += reps
      if (kg !== null) {
        if (maxKg === null || kg > maxKg) maxKg = kg
        if (Number.isFinite(reps) && reps > 0) volumeKg += reps * kg
      }
      if (lbs !== null) {
        if (maxLbs === null || lbs > maxLbs) maxLbs = lbs
        if (Number.isFinite(reps) && reps > 0) volumeLbs += reps * lbs
      }
    }
    const meta = exerciseMeta.get(exerciseId) || {}
    const round1 = (v) => (v === null ? null : Math.round(v * 10) / 10)
    return {
      exerciseId,
      name: meta.name || "Unknown exercise",
      sets: exSets,
      setCount: exSets.length,
      totalReps,
      volumeKg: Math.round(volumeKg),
      volumeLbs: Math.round(volumeLbs),
      maxKg: round1(maxKg),
      maxLbs: round1(maxLbs),
    }
  })

  const started = session?.startedAt ? new Date(session.startedAt).getTime() : NaN
  const finished = session?.completedAt ? new Date(session.completedAt).getTime() : NaN
  const totalVolumeKg = Math.round(perExercise.reduce((sum, e) => sum + e.volumeKg, 0))
  const totalVolumeLbs = Math.round(perExercise.reduce((sum, e) => sum + e.volumeLbs, 0))

  return {
    perExercise,
    exerciseCount: perExercise.length,
    setCount: sets.length,
    totalVolumeKg,
    totalVolumeLbs,
    durationMs: Number.isFinite(started) && Number.isFinite(finished) ? finished - started : NaN,
    completedAt: session?.completedAt || null,
    comparison: comparisonFor(totalVolumeKg, "kg", labels?.kg || null),
    comparisonLbs: comparisonFor(totalVolumeLbs, "lbs", labels?.lbs || null),
  }
}
