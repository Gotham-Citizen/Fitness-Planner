// Preset-workout library: curated, goal-oriented routines resolved against
// the live exercise catalog. Barrel for the preset data modules plus the
// resolution/filter/payload logic used by the Presets browser, the Home
// showcase, and the plan generator.
import i18n from "../../utils/i18n.js"
import { normalizeLang } from "../../utils/locale.js"

import { titleCase } from "../muscles.js"
import {
  BODY_PART_TARGETS,
  bodyPartName,
  PRESET_BODY_PARTS,
  presetBodyPart,
  QUESTIONNAIRE_FOCUS,
} from "./bodyParts.js"
import { BUILD_PRESETS } from "./build.js"
import { COVERAGE_PRESETS } from "./coverage.js"
import { ENDURANCE_PRESETS } from "./endurance.js"
import { FOCUS_PRESETS } from "./focus.js"
import {
  equipmentMeta,
  goalMeta,
  levelMeta,
  PRESET_EQUIPMENT,
  PRESET_GOALS,
  PRESET_LEVELS,
} from "./goals.js"
import { SLIM_PRESETS } from "./slim.js"
import { STRENGTH_PRESETS } from "./strength.js"

export {
  BODY_PART_TARGETS,
  bodyPartName,
  equipmentMeta,
  goalMeta,
  levelMeta,
  PRESET_BODY_PARTS,
  PRESET_EQUIPMENT,
  PRESET_GOALS,
  PRESET_LEVELS,
  presetBodyPart,
  QUESTIONNAIRE_FOCUS,
}

export const PRESETS = [
  ...STRENGTH_PRESETS,
  ...BUILD_PRESETS,
  ...SLIM_PRESETS,
  ...ENDURANCE_PRESETS,
  ...FOCUS_PRESETS,
  ...COVERAGE_PRESETS,
]

export const getPreset = (id) => PRESETS.find((p) => p.id === id) || null

// --- Body-part showcase ---------------------------------------------------
// The taxonomy (PRESET_BODY_PARTS, presetBodyPart, bodyPartName) lives in
// ./bodyParts.js and is re-exported above so the coverage preset module can
// use it without a circular import.

// Fallback chain when the exact equipment tier has no match: dumbbell users
// can fall back to bands then bodyweight; band users to bodyweight moves
// (pull-ups/chin-ups live in that pool). Shared with the plan generator.
export const EQUIPMENT_FALLBACK = {
  dumbbell: ["dumbbell", "band", "bodyweight"],
  bodyweight: ["bodyweight"],
  band: ["band", "bodyweight"],
  gym: ["gym", "dumbbell", "band", "bodyweight"],
}

// Questionnaire answer ranges shared by the signup wizard (AuthView) and the
// retake questionnaire (QuestionnaireView) so both always offer the same
// choices. Keep in sync with the server's normalizeQuestionnaire validation.
export const QUESTIONNAIRE_DAYS = [1, 2, 3, 4, 5, 6]
export const QUESTIONNAIRE_SESSION_MINUTES = [30, 45, 60, 90, 120, 150, 180]

// Curated "Popular" picks for the Home showcase — the classic routines.
export const POPULAR_PRESET_IDS = [
  "strength-fb-a",
  "build-push",
  "build-pull",
  "build-legs",
  "slim-circuit-bodyweight",
  "build-upper",
  "focus-chest-gym",
  "focus-core-bodyweight",
]

// "Recommended for you": presets matching the saved questionnaire answers —
// focus areas first, then the equipment tier (with fallback). Returns up to
// `limit` presets, empty when there are no answers yet.
export const recommendPresets = (answers, limit = 6) => {
  if (!answers || !answers.goal) return []
  const tiers = EQUIPMENT_FALLBACK[answers.equipment] || EQUIPMENT_FALLBACK.gym
  const matching = PRESETS.filter((p) => p.goal === answers.goal)
  const focusTargets = new Set(
    (answers.focus || [])
      .filter((f) => f && f !== "full-body")
      .flatMap((f) => BODY_PART_TARGETS[f] || []),
  )
  const byFocus = focusTargets.size
    ? matching.filter(
        (p) => presetBodyPart(p) !== "full-body" && (p.focus || []).some((tg) => focusTargets.has(tg)),
      )
    : []
  const byTier = tiers.flatMap((tier) =>
    matching.filter((p) => p.equipment === tier && !byFocus.includes(p)),
  )
  const rest = matching.filter((p) => !byFocus.includes(p) && !byTier.includes(p))
  return [...byFocus, ...byTier, ...rest].slice(0, limit)
}

// Group presets by their focus body part, keeping the PRESET_BODY_PARTS
// order. Empty groups are skipped by the caller.
export const groupPresetsByBodyPart = (presets) => {
  const groups = new Map(PRESET_BODY_PARTS.map((p) => [p.id, []]))
  for (const preset of presets) {
    groups.get(presetBodyPart(preset))?.push(preset)
  }
  return PRESET_BODY_PARTS
    .map((part) => ({ part: part.id, presets: groups.get(part.id) }))
    .filter((group) => group.presets.length > 0)
}

// --- Localization helpers -------------------------------------------------
// Curated preset content is inline multilingual ({ en, zh, es }); dataset
// taxonomy (focus targets) reuses the shared muscles.target dictionary.

const localizedText = (value, lang) => {
  const l = normalizeLang(lang)
  return value?.[l] || value?.en || value?.zh || ""
}

export const presetName = (preset, lang) => localizedText(preset?.name, lang)

export const presetDesc = (preset, lang) => localizedText(preset?.desc, lang)

export const goalName = (goalId, lang) => {
  const meta = goalMeta(goalId)
  if (!meta) return goalId
  return localizedText(meta.name, lang) || goalId
}

export const equipmentName = (equipmentId, lang) => {
  const meta = equipmentMeta(equipmentId)
  if (!meta) return equipmentId
  return localizedText(meta.name, lang) || equipmentId
}

export const levelName = (levelId, lang) => {
  const meta = levelMeta(levelId)
  if (!meta) return levelId
  return localizedText(meta.name, lang) || levelId
}

// Localized dataset target label ("pectorals" -> 胸大肌 / pectorales).
export const focusLabel = (target, lang) => {
  if (normalizeLang(lang) !== "en") {
    return i18n.t(`muscles.target.${target}`, { defaultValue: "" }) || titleCase(target)
  }
  return titleCase(target)
}

export const focusLabels = (targets, lang) => (targets || []).map((tg) => focusLabel(tg, lang))

// --- Resolution against the live exercise catalog -------------------------
// Preset slots reference dataset exercise names. Resolution is exact-name
// first, then substring match, so presets survive minor dataset drift and
// custom exercises never shadow library movements unexpectedly.

const nameKey = (name) => String(name || "").trim().toLowerCase().replace(/\s+/g, " ")

export const resolveExercise = (exercises, exerciseName) => {
  if (!exercises || !exerciseName) return null
  const key = nameKey(exerciseName)
  if (!key) return null
  const exact = exercises.find((ex) => nameKey(ex.name) === key)
  if (exact) return exact
  // Custom exercises first may shadow library rows; prefer library (user-less).
  const substring = exercises.filter((ex) => nameKey(ex.name).includes(key))
  const library = substring.find((ex) => String(ex.id).startsWith("custom-") === false)
  return library || substring[0] || null
}

// Resolve every slot; unavailable slots keep `exercise: null` so the UI can
// grey them out and list creation can skip them.
export const resolvePreset = (preset, exercises, lang = "en") => {
  const slots = (preset.slots || []).map((slot) => ({
    ...slot,
    // Keep the referenced dataset name for display when resolution misses.
    exerciseName: slot.exercise,
    exercise: resolveExercise(exercises, slot.exercise),
  }))
  return {
    ...preset,
    slots,
    goalIcon: goalMeta(preset.goal)?.icon ?? "🏋️",
    availableCount: slots.filter((s) => s.exercise != null).length,
    totalCount: slots.length,
    focusLabels: focusLabels(preset.focus, lang),
  }
}

// --- Filtering ------------------------------------------------------------

export const filterPresets = ({ goal = null, equipment = null, focus = null } = {}) =>
  PRESETS.filter((p) => {
    if (goal && p.goal !== goal) return false
    if (equipment && p.equipment !== equipment) return false
    if (focus && !(p.focus || []).includes(focus)) return false
    return true
  })

// Distinct focus targets across the filtered set (for the muscle-group chips).
export const presetFocusOptions = (presets) => {
  const seen = new Map()
  for (const p of presets) {
    for (const tg of p.focus || []) seen.set(tg, (seen.get(tg) || 0) + 1)
  }
  return [...seen.keys()]
}

// --- List-creation payload ------------------------------------------------
// Applies ACSM progression-model adjustments for training status:
// beginners cap sets at 3 (8-12 RM loading); advanced adds a set to the two
// heaviest compound slots. Short sessions trim trailing accessory slots.

const clampRest = (secs) => {
  const n = Number(secs)
  return Number.isFinite(n) ? Math.min(1800, Math.max(5, Math.round(n))) : 60
}

export const adjustSlots = (slots, { experience = null, sessionMinutes = null } = {}) => {
  let out = slots.map((s) => ({ ...s }))
  if (experience === "beginner") {
    out = out.map((s, i) => (i < 2 ? { ...s, sets: Math.min(s.sets, 3) } : { ...s, sets: Math.min(s.sets, 2) }))
  } else if (experience === "advanced") {
    out = out.map((s, i) => (i < 2 ? { ...s, sets: s.sets + 1 } : s))
  }
  if (sessionMinutes === 30) out = out.slice(0, 4)
  else if (sessionMinutes === 45) out = out.slice(0, 5)
  return out
}

// Build the POST /api/workoutlists payload for one resolved preset day.
export const buildListPayload = (preset, exercises, { experience = null, sessionMinutes = null, name = null, lang = "en" } = {}) => {
  const slots = adjustSlots(preset.slots || [], { experience, sessionMinutes })
  const resolved = slots
    .map((slot) => {
      const ex = resolveExercise(exercises, slot.exercise)
      if (!ex) return null
      return {
        exerciseId: ex.id,
        prescribedSets: slot.sets,
        prescribedReps: slot.reps,
        restSecs: clampRest(slot.restSecs),
      }
    })
    .filter(Boolean)
  return {
    name: name || presetName(preset, lang),
    exercises: resolved,
  }
}
