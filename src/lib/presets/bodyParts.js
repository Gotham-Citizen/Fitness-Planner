// Body-part taxonomy shared by the preset browser, the questionnaire focus
// answer, and the plan generator. Kept apart from the PRESETS barrel so the
// generated coverage presets can import it without a circular dependency.
import { localizedText } from "./localize.js"

export const PRESET_BODY_PARTS = [
  { id: "full-body", name: { en: "Full Body", zh: "全身", es: "Total" } },
  { id: "chest", name: { en: "Chest", zh: "胸部", es: "Pecho" } },
  { id: "back", name: { en: "Back", zh: "背部", es: "Espalda" } },
  { id: "legs", name: { en: "Legs & glutes", zh: "腿臀", es: "Tren inferior" } },
  { id: "shoulders", name: { en: "Shoulders", zh: "肩部", es: "Hombros" } },
  { id: "arms", name: { en: "Arms", zh: "手臂", es: "Brazos" } },
  { id: "core", name: { en: "Core", zh: "核心", es: "Core" } },
  { id: "cardio", name: { en: "Cardio", zh: "有氧", es: "Cardio" } },
]

export const QUESTIONNAIRE_FOCUS = PRESET_BODY_PARTS.map((part) => part.id)

// Preset `focus` entries that count as coverage for each questionnaire focus
// choice. Used both to rank recommendations and to select a matching preset
// when building a signup plan.
export const BODY_PART_TARGETS = {
  chest: ["pectorals"],
  back: ["lats", "upper back", "traps", "spine"],
  legs: ["quads", "hamstrings", "glutes", "calves", "adductors", "abductors"],
  shoulders: ["delts", "traps"],
  arms: ["biceps", "triceps", "forearms"],
  core: ["abs"],
  cardio: ["cardiovascular system"],
  "full-body": [],
}

const SPLIT_TO_BODY_PART = {
  chest: "chest",
  back: "back",
  legs: "legs",
  glutes: "legs",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  cardio: "cardio",
}

export const presetBodyPart = (preset) => SPLIT_TO_BODY_PART[preset?.split] || "full-body"

export const bodyPartName = (partId, lang) => {
  const meta = PRESET_BODY_PARTS.find((part) => part.id === partId)
  if (!meta) return partId
  return localizedText(meta.name, lang) || partId
}
