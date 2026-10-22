// LoL-style max-weight ranks, calibrated to StrengthLevel entire-community
// 1RM averages (Beginner/Novice/Intermediate/Advanced/Elite) + midpoints.
// Fixed kg tables (raw max weight, not bodyweight-relative).
// Sources: strengthlevel.com (Bench 48M, Squat 25M, Deadlift 23M lifts, 2014-2026),
// corroborated by ExRx.net standards.

import { LBS_TO_KG } from "./units.js"

export const RANKS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
]

// Min kg (inclusive) to reach ranks[1..9]. Below thresholds[0] = Iron.
const TABLES_MALE = {
  squat: { label: "Squat", thresholds: [66, 80, 95, 113, 131, 152, 173, 196, 219] },
  bench: { label: "Bench Press", thresholds: [49, 60, 70, 83, 96, 112, 127, 144, 160] },
  deadlift: { label: "Deadlift", thresholds: [80, 97, 113, 134, 154, 178, 202, 228, 253] },
  ohp: { label: "Overhead Press", thresholds: [29, 37, 44, 53, 62, 73, 84, 96, 107] },
  row: { label: "Bent-Over Row", thresholds: [43, 53, 62, 75, 87, 102, 116, 132, 147] },
  hip_thrust: { label: "Hip Thrust", thresholds: [45, 65, 85, 113, 140, 174, 208, 247, 286] },
  leg_press: { label: "Leg Press", thresholds: [96, 125, 153, 190, 227, 272, 316, 365, 414] },
  barbell_curl: { label: "Barbell Curl", thresholds: [19, 25, 30, 38, 45, 54, 62, 72, 82] },
  db_curl: { label: "Dumbbell Curl", thresholds: [7, 10, 13, 17, 21, 26, 31, 37, 42] },
}

// Same method from female entire-community 1RM:
// Bench 19/33/51/72/97, Squat 32/51/76/105/137, Deadlift 41/63/91/124/160,
// OHP 13/21/33/46/61, Row 18/30/44/62/82, Hip Thrust 35/64/102/149/203,
// Leg Press 52/94/151/222/302, BB Curl 8/15/24/36/50, DB Curl 4/7/12/18/25.
const TABLES_FEMALE = {
  squat: { label: "Squat", thresholds: [32, 42, 51, 64, 76, 91, 105, 121, 137] },
  bench: { label: "Bench Press", thresholds: [19, 26, 33, 42, 51, 62, 72, 85, 97] },
  deadlift: { label: "Deadlift", thresholds: [41, 52, 63, 77, 91, 108, 124, 142, 160] },
  ohp: { label: "Overhead Press", thresholds: [13, 17, 21, 27, 33, 40, 46, 54, 61] },
  row: { label: "Bent-Over Row", thresholds: [18, 24, 30, 37, 44, 53, 62, 72, 82] },
  hip_thrust: { label: "Hip Thrust", thresholds: [35, 50, 64, 83, 102, 126, 149, 176, 203] },
  leg_press: { label: "Leg Press", thresholds: [52, 73, 94, 123, 151, 187, 222, 262, 302] },
  barbell_curl: { label: "Barbell Curl", thresholds: [8, 12, 15, 20, 24, 30, 36, 43, 50] },
  db_curl: { label: "Dumbbell Curl", thresholds: [4, 6, 7, 10, 12, 15, 18, 22, 25] },
}

// 'male' -> male tables; anything else (female/other) -> female tables.
// Null/undefined callers default to male for backwards compatibility.
export const isMaleGender = (gender) => {
  return String(gender || "male").trim().toLowerCase() === "male"
}

const tablesFor = (gender) => {
  return isMaleGender(gender ?? "male") ? TABLES_MALE : TABLES_FEMALE
}

export const weightToKg = (weight, unit) => {
  const w = typeof weight === "number" ? weight : parseFloat(weight)
  if (!Number.isFinite(w)) return null
  const u = String(unit || "kg").toLowerCase()
  return u === "lbs" ? w * LBS_TO_KG : w
}

const nameOf = (exercise) => {
  return `${exercise?.name || ""} ${exercise?.equipment || ""}`.toLowerCase()
}

export const matchTableForExercise = (exercise, gender = "male") => {
  const TABLES = tablesFor(gender)
  const n = nameOf(exercise)
  if (n.includes("hip thrust") || n.includes("glute bridge")) return { key: "hip_thrust", ...TABLES.hip_thrust }
  if (n.includes("leg press") || (n.includes("sled") && n.includes("press"))) return { key: "leg_press", ...TABLES.leg_press }
  if (n.includes("deadlift")) return { key: "deadlift", ...TABLES.deadlift }
  if (n.includes("squat")) return { key: "squat", ...TABLES.squat }
  if (n.includes("shoulder press") || n.includes("overhead press") || n.includes("military press") || /\bohp\b/.test(n)) {
    return { key: "ohp", ...TABLES.ohp }
  }
  if (n.includes("bench")) return { key: "bench", ...TABLES.bench }
  if (n.includes("row")) return { key: "row", ...TABLES.row }
  if (n.includes("curl")) {
    const isDb = n.includes("dumbbell") || String(exercise?.equipment || "").toLowerCase().includes("dumbbell")
    return isDb ? { key: "db_curl", ...TABLES.db_curl } : { key: "barbell_curl", ...TABLES.barbell_curl }
  }
  // Category fallback for the 1,324-exercise library.
  const category = String(exercise?.category || "").toLowerCase()
  if (category === "upper legs" || category === "lower legs") return { key: "squat", ...TABLES.squat }
  if (category === "chest") return { key: "bench", ...TABLES.bench }
  if (category === "back") return { key: "row", ...TABLES.row }
  if (category === "shoulders") return { key: "ohp", ...TABLES.ohp }
  return { key: "barbell_curl", ...TABLES.barbell_curl }
}

export const rankForWeight = (weightKg, exercise, gender = "male") => {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { tier: "Unranked", tierIndex: -1, tableKey: matchTableForExercise(exercise, gender).key, gender: isMaleGender(gender) ? "male" : "female", nextAt: null, progress: 0 }
  }
  const table = matchTableForExercise(exercise, gender)
  const resolvedGender = isMaleGender(gender) ? "male" : "female"
  const t = table.thresholds
  if (weightKg < t[0]) {
    return { tier: RANKS[0], tierIndex: 0, tableKey: table.key, tableLabel: table.label, gender: resolvedGender, min: 0, nextAt: t[0], progress: Math.max(0, Math.min(1, weightKg / t[0])) }
  }
  for (let i = t.length - 1; i >= 0; i--) {
    if (weightKg >= t[i]) {
      const tierIndex = i + 1
      const nextAt = tierIndex < RANKS.length - 1 ? t[i + 1] ?? null : null
      const min = t[i]
      const progress = nextAt === null ? 1 : Math.max(0, Math.min(1, (weightKg - min) / (nextAt - min)))
      return { tier: RANKS[tierIndex], tierIndex, tableKey: table.key, tableLabel: table.label, gender: resolvedGender, min, nextAt, progress }
    }
  }
  return { tier: RANKS[0], tierIndex: 0, tableKey: table.key, gender: resolvedGender, nextAt: t[0], progress: 0 }
}

// Max kg per exercise across sessions (optionally excluding one session id).
export const previousBestsByExercise = (allSessions, excludeSessionId = null) => {
  const best = new Map()
  for (const session of allSessions || []) {
    if (!session || (excludeSessionId && session.id === excludeSessionId)) continue
    for (const s of session.sets || []) {
      if (!s?.exercise_id) continue
      const kg = weightToKg(s.weight, s.weight_unit)
      if (kg === null || kg <= 0) continue
      const prev = best.get(s.exercise_id)
      if (prev === undefined || kg > prev) best.set(s.exercise_id, kg)
    }
  }
  return best
}
