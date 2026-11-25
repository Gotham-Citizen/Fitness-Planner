import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { rankForWeight, RANKS } from '../src/lib/ranks.js'
import { comparisonFor } from '../src/lib/summary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'server', 'sql', 'generated', 'test-data.sql')
const EXERCISES_PATH = resolve(ROOT, 'server', 'data', 'exercises.json')

// Test user stays stable so the documented login keeps working after resets.
const USER_ID = '5cc2972e-cb11-42e1-9e3b-2702ff34b957'
const PASSWORD_HASH = 'pbkdf2:100000:TNXG6MTYESkJwgHf4idn/Q==:8d27aA8HVRZCJ2PKTAjZvLso+0bA5GROEntfuftaWKE='
const QUESTIONNAIRE = JSON.stringify({
  goal: 'build',
  experience: 'intermediate',
  daysPerWeek: 3,
  equipment: 'gym',
  sessionMinutes: 60,
})

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

const sql = (value) => {
  if (value == null) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const pad = (n) => String(n).padStart(2, '0')

const assert = (condition, message) => {
  if (!condition) throw new Error(`test-data assertion failed: ${message}`)
}

// ---------- configuration ----------

// Exercise key -> library id, with the reps used for its logged sets.
const EXERCISES = {
  bench: { id: '0025', reps: 8 },
  inclineBench: { id: '0047', reps: 8 },
  closeGripBench: { id: '0030', reps: 10 },
  chestDip: { id: '0251', reps: 10 },
  ohp: { id: '0091', reps: 12 },
  pullUp: { id: '0652', reps: 8 },
  row: { id: '0027', reps: 8 },
  curl: { id: '0031', reps: 10 },
  squat: { id: '0043', reps: 6 },
  deadlift: { id: '0032', reps: 5 },
  romanianDeadlift: { id: '0085', reps: 10 },
  powerClean: { id: '0648', reps: 5 },
}

const LISTS = [
  {
    id: 'test-list-push',
    name: 'Test Push',
    exercises: [
      { key: 'bench', prescribedSets: 4, prescribedReps: '6-8' },
      { key: 'inclineBench', prescribedSets: 3, prescribedReps: '8-10' },
      { key: 'closeGripBench', prescribedSets: null, prescribedReps: null },
      { key: 'chestDip', prescribedSets: 3, prescribedReps: '8-10' },
      { key: 'ohp', prescribedSets: null, prescribedReps: null },
    ],
  },
  {
    id: 'test-list-pull',
    name: 'Test Pull',
    exercises: [
      { key: 'pullUp', prescribedSets: 4, prescribedReps: '6-10' },
      { key: 'row', prescribedSets: 4, prescribedReps: '6-8' },
      { key: 'curl', prescribedSets: null, prescribedReps: null },
    ],
  },
  {
    id: 'test-list-legs',
    name: 'Test Legs',
    exercises: [
      { key: 'squat', prescribedSets: 4, prescribedReps: '6-8' },
      { key: 'deadlift', prescribedSets: 3, prescribedReps: '3-5' },
      { key: 'romanianDeadlift', prescribedSets: 3, prescribedReps: '10-12' },
      { key: 'powerClean', prescribedSets: null, prescribedReps: null },
    ],
  },
]

const LIST_BY_KEY = Object.fromEntries(
  LISTS.flatMap((list) => list.exercises.map((ex) => [ex.key, list.id])),
)

// [exercise key, set count, kg per set]. Weights never decrease per exercise
// across the journey, so every session can fire a new-best badge.
// The 15 `milestone` sessions (see MILESTONE_INDICES) cover the comparison
// ladder and the female rank tiers; the other 11 fill the six-month timeline.
const TEMPLATES = [
  { name: 'Push', effort: 'unrated', sets: [['bench', 1, 5]] },
  { name: 'Legs', effort: 'unrated', sets: [['squat', 1, 7.5]] },
  { name: 'Legs', effort: 'unrated', sets: [['squat', 1, 10]] },
  { name: 'Push', effort: 'legacy', sets: [['bench', 1, 9]] },
  { name: 'Pull', effort: 'legacy', sets: [['pullUp', 4, 0], ['row', 1, 9], ['curl', 1, 1]] },
  { name: 'Push', effort: 'legacy', sets: [['bench', 1, 12.5]] },
  { name: 'Pull', effort: 'legacy', sets: [['pullUp', 4, 0], ['row', 1, 10], ['curl', 1, 5.5]] },
  { name: 'Legs', effort: 'legacy', sets: [['squat', 1, 15], ['romanianDeadlift', 1, 9]] },
  { name: 'Legs', effort: 'easy', sets: [['squat', 2, 16], ['romanianDeadlift', 1, 9.5]] },
  { name: 'Legs', effort: 'easy', sets: [['squat', 2, 17.5], ['deadlift', 1, 15], ['romanianDeadlift', 1, 10]] },
  { name: 'Legs', effort: 'easy', sets: [['squat', 2, 18], ['deadlift', 1, 16], ['romanianDeadlift', 1, 10.5]] },
  { name: 'Push', effort: 'easy', sets: [['bench', 3, 20]] },
  { name: 'Push', effort: 'easy', sets: [['bench', 3, 21], ['inclineBench', 1, 2.5], ['closeGripBench', 1, 2.5]] },
  { name: 'Pull', effort: 'easy', sets: [['pullUp', 4, 0], ['row', 3, 17.5], ['curl', 2, 10]] },
  { name: 'Pull', effort: 'easy', sets: [['pullUp', 4, 0], ['row', 3, 18], ['curl', 2, 13]] },
  { name: 'Legs', effort: 'easy', sets: [['squat', 3, 20], ['deadlift', 2, 20], ['romanianDeadlift', 2, 12.5], ['powerClean', 1, 15]] },
  { name: 'Legs', effort: 'easy', sets: [['squat', 3, 21], ['deadlift', 2, 21], ['romanianDeadlift', 2, 13], ['powerClean', 1, 16]] },
  { name: 'Legs', effort: 'full', sets: [['squat', 4, 22.5], ['deadlift', 2, 22.5], ['romanianDeadlift', 2, 15], ['powerClean', 1, 17.5]] },
  { name: 'Push', effort: 'full', sets: [['bench', 4, 22.5], ['inclineBench', 2, 8], ['closeGripBench', 2, 8], ['chestDip', 1, 6], ['ohp', 1, 10]] },
  { name: 'Push', effort: 'full', sets: [['bench', 4, 22.5], ['inclineBench', 2, 10], ['closeGripBench', 2, 10], ['chestDip', 2, 7.5], ['ohp', 2, 13]] },
  { name: 'Pull', effort: 'full', sets: [['pullUp', 4, 0], ['row', 4, 35], ['curl', 3, 16]] },
  { name: 'Pull', effort: 'full', sets: [['pullUp', 4, 0], ['row', 4, 60], ['curl', 3, 20]] },
  { name: 'Legs', effort: 'full', sets: [['squat', 4, 35], ['deadlift', 3, 40], ['romanianDeadlift', 3, 30], ['powerClean', 2, 40]] },
  { name: 'Legs', effort: 'full', sets: [['squat', 4, 70], ['deadlift', 3, 95], ['romanianDeadlift', 3, 65], ['powerClean', 2, 100]] },
  { name: 'Pull', effort: 'full', sets: [['pullUp', 4, 0], ['row', 9, 75], ['curl', 8, 35]] },
  { name: 'Push', effort: 'full', sets: [['bench', 6, 140], ['inclineBench', 5, 80], ['closeGripBench', 4, 65], ['chestDip', 4, 50], ['ohp', 5, 35]] },
]

// 0-based indices of the sessions that must land on each comparison rung.
const MILESTONE_INDICES = [0, 2, 5, 6, 7, 9, 11, 13, 15, 17, 19, 21, 23, 24, 25]
const MILESTONE_SLUGS = [
  'toilet', 'washing-machine', 'kangaroo', 'giant-panda', 'small-motorcycle',
  'upright-piano', 'horse', 'grand-piano', 'dairy-cow', 'small-car',
  'great-white-shark', 'rhinoceros', 'african-elephant', 'school-bus', 'school-bus',
]
const RECENT_SESSIONS = 4
const WEEKLY_SESSIONS = TEMPLATES.length - RECENT_SESSIONS
const WEEKS_SPAN = 26 // six months; a couple of weeks are deliberately skipped
const FULL_EFFORT_START = TEMPLATES.length - 9

// ---------- dates, effort and volumes ----------

const now = new Date()
const weekStart = new Date(now)
weekStart.setUTCHours(0, 0, 0, 0)
weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())

const sessionStartAt = (index) => {
  if (index < WEEKLY_SESSIONS) {
    const weeksAgo = WEEKS_SPAN - Math.round(index * (WEEKS_SPAN - 1) / (WEEKLY_SESSIONS - 1))
    const date = new Date(weekStart.getTime() - weeksAgo * 7 * DAY)
    date.setUTCDate(date.getUTCDate() + 3) // Wednesday of that week
    date.setUTCHours(13, 30, 0, 0)
    return date.toISOString()
  }
  // Four sessions in the current Sunday-start week, all at or before `now`.
  const offset = index - WEEKLY_SESSIONS
  const raw = now.getTime() - (RECENT_SESSIONS - offset) * HOUR
  const time = Math.min(now.getTime(), Math.max(weekStart.getTime(), raw) + offset * 1000)
  return new Date(time).toISOString()
}

const LEGACY_RIR = [0, 0.5, 1]
const EASY_RIR = [2, 3, 4]
const FULL_RIR = [0, 0.5, 1, 2, 3, 4]

const expandSets = (template) => {
  const rows = []
  let setNumber = 0
  for (const [key, count, weight] of template.sets) {
    const exercise = EXERCISES[key]
    for (let i = 0; i < count; i += 1) {
      const n = setNumber
      setNumber += 1
      let rir = null
      let effortScale = null
      if (template.effort === 'legacy') {
        rir = LEGACY_RIR[n % LEGACY_RIR.length]
      } else if (template.effort === 'easy') {
        if (n % 5 !== 4) {
          rir = EASY_RIR[n % EASY_RIR.length]
          effortScale = 'rir'
        }
      } else if (template.effort === 'full') {
        rir = FULL_RIR[n % FULL_RIR.length]
        effortScale = n % 3 === 2 ? 'rpe' : 'rir'
      }
      rows.push({ key, exerciseId: exercise.id, reps: exercise.reps, weight, rir, effortScale })
    }
  }
  return rows
}

// Mirrors summarizeSession: per-exercise kg volumes are rounded before summing.
const volumeKg = (sets) => {
  const byExercise = new Map()
  for (const set of sets) {
    byExercise.set(set.exerciseId, (byExercise.get(set.exerciseId) ?? 0) + set.reps * set.weight)
  }
  return Math.round([...byExercise.values()].reduce((sum, volume) => sum + Math.round(volume), 0))
}

const sessions = TEMPLATES.map((template, index) => {
  const sets = expandSets(template)
  const startedAt = sessionStartAt(index)
  const completedAt = new Date(new Date(startedAt).getTime() + 70 * 60 * 1000).toISOString()
  return {
    ...template,
    index,
    id: `test-session-${pad(index + 1)}`,
    listId: LIST_BY_KEY[template.sets[0][0]],
    startedAt,
    completedAt,
    bodyweight: Math.round((75.2 - (75.2 - 69.5) * index / (TEMPLATES.length - 1)) * 10) / 10,
    sets,
    volumeKg: volumeKg(sets),
  }
})

// ---------- assertions (run before any file is written) ----------

assert(TEMPLATES.length === 26, 'expected 26 weekly sessions')
assert(sessions.every((session) => session.volumeKg > 0), 'every session needs logged volume')
assert(
  sessions.every((session, i) => i === 0 || session.volumeKg > sessions[i - 1].volumeKg),
  `session volume must grow across the journey (${sessions.map((s) => s.volumeKg).join(', ')})`,
)

const milestoneSlugs = MILESTONE_INDICES.map((i) => comparisonFor(sessions[i].volumeKg, 'kg')?.slug)
assert(
  JSON.stringify(milestoneSlugs) === JSON.stringify(MILESTONE_SLUGS),
  `milestone comparison rungs must cover the ladder in order (got ${milestoneSlugs.join(',')})`,
)
assert(comparisonFor(sessions[25].volumeKg, 'kg')?.times === 2, 'finale must be 2× a school bus')

for (const session of sessions) {
  const kg = comparisonFor(session.volumeKg, 'kg')
  const lbs = comparisonFor(Math.round(session.volumeKg * 2.2046226218), 'lbs')
  assert(kg?.slug === lbs?.slug, `kg/lbs rungs disagree for ${session.id}`)
  const weekStartMs = weekStart.getTime()
  const startedMs = new Date(session.startedAt).getTime()
  if (session.index >= WEEKLY_SESSIONS) {
    assert(startedMs >= weekStartMs, `${session.id} must be inside the current week`)
  }
  assert(startedMs <= now.getTime(), `${session.id} must not be in the future`)
}

const rawExercises = JSON.parse(await readFile(EXERCISES_PATH, 'utf8'))
const exerciseById = new Map(
  (Array.isArray(rawExercises) ? rawExercises : rawExercises.exercises)
    .map((exercise) => [String(exercise.id), exercise]),
)
const seenTiers = new Set()
const lastWeightByExercise = new Map()
let setCounter = 0
for (const session of sessions) {
  for (const set of session.sets) {
    const meta = exerciseById.get(set.exerciseId)
    assert(meta, `exercise ${set.exerciseId} must exist in the seed library`)
    seenTiers.add(rankForWeight(set.weight, meta, 'female').tier)
    const previous = lastWeightByExercise.get(set.exerciseId)
    assert(previous === undefined || set.weight >= previous, `${set.exerciseId} weight decreased in ${session.id}`)
    lastWeightByExercise.set(set.exerciseId, set.weight)
    setCounter += 1
    set.id = `test-set-${String(setCounter).padStart(4, '0')}`
  }
}
assert(
  [...RANKS, 'Unranked'].every((tier) => seenTiers.has(tier)),
  `rank coverage incomplete (got ${[...seenTiers].join(',')})`,
)

const unrated = sessions.slice(0, 3)
const legacy = sessions.slice(3, 8)
const easy = sessions.slice(8, FULL_EFFORT_START)
const full = sessions.slice(FULL_EFFORT_START)
assert(
  unrated.every((s) => s.sets.every((set) => set.rir === null && set.effortScale === null)),
  'foundation sessions must be fully unrated',
)
assert(
  legacy.every((s) => s.sets.every((set) => set.effortScale === null && LEGACY_RIR.includes(set.rir))),
  `legacy sessions must be hard RIR rows without an effort scale (${legacy.flatMap((s) => s.sets.filter((set) => set.effortScale !== null || !LEGACY_RIR.includes(set.rir)).map((set) => `${s.id}:${set.exerciseId}:${set.rir}:${set.effortScale}`)).join(',')})`,
)
assert(
  easy.every((s) => s.sets.every((set) => set.rir === null || (set.effortScale === 'rir' && EASY_RIR.includes(set.rir)))),
  'mid sessions must use an easy RIR bias',
)
assert(
  easy.some((s) => s.sets.some((set) => set.rir === null)),
  'mid sessions need a few unrated sets',
)
assert(
  full.every((s) => s.sets.every((set) => set.effortScale !== null && FULL_RIR.includes(set.rir))),
  'recent sessions must cycle the full effort spread',
)
assert(
  full.every((s) => s.sets.some((set) => set.effortScale === 'rpe')),
  'recent sessions need RPE-logged sets',
)

// ---------- SQL emission ----------

const lines = [
  '-- Generated by scripts/generate-test-data.mjs — do not edit by hand.',
  '-- Regenerate with: npm run db:test:gen',
  '-- Applied via:    npm run db:test:local  (wrangler d1 execute fitness-db',
  '--                 --config server/wrangler.jsonc --local --file=server/sql/generated/test-data.sql)',
  `-- Generated at:   ${now.toISOString()}`,
  '--',
  `-- Local dev test account (123456@gmail.com, password 123456) + ${sessions.length} weekly`,
  '-- sessions across six months, with the last four inside the current',
  '-- Sunday-start week so the 30d / 90d / 1Y / All tabs all have data:',
  '--   foundation (first 3)  — fully unrated, lightest',
  '--   legacy (next 5)       — hard RIR, effort_scale NULL',
  '--   mid (next 9)          — easy RIR bias, a few unrated sets',
  '--   recent (last 9)       — all effort bands with every 3rd set as RPE',
  '-- Level coverage:',
  '--   summary-fun — the 15 milestone sessions hit every comparison rung',
  '--                 from "a toilet" up to "2× a school bus", in order.',
  '--   ranks       — female strength tables walk Iron → Challenger plus',
  '--                 Unranked; weights never decrease, so new-best and',
  '--                 RANK UP! badges keep firing.',
  '--   bodyweight  — 26 weigh-ins trend 75.2 → 69.5 kg toward the 68 kg goal.',
  '--   account     — questionnaire answers + a push/pull/legs rotation',
  '--                 schedule and prescribed set/rep guidance on the lists.',
  '-- Idempotent: re-applying deletes the test user (cascading their old data',
  "-- via FK) and any 'test-' prefixed rows first, then re-inserts. Never",
  '-- touches seed library rows or any other user’s data.',
  '',
  '-- ---------- test user ----------',
  `DELETE FROM users WHERE id = '${USER_ID}';`,
]

const schedule = {
  mode: 'rotation',
  weekStartsOn: 0,
  rotation: [
    { type: 'workout', listId: 'test-list-push' },
    { type: 'rest' },
    { type: 'workout', listId: 'test-list-pull' },
    { type: 'rest' },
    { type: 'workout', listId: 'test-list-legs' },
    { type: 'rest' },
    { type: 'rest' },
  ],
  rotationStartedAt: sessions[0].startedAt.slice(0, 10),
}

const createdAt = new Date(new Date(sessions[0].startedAt).getTime() - 3 * DAY).toISOString()
lines.push(
  'INSERT INTO users (id, email, password_hash, created_at, gender, name, bodyweight, bodyweight_unit, unit, target_weight, effort_scale, timer_sound, timer_sound_on, timer_vibrate, timer_flash, language, questionnaire, questionnaire_updated_at, schedule) VALUES '
  + `(${sql(USER_ID)}, '123456@gmail.com', ${sql(PASSWORD_HASH)}, ${sql(createdAt)}, 'female', 'Charlotte', 69.5, 'kg', 'kg', 68, 'rir', 'beep', 1, 1, 0, 'en', ${sql(QUESTIONNAIRE)}, ${sql(createdAt)}, ${sql(JSON.stringify(schedule))});`,
  '',
  'DELETE FROM workout_session_sets WHERE session_id LIKE \'test-session-%\';',
  'DELETE FROM workout_sessions WHERE id LIKE \'test-session-%\';',
  'DELETE FROM workout_list_exercises WHERE list_id LIKE \'test-list-%\';',
  'DELETE FROM workout_lists WHERE id LIKE \'test-list-%\';',
  'DELETE FROM bodyweight_log WHERE id LIKE \'test-weighin-%\';',
  '',
  '-- ---------- workout lists ----------',
)

for (const list of LISTS) {
  lines.push(
    `INSERT INTO workout_lists (id, name, user_id, created_at, deleted_at) VALUES (${sql(list.id)}, ${sql(list.name)}, ${sql(USER_ID)}, ${sql(createdAt)}, NULL);`,
  )
  list.exercises.forEach((exercise, position) => {
    lines.push(
      'INSERT INTO workout_list_exercises (list_id, exercise_id, added_at, rest_secs, rest_enabled, rir_enabled, prescribed_sets, prescribed_reps, position) VALUES '
      + `(${sql(list.id)}, ${sql(EXERCISES[exercise.key].id)}, ${sql(createdAt)}, 60, 1, 1, ${exercise.prescribedSets ?? 'NULL'}, ${sql(exercise.prescribedReps)}, ${position + 1});`,
    )
  })
}

lines.push('', '-- ---------- sessions ----------')
for (const session of sessions) {
  const list = LISTS.find((entry) => entry.id === session.listId)
  const comparison = comparisonFor(session.volumeKg, 'kg')
  const rankSummary = [...new Set(session.sets.map((set) => {
    const tier = rankForWeight(set.weight, exerciseById.get(set.exerciseId), 'female').tier
    return `${set.exerciseId}→${tier}`
  }))].join(' ')
  lines.push(
    `-- ${session.id} · ${list.name} · ${session.effort} · vol ${session.volumeKg} kg → ${comparison.slug} ×${comparison.times} · ranks(f): ${rankSummary}`,
    `INSERT INTO workout_sessions (id, list_id, list_name, started_at, completed_at, bodyweight, bodyweight_unit) VALUES (${sql(session.id)}, ${sql(session.listId)}, ${sql(list.name)}, ${sql(session.startedAt)}, ${sql(session.completedAt)}, ${session.bodyweight}, 'kg');`,
  )
  session.sets.forEach((set, setIndex) => {
    lines.push(
      'INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit, rir, effort_scale) VALUES '
      + `(${sql(set.id)}, ${sql(session.id)}, ${sql(set.exerciseId)}, ${setIndex + 1}, ${set.reps}, ${set.weight}, 'kg', ${set.rir ?? 'NULL'}, ${sql(set.effortScale)});`,
    )
  })
}

lines.push('', '-- ---------- weigh-ins ----------')
sessions.forEach((session, index) => {
  const loggedAt = new Date(new Date(session.startedAt).getTime() + 30 * 60 * 1000).toISOString()
  lines.push(
    `INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES (${sql(`test-weighin-${pad(index + 1)}`)}, ${sql(USER_ID)}, ${session.bodyweight}, 'kg', ${sql(loggedAt)});`,
  )
})

await writeFile(OUT, `${lines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${OUT} (${sessions.length} sessions, ${setCounter} sets, ${sessions.length} weigh-ins).`)
