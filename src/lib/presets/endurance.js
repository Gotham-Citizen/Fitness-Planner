// Endurance / general-fitness presets. ACSM local muscular endurance
// training: light to moderate loads (40-60% 1RM), high repetitions (>15),
// short rest periods (<90 s). Cardio days use the library's conditioning
// movements (jump rope, burpees, mountain climbers) for intervals.

export const ENDURANCE_PRESETS = [
  {
    id: "end-fb-a",
    goal: "endurance",
    split: "full-body",
    equipment: "gym",
    level: "beginner",
    durationMin: 35,
    name: { en: "Muscular Endurance A", zh: "肌肉耐力 A" },
    desc: {
      en: "Light full-body machine circuit, 15-20 reps per set.",
      zh: "轻负荷全身器械循环，每组 15-20 次。",
    },
    focus: ["quads", "lats", "pectorals", "delts"],
    slots: [
      { exercise: "lever leg extension", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "cable seated row", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell bench press", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "lever shoulder press", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell lateral raise", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dead bug", sets: 2, reps: "15-20", restSecs: 30 },
    ],
  },
  {
    id: "end-fb-b",
    goal: "endurance",
    split: "full-body",
    equipment: "gym",
    level: "beginner",
    durationMin: 35,
    name: { en: "Muscular Endurance B", zh: "肌肉耐力 B" },
    desc: {
      en: "Second light circuit day with different movements.",
      zh: "第二个轻负荷循环训练日，动作组合不同。",
    },
    focus: ["hamstrings", "lats", "delts", "abs"],
    slots: [
      { exercise: "lever lying leg curl", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "cable lat pulldown full range of motion", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell seated shoulder press", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell bent over row", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "dumbbell fly", sets: 2, reps: "15-20", restSecs: 45 },
      { exercise: "air bike", sets: 2, reps: "15-20", restSecs: 30 },
    ],
  },
  {
    id: "end-core-bodyweight",
    goal: "endurance",
    split: "core",
    equipment: "bodyweight",
    level: "beginner",
    durationMin: 25,
    name: { en: "Core Endurance", zh: "核心耐力" },
    desc: {
      en: "High-rep core circuit with short rests.",
      zh: "高次数、短间歇的核心循环训练。",
    },
    focus: ["abs"],
    slots: [
      { exercise: "dead bug", sets: 3, reps: "12-15", restSecs: 30 },
      { exercise: "air bike", sets: 3, reps: "15-20", restSecs: 30 },
      { exercise: "russian twist", sets: 3, reps: "15-20", restSecs: 30 },
      { exercise: "hanging leg raise", sets: 2, reps: "12-15", restSecs: 45 },
      { exercise: "mountain climber", sets: 2, reps: "20-30", restSecs: 30 },
      { exercise: "hip raise (bent knee)", sets: 2, reps: "15-20", restSecs: 30 },
    ],
  },
  {
    id: "end-cardio-bodyweight",
    goal: "endurance",
    split: "cardio",
    equipment: "bodyweight",
    level: "beginner",
    durationMin: 25,
    name: { en: "Cardio Intervals", zh: "有氧间歇" },
    desc: {
      en: "Conditioning intervals with jump rope, burpees and jumps.",
      zh: "跳绳、波比跳与跳跃动作组成的有氧间歇训练。",
    },
    focus: ["cardiovascular system", "quads", "calves"],
    slots: [
      { exercise: "jump rope", sets: 4, reps: "60-90 s", restSecs: 45 },
      { exercise: "burpee", sets: 3, reps: "12-15", restSecs: 45 },
      { exercise: "mountain climber", sets: 3, reps: "20-30", restSecs: 30 },
      { exercise: "jump squat", sets: 3, reps: "15-20", restSecs: 45 },
    ],
  },
]
