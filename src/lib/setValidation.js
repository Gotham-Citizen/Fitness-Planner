// Shared finish-time set validation (single source: shared/setRules.js,
// also imported by server/db.js completeSession).
// Valid set = has reps (> 0); weight is optional (reps-only = bodyweight).
// Invalid = weight present but reps missing (blocks Finish).
// Empty = neither reps nor weight (auto-deleted on Finish).

export { classifySets,hasReps,hasWeight,isEmptySet,isInvalidSet } from "../../shared/setRules.js"
