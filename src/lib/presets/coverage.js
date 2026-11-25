// Generated coverage presets. Every questionnaire combination — goal ×
// equipment tier × focus area — needs at least one plan to assign at signup.
// This module expands a compact exercise-name table into full preset objects
// so the new plans are first-class library entries (browsable/searchable in
// Programs), not runtime-only templates. Cells already covered by the curated
// goal/focus files are skipped to avoid redundant duplicates.
import { BODY_PART_TARGETS, PRESET_BODY_PARTS, QUESTIONNAIRE_FOCUS } from "./bodyParts.js"
import { goalMeta, PRESET_EQUIPMENT, PRESET_GOALS } from "./goals.js"
import { localizedText } from "./localize.js"

// Working movements per focus area and equipment tier. Names come from
// server/data/exercises.json and are verified with resolveExercise at load.
export const POOLS = {
  chest: {
    gym: ["barbell bench press", "barbell incline bench press", "cable bench press", "cable cross-over variation", "dumbbell fly"],
    dumbbell: ["dumbbell bench press", "dumbbell incline bench press", "dumbbell fly", "chest dip", "incline push-up"],
    bodyweight: ["push-up", "incline push-up", "decline push-up", "chest dip", "archer push up"],
    band: ["band bench press", "band one arm twisting chest press", "chest dip", "incline push-up", "push-up"],
  },
  back: {
    gym: ["pull-up", "barbell bent over row", "cable lat pulldown full range of motion", "cable seated row", "barbell shrug"],
    dumbbell: ["archer pull up", "band one arm standing low row", "band underhand pulldown", "dumbbell bent over row", "bodyweight standing row"],
    bodyweight: ["pull-up", "chin-up", "bodyweight standing row", "bodyweight squatting row", "archer pull up"],
    band: ["band assisted pull-up", "band close-grip pulldown", "band one arm standing low row", "band kneeling one arm pulldown", "band shrug"],
  },
  legs: {
    gym: ["barbell full squat", "barbell romanian deadlift", "walking lunge", "lever leg extension", "dumbbell standing calf raise"],
    dumbbell: ["dumbbell goblet squat", "dumbbell lunge", "band squat", "band step-up", "band single leg calf raise"],
    bodyweight: ["curtsey squat", "forward lunge (male)", "bench hip extension", "bodyweight standing calf raise", "backward jump"],
    band: ["band squat", "band step-up", "band stiff leg deadlift", "band single leg calf raise", "band hip lift"],
  },
  shoulders: {
    gym: ["barbell seated overhead press", "dumbbell lateral raise", "barbell rear delt raise", "dumbbell arnold press", "barbell shrug"],
    dumbbell: ["band shoulder press", "band front lateral raise", "band reverse fly", "dumbbell arnold press", "band y-raise"],
    bodyweight: ["scapula dips", "scapular pull-up", "handstand push-up", "chest dip", "incline scapula push up"],
    band: ["band shoulder press", "band front lateral raise", "band reverse fly", "band standing rear delt row", "resistance band seated shoulder press"],
  },
  arms: {
    gym: ["barbell curl", "barbell close-grip bench press", "dumbbell hammer curl", "cable pushdown", "barbell lying close-grip triceps extension"],
    dumbbell: ["dumbbell biceps curl", "dumbbell hammer curl", "band alternating biceps curl", "bench dip (knees bent)", "band side triceps extension"],
    bodyweight: ["bench dip (knees bent)", "biceps pull-up", "diamond push-up", "close-grip push-up", "bodyweight kneeling triceps extension"],
    band: ["band alternating biceps curl", "band concentration curl", "band close-grip push-up", "band side triceps extension", "band one arm overhead biceps curl"],
  },
  core: {
    gym: ["cable kneeling crunch", "cable seated crunch", "barbell press sit-up", "hanging leg raise", "russian twist"],
    dumbbell: ["3/4 sit-up", "band bicycle crunch", "band alternating v-up", "band horizontal pallof press", "air bike"],
    bodyweight: ["3/4 sit-up", "hanging leg raise", "air bike", "alternate heel touchers", "cross body crunch"],
    band: ["band bicycle crunch", "band alternating v-up", "band horizontal pallof press", "band jack knife sit-up", "band lying straight leg raise"],
  },
  cardio: {
    gym: ["jump rope", "burpee", "dumbbell burpee", "cycle cross trainer", "walking on incline treadmill"],
    dumbbell: ["burpee", "mountain climber", "jack burpee", "run", "scissor jumps (male)"],
    bodyweight: ["burpee", "mountain climber", "jump rope", "run", "semi squat jump (male)"],
    band: ["burpee", "mountain climber", "jack burpee", "run", "bear crawl"],
  },
  "full-body": {
    gym: ["barbell full squat", "barbell bench press", "barbell bent over row", "dumbbell standing overhead press", "hanging leg raise"],
    dumbbell: ["dumbbell goblet squat", "dumbbell bench press", "dumbbell bent over row", "band shoulder press", "3/4 sit-up"],
    bodyweight: ["pull-up", "push-up", "curtsey squat", "forward lunge (male)", "3/4 sit-up"],
    band: ["band squat", "band bench press", "band assisted pull-up", "band shoulder press", "band bicycle crunch"],
  },
}

// Sets/reps/rest follow the same ACSM guidance as the curated goal presets.
const STYLES = {
  strength: { sets: 3, reps: "6-10", restSecs: 150, durationMin: 45 },
  build: { sets: 3, reps: "8-12", restSecs: 90, durationMin: 50 },
  slim: { sets: 3, reps: "12-15", restSecs: 45, durationMin: 40 },
  endurance: { sets: 3, reps: "15-20", restSecs: 45, durationMin: 35 },
}

const GOAL_TITLE = {
  strength: { en: "Strength", zh: "力量", es: "Fuerza" },
  build: { en: "Muscle Build", zh: "增肌", es: "Ganancia muscular" },
  slim: { en: "Fat Burn", zh: "燃脂", es: "Quemagrasas" },
  endurance: { en: "Endurance", zh: "耐力", es: "Resistencia" },
}

// Cells already represented in the curated preset files (goal|tier|part).
const COVERED = new Set([
  "strength|gym|full-body", "strength|dumbbell|full-body", "strength|bodyweight|full-body",
  "build|gym|full-body", "build|dumbbell|full-body", "build|bodyweight|full-body",
  "slim|gym|full-body", "slim|dumbbell|full-body", "slim|bodyweight|full-body",
  "endurance|gym|full-body",
  "build|gym|chest", "build|bodyweight|chest",
  "build|gym|back",
  "build|gym|legs", "build|dumbbell|legs", "build|bodyweight|legs",
  "build|gym|shoulders",
  "build|gym|arms",
  "build|bodyweight|core", "endurance|gym|core", "endurance|bodyweight|core",
  "endurance|bodyweight|cardio",
])

const partName = (part) => {
  const meta = PRESET_BODY_PARTS.find((p) => p.id === part)
  return meta?.name || { en: part, zh: part, es: part }
}

const buildPreset = (goal, tier, part) => {
  const style = STYLES[goal]
  const name = partName(part)
  const goalTitle = GOAL_TITLE[goal]
  const tagline = goalMeta(goal)?.tagline || {}
  const slots = (POOLS[part]?.[tier] || []).slice(0, 5).map((exercise, index) => ({
    exercise,
    sets: goal === "strength" && index >= 3 ? 2 : style.sets,
    reps: style.reps,
    restSecs: style.restSecs,
  }))
  return {
    id: `cv-${goal}-${part}-${tier}`,
    goal,
    split: part,
    equipment: tier,
    level: "beginner",
    durationMin: style.durationMin,
    name: {
      en: `${name.en} ${goalTitle.en}`,
      zh: `${goalTitle.zh}·${name.zh}`,
      es: `${goalTitle.es}: ${name.es}`,
    },
    desc: {
      en: `${localizedText(tagline, "en")} Focus: ${name.en}.`,
      zh: `${name.zh}专项：${localizedText(tagline, "zh")}`,
      es: `${localizedText(tagline, "es")}. Enfoque: ${name.es}.`,
    },
    focus: [...(BODY_PART_TARGETS[part] || [])],
    slots,
  }
}

export const COVERAGE_PRESETS = PRESET_GOALS.flatMap(({ id: goal }) =>
  PRESET_EQUIPMENT.flatMap(({ id: tier }) =>
    QUESTIONNAIRE_FOCUS
      .filter((part) => !COVERED.has(`${goal}|${tier}|${part}`))
      .map((part) => buildPreset(goal, tier, part)),
  ),
)
