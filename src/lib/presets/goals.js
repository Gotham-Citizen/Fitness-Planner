// Preset goals — shared metadata for the preset library and the plan
// generator. Labels/descriptions are inline bilingual ({ en, zh }) like the
// rest of the app's curated content (exercise names, muscle dictionary).
//
// Programming parameters across the library follow evidence-based guidance:
// - ACSM Position Stand "Progression Models in Resistance Training for
//   Healthy Adults" (Med Sci Sports Exerc, 2009): loading/sets/rest/frequency
//   per goal and training status, exercise ordering (multi-joint before
//   single-joint), and the 2-10% load-progression rule.
// - ACSM's Guidelines for Exercise Testing and Prescription (11th ed.) for
//   general cardiorespiratory and muscular-fitness prescriptions.

export const PRESET_GOALS = [
  {
    id: "strength",
    icon: "🏋️",
    name: { en: "Strength", zh: "力量" },
    tagline: {
      en: "Heavy compound lifts, long rests — build maximal strength.",
      zh: "大重量复合动作、长间歇——提升最大力量。",
    },
  },
  {
    id: "build",
    icon: "💪",
    name: { en: "Muscle build", zh: "增肌" },
    tagline: {
      en: "Moderate loads, higher volume — grow muscle size.",
      zh: "中等负荷、高训练量——促进肌肉围度增长。",
    },
  },
  {
    id: "slim",
    icon: "🔥",
    name: { en: "Slim down", zh: "减脂塑形" },
    tagline: {
      en: "Circuits + cardio finishers — burn fat, keep muscle.",
      zh: "循环训练 + 有氧收尾——燃脂同时保住肌肉。",
    },
  },
  {
    id: "endurance",
    icon: "🫀",
    name: { en: "Endurance", zh: "耐力" },
    tagline: {
      en: "Light loads, high reps, short rests — general fitness.",
      zh: "轻负荷、高次数、短间歇——提升整体体能。",
    },
  },
]

// Equipment tiers a preset can target. "gym" assumes barbell + machines +
// cables + dumbbells; "dumbbell" a home dumbbell set; "bodyweight" no
// equipment (a pull-up bar is noted on the presets that use one).
export const PRESET_EQUIPMENT = [
  { id: "gym", name: { en: "Full gym", zh: "健身房" } },
  { id: "dumbbell", name: { en: "Dumbbells", zh: "哑铃" } },
  { id: "bodyweight", name: { en: "Bodyweight", zh: "徒手" } },
]

// Difficulty shown on preset cards.
export const PRESET_LEVELS = [
  { id: "beginner", name: { en: "Beginner", zh: "初级" } },
  { id: "intermediate", name: { en: "Intermediate", zh: "中级" } },
]

export const goalMeta = (goalId) => PRESET_GOALS.find((g) => g.id === goalId) || null

export const equipmentMeta = (equipmentId) =>
  PRESET_EQUIPMENT.find((e) => e.id === equipmentId) || null

export const levelMeta = (levelId) => PRESET_LEVELS.find((l) => l.id === levelId) || null
