// Weight-entry parsing, shared by the session's set inputs (and, if a session
// summary ever grows one, by other set-logging surfaces).
//
// Accepts the freedom people actually want in a mid-set input: "50", "50kg",
// "110 lbs", " 85 ". The unit suffix is returned separately so the caller can
// flip the kg/lbs button while the text input keeps showing only the number.

const WEIGHT_INPUT_RE = /^\s*(\d*\.?\d+|\d+\.?)\s*(kg|kgs|lb|lbs)?\s*$/i

export const parseWeightInput = (value) => {
  if (value == null || String(value).trim() === "") return { ok: true, weight: null, weightUnit: null }
  const match = String(value).match(WEIGHT_INPUT_RE)
  if (!match) return { ok: false }
  const weight = parseFloat(match[1])
  if (!Number.isFinite(weight)) return { ok: false }
  const suffix = (match[2] || "").toLowerCase()
  const weightUnit = suffix.startsWith("lb") ? "lbs" : suffix.startsWith("kg") ? "kg" : null
  return { ok: true, weight, weightUnit }
}
