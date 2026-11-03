// Slim-down (fat loss) presets. ACSM guidance: light-to-moderate loads
// (40-60% 1RM) for high repetitions with short rest periods (<90 s) for
// local muscular endurance; fat-loss programming pairs resistance circuits
// with cardio activity and a calorie-appropriate diet. Circuit ordering keeps
// rest at 30-60 s to sustain elevated heart rate; each session ends with a
// cardio finisher (jump rope / burpees — all present in the exercise library).

export const SLIM_PRESETS = [
  {
    id: "slim-fb-a",
    goal: "slim",
    split: "full-body",
    equipment: "gym",
    level: "beginner",
    durationMin: 40,
    name: { en: "Fat Burn Circuit A", zh: "燃脂循环 A" },
    desc: {
      en: "Gym circuit at 12-15 reps with a jump-rope finisher.",
      zh: "健身房循环训练，12-15 次每组，跳绳收尾。",
    },
    focus: ["quads", "pectorals", "lats", "abs"],
    slots: [
      { exercise: "dumbbell goblet squat", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "barbell bench press", sets: 3, reps: "12-15", restSecs: 60 },
      { exercise: "cable lat pulldown full range of motion", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "cable seated row", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "russian twist", sets: 2, reps: "15-20", restSecs: 30 },
      { exercise: "jump rope", sets: 3, reps: "30-60 s", restSecs: 30 },
    ],
  },
  {
    id: "slim-fb-b",
    goal: "slim",
    split: "full-body",
    equipment: "gym",
    level: "beginner",
    durationMin: 40,
    name: { en: "Fat Burn Circuit B", zh: "燃脂循环 B" },
    desc: {
      en: "Dumbbell-and-machine circuit ending with burpees.",
      zh: "哑铃与器械循环训练，波比跳收尾。",
    },
    focus: ["glutes", "pectorals", "lats", "delts", "abs"],
    slots: [
      { exercise: "dumbbell lunge", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell bench press", sets: 3, reps: "12-15", restSecs: 60 },
      { exercise: "dumbbell bent over row", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "lever shoulder press", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "hanging leg raise", sets: 2, reps: "12-15", restSecs: 30 },
      { exercise: "burpee", sets: 3, reps: "10-12", restSecs: 30 },
    ],
  },
  {
    id: "slim-fb-c",
    goal: "slim",
    split: "full-body",
    equipment: "gym",
    level: "beginner",
    durationMin: 40,
    name: { en: "Fat Burn Circuit C", zh: "燃脂循环 C" },
    desc: {
      en: "Kettlebell-swing-led circuit with mountain climbers.",
      zh: "壶铃摆动为主的循环训练，配合登山跑。",
    },
    focus: ["glutes", "triceps", "delts", "abs"],
    slots: [
      { exercise: "kettlebell swing", sets: 3, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell step-up", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "cable pushdown", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell rear fly", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "mountain climber", sets: 3, reps: "20-30", restSecs: 30 },
      { exercise: "jump rope", sets: 2, reps: "30-60 s", restSecs: 30 },
    ],
  },
  {
    id: "slim-circuit-bodyweight",
    goal: "slim",
    split: "full-body",
    equipment: "bodyweight",
    level: "beginner",
    durationMin: 30,
    name: { en: "Bodyweight Fat Burn", zh: "徒手燃脂" },
    desc: {
      en: "No-equipment HIIT circuit — cardio bursts between strength moves.",
      zh: "无器械 HIIT 循环——力量动作之间穿插有氧冲刺。",
    },
    focus: ["pectorals", "quads", "abs", "glutes"],
    slots: [
      { exercise: "jump rope", sets: 3, reps: "60 s", restSecs: 30 },
      { exercise: "burpee", sets: 3, reps: "10-12", restSecs: 45 },
      { exercise: "jump squat", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "mountain climber", sets: 3, reps: "20-30", restSecs: 30 },
      { exercise: "push-up", sets: 3, reps: "10-15", restSecs: 45 },
      { exercise: "crunch floor", sets: 2, reps: "15-20", restSecs: 30 },
    ],
  },
  {
    id: "slim-circuit-dumbbell",
    goal: "slim",
    split: "full-body",
    equipment: "dumbbell",
    level: "beginner",
    durationMin: 35,
    name: { en: "Dumbbell Fat Burn", zh: "哑铃燃脂" },
    desc: {
      en: "Home dumbbell circuit with a jump-rope finisher.",
      zh: "居家哑铃循环训练，跳绳收尾。",
    },
    focus: ["quads", "pectorals", "lats", "hamstrings"],
    slots: [
      { exercise: "dumbbell goblet squat", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell bench press", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell bent over row", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell standing overhead press", sets: 2, reps: "12-15", restSecs: 45 },
      { exercise: "dumbbell romanian deadlift", sets: 2, reps: "12-15", restSecs: 45 },
      { exercise: "jump rope", sets: 2, reps: "30-60 s", restSecs: 30 },
    ],
  },
]
