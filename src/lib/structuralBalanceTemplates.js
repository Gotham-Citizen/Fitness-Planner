// Structural-balance ratio tables, adapted from openGym's
// frontend/src/lib/structuralBalanceTemplates.js (AGPL-3.0, by DuarteSantos8).
// Exercise IDs refer to the shared ExerciseDB dataset (same 1,324-exercise library
// this app seeds from), so curated whitelists carry over; remap if your seed differs.

export const EVALUATION_MODES = Object.freeze({
  LOAD_RATIO: "load-ratio",
  BODYWEIGHT_RATIO: "bodyweight-ratio",
  REP_COUNT: "rep-count",
})

export const BALANCE_STATUSES = Object.freeze({
  BALANCED: "balanced",
  BORDERLINE: "borderline",
  WEAK: "weak",
  NO_DATA: "no-data",
})

export const BORDERLINE_BAND_PCT = 5

export const TEMPLATES = {
  poliquin: {
    id: "poliquin",
    label: "Poliquin",
    roles: [
      { id: "narrowBench", label: "Close-grip bench press (anchor)", evaluationMode: EVALUATION_MODES.LOAD_RATIO, exerciseIds: ["0030", "1719"], targetPct: 100 },
      { id: "inclineBench", label: "Incline bench press", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "narrowBench", exerciseIds: ["0047"], targetPct: 91 },
      { id: "dips", label: "Dips (bodyweight + load)", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "narrowBench", exerciseIds: ["0251"], targetPct: 117 },
      { id: "supinePullups", label: "Supine pull-ups (bodyweight + load)", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "narrowBench", exerciseIds: ["0652", "0841"], targetPct: 87 },
      { id: "barbellCurl", label: "Standing barbell curl", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "narrowBench", exerciseIds: ["0031"], targetPct: 40 },
      { id: "highBarSquat", label: "High-bar back squat (anchor)", evaluationMode: EVALUATION_MODES.LOAD_RATIO, exerciseIds: ["1436", "0043"], targetPct: 100 },
      { id: "frontSquat", label: "Front squat", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "highBarSquat", exerciseIds: ["0042"], targetPct: 85 },
      { id: "deadlift", label: "Deadlift", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "highBarSquat", exerciseIds: ["0032"], targetPct: 125 },
      { id: "powerClean", label: "Power clean", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "highBarSquat", exerciseIds: ["0648"], targetPct: 61 },
    ],
  },
  thibaudeauPowerlifting: {
    id: "thibaudeauPowerlifting",
    label: "Thibaudeau (Powerlifting)",
    roles: [
      { id: "squat", label: "Squat (anchor)", evaluationMode: EVALUATION_MODES.LOAD_RATIO, exerciseIds: ["0043", "1436"], targetPct: 100 },
      { id: "bench", label: "Bench press", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "squat", exerciseIds: ["0025"], targetPct: 75 },
      { id: "deadlift", label: "Deadlift", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "squat", exerciseIds: ["0032"], targetPct: 120 },
      { id: "militaryPress", label: "Military press", evaluationMode: EVALUATION_MODES.LOAD_RATIO, anchorRoleId: "squat", exerciseIds: ["0091", "1456", "1457", "0086"], targetPct: 45 },
    ],
  },
  atg: {
    id: "atg",
    label: "ATG",
    roles: [
      { id: "romanianDeadlift", label: "Romanian deadlift (12 reps)", evaluationMode: EVALUATION_MODES.BODYWEIGHT_RATIO, exerciseIds: ["0085"], targetPct: 100, targetPctFemale: 80, reps: 12 },
      { id: "goodMorning", label: "Seated good morning (10 reps)", evaluationMode: EVALUATION_MODES.BODYWEIGHT_RATIO, exerciseIds: ["0090"], targetPct: 66, targetPctFemale: 40, reps: 10 },
      { id: "stepUp", label: "Poliquin step-up (15 reps)", evaluationMode: EVALUATION_MODES.BODYWEIGHT_RATIO, exerciseIds: ["0114", "0431"], targetPct: 50, targetPctFemale: 40, reps: 15 },
      { id: "nordicCurl", label: "Nordic curl (1 rep)", evaluationMode: EVALUATION_MODES.REP_COUNT, exerciseIds: ["3193"], repsTarget: 1 },
      { id: "pullups", label: "Pull-ups (10 reps, bodyweight)", evaluationMode: EVALUATION_MODES.REP_COUNT, exerciseIds: ["0652"], repsTarget: 10, repsTargetFemale: 1 },
      { id: "atgDips", label: "Dips (10 reps, bodyweight)", evaluationMode: EVALUATION_MODES.REP_COUNT, exerciseIds: ["0251"], repsTarget: 10 },
      { id: "inclineDbPress", label: "Incline DB press (each hand, 8 reps)", evaluationMode: EVALUATION_MODES.BODYWEIGHT_RATIO, exerciseIds: ["0314", "3545"], targetPct: 40, targetPctFemale: 20, reps: 8 },
      { id: "dbShoulderPress", label: "DB shoulder press (each hand, 8 reps)", evaluationMode: EVALUATION_MODES.BODYWEIGHT_RATIO, exerciseIds: ["0405", "0404", "0361", "0360"], targetPct: 33, targetPctFemale: 15, reps: 8 },
    ],
  },
}

export const TEMPLATE_LIST = Object.values(TEMPLATES)
export const DEFAULT_TEMPLATE_ID = "poliquin"
