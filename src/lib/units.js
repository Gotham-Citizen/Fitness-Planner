// Canonical weight-unit conversion. Single source of truth for LBS_TO_KG
// (previously 0.453592 in most files but 0.45359237 in structuralBalance).

export const LBS_TO_KG = 0.453592
export const KG_TO_LBS = 1 / LBS_TO_KG

const isLbUnit = (unit) => {
  const u = String(unit || "kg").toLowerCase()
  return u === "lbs" || u === "lb"
}

/** Raw numeric value from a weight-like input (null when missing/invalid). */
export const parseWeightNumber = (value) => {
  const n = typeof value === "number" ? value : parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export const toKg = (value, unit) => {
  const n = typeof value === "number" ? value : parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return isLbUnit(unit) ? n * LBS_TO_KG : n
}

export const fromKg = (kg, unit) => {
  if (!Number.isFinite(kg) || kg <= 0) return null
  const v = isLbUnit(unit) ? kg / LBS_TO_KG : kg
  return Math.round(v * 10) / 10
}
