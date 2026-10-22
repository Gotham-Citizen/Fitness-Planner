// Shared finish-time set predicates (imported by both server/db.js and
// src/lib). Valid set = has reps (> 0); weight is optional (reps-only =
// bodyweight). Invalid = weight present but reps missing (blocks Finish).
// Empty = neither reps nor weight (auto-deleted on Finish).

export const hasReps = (set) => {
  return Number(set?.reps) > 0
}

export const hasWeight = (set) => {
  const w = set?.weight
  return w !== null && w !== undefined && w !== '' && Number(w) > 0
}

export const isEmptySet = (set) => {
  return !hasReps(set) && !hasWeight(set)
}

export const isInvalidSet = (set) => {
  return !hasReps(set) && hasWeight(set)
}

export const classifySets = (sets) => {
  const list = sets || []
  const invalidIds = []
  const emptyIds = []
  let validCount = 0
  for (const s of list) {
    if (hasReps(s)) validCount += 1
    else if (hasWeight(s)) {
      if (s?.id) invalidIds.push(s.id)
    } else if (s?.id) emptyIds.push(s.id)
  }
  return { invalidIds, emptyIds, validCount }
}
