// Exercise IDs arrive as padded strings ("0025"), unpadded strings ("25"),
// or numbers (25). One lookup handles every variant so session sets, saved
// lists and the exercise catalog can be joined reliably.
export const keyVariants = (id) => {
  if (id == null) return [String(id)]
  const s = String(id)
  const stripped = s.replace(/^0+(?=\d)/, "")
  const variants = new Set([id, s, stripped])
  const numeric = Number(stripped)
  if (Number.isFinite(numeric)) variants.add(numeric)
  return [...variants]
}

export const buildExerciseMeta = (exercises = []) => {
  const map = new Map()
  for (const exercise of exercises || []) {
    for (const key of keyVariants(exercise?.id)) {
      if (!map.has(key)) map.set(key, exercise)
    }
  }
  return map
}

export const lookupExercise = (map, id) => {
  for (const key of keyVariants(id)) {
    if (map.has(key)) return map.get(key)
  }
  return undefined
}
