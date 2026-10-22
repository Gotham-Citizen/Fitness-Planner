// Canonical equipment grouping for the library's Equipment tab.
// Pure logic — no i18n, no React — so it stays verifiable in plain Node.

// Exact merge map: raw equipment values → group key.
// - "olympic barbell" → "barbell" (same lift, one card)
// - "assisted" → "body weight" (assistance adds no equipment)
// - specialized leftovers → "other" (pinned last in the UI)
const MERGE_MAP = {
  "olympic barbell": "barbell",
  assisted: "body weight",
  hammer: "other",
  "skierg machine": "other",
  tire: "other",
  "upper body ergometer": "other",
}

// Canonical keys that keep their own card (post-merge).
const GROUP_KEYS = new Set([
  "band",
  "barbell",
  "body weight",
  "bosu ball",
  "cable",
  "dumbbell",
  "elliptical machine",
  "ez barbell",
  "kettlebell",
  "leverage machine",
  "medicine ball",
  "resistance band",
  "roller",
  "rope",
  "sled machine",
  "smith machine",
  "stability ball",
  "stationary bike",
  "stepmill machine",
  "trap bar",
  "weighted",
  "wheel roller",
])

/**
 * Returns the canonical group key for a raw equipment string.
 * Merged values follow MERGE_MAP; known keys pass through unchanged;
 * unknown/custom values land in the "other" bucket.
 */
export const canonicalEquipment = (raw) => {
  const key = String(raw || "").trim().toLowerCase()
  if (!key) return "body weight"
  if (MERGE_MAP[key]) return MERGE_MAP[key]
  return GROUP_KEYS.has(key) ? key : "other"
}

/**
 * Groups exercises by canonical equipment key. Returns [{ key, exercises }],
 * unsorted. Every canonical key gets its own group; "other" collects the
 * leftovers and is pinned last by the browser UI.
 */
export const groupExercisesByEquipment = (exercises) => {
  const map = new Map()
  for (const ex of exercises || []) {
    const key = canonicalEquipment(ex?.equipment)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(ex)
  }
  return [...map.entries()].map(([key, exercises]) => ({ key, exercises }))
}
