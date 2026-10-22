import { env } from 'cloudflare:workers'

import { isPositiveNumber } from './validate.js'
import { hasReps, hasWeight } from '../shared/setRules.js'
import { normalizeDisplayName, normalizeEffortScale, normalizeGender } from '../shared/normalize.js'

function parseJson(text, fallback) {
  if (typeof text !== 'string' || text.length === 0) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function toExercise(row) {
  return {
    id: row.id,
    name: row.name,
    nameZh: row.name_zh ?? null,
    namePinyin: row.name_pinyin ?? null,
    nameInitials: row.name_initials ?? null,
    category: row.category,
    target: row.target,
    equipment: row.equipment,
    muscle_group: row.muscle_group,
    secondary_muscles: parseJson(row.secondary_muscles, []),
    image: row.image,
    gif_url: row.gif_url,
    instructions: parseJson(row.instructions, {}),
    instruction_steps: parseJson(row.instruction_steps, {}),
    difficulty: row.difficulty ?? 1,
  }
}

function toListExercise(row) {
  const rawSecs = Number(row.rest_secs)
  const restSecs = Number.isFinite(rawSecs) ? Math.min(1800, Math.max(5, Math.round(rawSecs))) : 60
  return {
    id: row.id,
    name: row.name,
    nameZh: row.name_zh ?? null,
    namePinyin: row.name_pinyin ?? null,
    nameInitials: row.name_initials ?? null,
    category: row.category,
    target: row.target,
    equipment: row.equipment,
    image: row.image,
    gif_url: row.gif_url,
    restSecs,
    restEnabled: row.rest_enabled === null || row.rest_enabled === undefined ? true : Number(row.rest_enabled) !== 0,
    rirEnabled: row.rir_enabled === null || row.rir_enabled === undefined ? false : Number(row.rir_enabled) !== 0,
  }
}

// RIR (reps in reserve) rating: null/undefined/'' = unrated, 0 = set taken to
// failure. Throws on out-of-range values so bad input fails loudly.
function normalizeRir(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 10) throw new Error('rir must be between 0 and 10')
  return n
}

function normalizeLanguage(value) {
  return String(value ?? '').trim().toLowerCase() === 'zh' ? 'zh' : 'en'
}

const TIMER_SOUNDS = ['off', 'beep', 'chime', 'bell']

function normalizeTimerSound(value) {
  const v = String(value ?? '').trim().toLowerCase()
  return TIMER_SOUNDS.includes(v) ? v : 'beep'
}

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    createdAt: row.created_at,
    gender: row.gender ? normalizeGender(row.gender) : null,
    bodyweight: row.bodyweight ?? null,
    bodyweightUnit: row.bodyweight_unit || 'kg',
    targetWeight: row.target_weight ?? null,
    effortScale: normalizeEffortScale(row.effort_scale),
    language: normalizeLanguage(row.language),
    timerSound: normalizeTimerSound(row.timer_sound === 'off' ? 'beep' : (row.timer_sound ?? 'beep')),
    // Legacy rows predate timer_sound_on: a stored 'off' sound means play-off.
    timerPlaySound: row.timer_sound_on === null || row.timer_sound_on === undefined
      ? (String(row.timer_sound ?? '').toLowerCase() === 'off' ? 0 : 1)
      : (Number(row.timer_sound_on) !== 0 ? 1 : 0),
    timerVibrate: row.timer_vibrate === null || row.timer_vibrate === undefined ? 1 : (Number(row.timer_vibrate) !== 0 ? 1 : 0),
    timerFlash: row.timer_flash === null || row.timer_flash === undefined ? 0 : (Number(row.timer_flash) !== 0 ? 1 : 0),
  }
}

// Sets are stored with canonical RIR + the scale they were logged with, so old
// RIR sets keep displaying as RIR after the user flips to RPE. Expose both
// snake_case (raw D1 row shape) and camelCase for frontend convenience.
function toSet(row) {
  if (!row) return row
  const scale = normalizeEffortScale(row.effort_scale ?? row.effortScale)
  return { ...row, effort_scale: scale, effortScale: scale }
}

function toWeighIn(row) {
  return {
    id: row.id,
    weight: row.weight,
    unit: row.unit || 'kg',
    loggedAt: row.logged_at,
  }
}

function toSessionBodyweight(row) {
  return {
    bodyweight: row.bodyweight ?? null,
    bodyweightUnit: row.bodyweight_unit || 'kg',
  }
}

const SELECT_LIST_EXERCISES = `SELECT e.id, e.name, e.name_zh AS name_zh, e.name_pinyin AS name_pinyin, e.name_initials AS name_initials,
    e.category, e.target, e.equipment, e.image, e.gif_url,
    wle.rest_secs AS rest_secs, wle.rest_enabled AS rest_enabled, wle.rir_enabled AS rir_enabled
  FROM workout_list_exercises wle
  JOIN exercises e ON e.id = wle.exercise_id
  WHERE wle.list_id = ?
  ORDER BY wle.added_at ASC`

const SELECT_LIST_BY_ID = 'SELECT * FROM workout_lists WHERE id = ? AND user_id = ? AND deleted_at IS NULL'

const SELECT_LIST_BY_NAME_NOCASE =
  'SELECT * FROM workout_lists WHERE user_id = ? AND name = ? COLLATE NOCASE AND deleted_at IS NULL'

const OWNED_SESSION_SQL =
  'SELECT s.* FROM workout_sessions s JOIN workout_lists l ON l.id = s.list_id WHERE s.id = ? AND l.user_id = ?'

async function getOwnedSessionRow(userId, sessionId) {
  return env.DB.prepare(OWNED_SESSION_SQL).bind(sessionId, userId).first()
}

async function getSessionSets(sessionId) {
  const { results: sets } = await env.DB
    .prepare('SELECT * FROM workout_session_sets WHERE session_id = ? ORDER BY exercise_id, set_number')
    .bind(sessionId)
    .all()
  return (sets || []).map(toSet)
}

function toSessionDetail(session, sets) {
  return {
    id: session.id,
    listId: session.list_id,
    listName: session.list_name ?? null,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    ...toSessionBodyweight(session),
    sets,
  }
}

// Latest log entry is the canonical profile bodyweight (ratios/fatigue read
// it). Re-resolve it after any log/delete (null when the log is empty).
async function syncCanonicalBodyweight(userId) {
  const latest = await env.DB
    .prepare('SELECT * FROM bodyweight_log WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1')
    .bind(userId)
    .first()
  if (latest) {
    await env.DB.prepare('UPDATE users SET bodyweight = ?, bodyweight_unit = ? WHERE id = ?').bind(latest.weight, latest.unit, userId).run().catch(() => {})
  } else {
    await env.DB.prepare('UPDATE users SET bodyweight = ? WHERE id = ?').bind(null, userId).run().catch(() => {})
  }
}

function conflictError(existing) {
  const err = new Error(
    existing ? `A workout named "${existing.name}" already exists` : 'Workout name already exists',
  )
  err.code = 'WORKOUT_NAME_CONFLICT'
  err.existing = existing
    ? { id: existing.id, name: existing.name }
    : undefined
  return err
}

const db = {
  async getExercises(userId) {
    const { results } = userId
      ? await env.DB
        .prepare('SELECT * FROM exercises WHERE user_id IS NULL OR user_id = ? ORDER BY name ASC')
        .bind(userId)
        .all()
      : await env.DB.prepare('SELECT * FROM exercises WHERE user_id IS NULL ORDER BY name ASC').all()
    return results.map(toExercise)
  },

  async getExercise(id, userId) {
    const row = await env.DB.prepare('SELECT * FROM exercises WHERE id = ?').bind(id).first()
    if (!row) return null
    // Custom exercises are private to their owner; library rows (user_id NULL) are public.
    if (row.user_id && row.user_id !== userId) return null
    return toExercise(row)
  },

  async createExercise(userId, { name, category, target, equipment }) {
    const trimmed = {
      name: typeof name === 'string' ? name.trim() : '',
      category: typeof category === 'string' ? category.trim() : '',
      target: typeof target === 'string' ? target.trim() : '',
      equipment: typeof equipment === 'string' && equipment.trim() ? equipment.trim() : 'body weight',
    }
    if (!trimmed.name || !trimmed.category || !trimmed.target) {
      throw new Error('name, category, and target are required')
    }
    const id = `custom-${crypto.randomUUID()}`
    await env.DB
      .prepare(
        `INSERT INTO exercises
          (id, name, category, target, equipment, user_id, secondary_muscles, instructions, instruction_steps, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, '[]', '{}', '{}', 2)`,
      )
      .bind(id, trimmed.name, trimmed.category, trimmed.target, trimmed.equipment, userId)
      .run()
    return this.getExercise(id, userId)
  },

  async updateExercise(userId, id, { name, instructions, instructionsLang }) {
    const row = await env.DB
      .prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first()
    if (!row) return null
    const updates = []
    const values = []
    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (!trimmed) throw new Error('name is required')
      updates.push('name = ?')
      values.push(trimmed)
    }
    if (instructions !== undefined) {
      const text = typeof instructions === 'string' ? instructions.trim() : ''
      // Merge into the existing language map so editing one language never
      // wipes the others (library rows carry 10 languages; custom rows en).
      const prev = parseJson(row.instructions, {})
      const merged = prev && typeof prev === 'object' ? prev : {}
      const lang = instructionsLang === 'zh' ? 'zh' : 'en'
      if (text) merged[lang] = text
      else delete merged[lang]
      updates.push('instructions = ?')
      values.push(JSON.stringify(merged))
    }
    if (updates.length === 0) return toExercise(row)
    values.push(id, userId)
    await env.DB
      .prepare(`UPDATE exercises SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run()
    return this.getExercise(id, userId)
  },

  async deleteExercise(userId, id) {
    const row = await env.DB
      .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first()
    if (!row) return false
    // Join rows in lists and logged sets cascade via foreign keys.
    const result = await env.DB
      .prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run()
    return result.meta.changes > 0
  },

  // --- Users ---

  async createUser(email, passwordHash, gender = null, name = null, language = null) {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const cleanGender = normalizeGender(gender)
    const cleanName = normalizeDisplayName(name)
    const cleanLanguage = normalizeLanguage(language)
    const insert = () => env.DB
      .prepare('INSERT INTO users (id, email, password_hash, created_at, gender, name, language) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, email, passwordHash, createdAt, cleanGender, cleanName, cleanLanguage)
      .run()
    await insert()
    return this.getUserById(id)
  },

  async getUserById(id) {
    const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    return row ? toUser(row) : null
  },

  async getUserByEmail(email) {
    const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    return row ? { ...toUser(row), passwordHash: row.password_hash } : null
  },

  // --- Workout lists ---

  async getWorkoutList(userId, id) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(id, userId).first()
    if (!list) return null
    const { results: rows } = await env.DB.prepare(SELECT_LIST_EXERCISES).bind(id).all()
    return {
      id: list.id,
      name: list.name,
      userId: list.user_id,
      createdAt: list.created_at,
      exercises: rows.map(toListExercise),
    }
  },

  async listWorkoutLists(userId) {
    const { results: lists } = await env.DB
      .prepare('SELECT * FROM workout_lists WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC')
      .bind(userId)
      .all()
    const listsWithExercises = await Promise.all(lists.map((l) => this.getWorkoutList(userId, l.id)))
    return listsWithExercises.filter(Boolean)
  },

  async findWorkoutListByNameInsensitive(userId, name) {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) return null
    const row = await env.DB.prepare(SELECT_LIST_BY_NAME_NOCASE).bind(userId, trimmed).first()
    return row || null
  },

  async createWorkoutList(userId, name, exerciseId) {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    const existing = await this.findWorkoutListByNameInsensitive(userId, trimmed)
    if (existing) throw conflictError(existing)
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const statements = [
      env.DB
        .prepare('INSERT INTO workout_lists (id, name, user_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(id, trimmed, userId, createdAt),
    ]
    if (exerciseId) {
      statements.push(
        env.DB
          .prepare(
            'INSERT OR IGNORE INTO workout_list_exercises (list_id, exercise_id, added_at) VALUES (?, ?, ?)',
          )
          .bind(id, exerciseId, createdAt),
      )
    }
    try {
      await env.DB.batch(statements)
    } catch (err) {
      const raced = await this.findWorkoutListByNameInsensitive(userId, trimmed)
      if (raced) throw conflictError(raced)
      throw err
    }
    return this.getWorkoutList(userId, id)
  },

  async renameWorkoutList(userId, id, newName) {
    const trimmed = typeof newName === 'string' ? newName.trim() : ''
    if (!trimmed) throw new Error('name is required')
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(id, userId).first()
    if (!list) return null
    if (list.name === trimmed) return this.getWorkoutList(userId, id)
    const existing = await env.DB
      .prepare(`${SELECT_LIST_BY_NAME_NOCASE} AND id != ?`)
      .bind(userId, trimmed, id)
      .first()
    if (existing) throw conflictError(existing)
    try {
      await env.DB.prepare('UPDATE workout_lists SET name = ? WHERE id = ?').bind(trimmed, id).run()
    } catch (err) {
      const raced = await env.DB
        .prepare(`${SELECT_LIST_BY_NAME_NOCASE} AND id != ?`)
        .bind(userId, trimmed, id)
        .first()
      if (raced) throw conflictError(raced)
      throw err
    }
    return this.getWorkoutList(userId, id)
  },

  async deleteWorkoutList(userId, id) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(id, userId).first()
    if (!list) return false
    // Soft-delete: sessions stay in the DB so the journal keeps its ticks.
    const result = await env.DB
      .prepare('UPDATE workout_lists SET deleted_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), id)
      .run()
    return result.meta.changes > 0
  },

  async addExerciseToList(userId, listId, exerciseId) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    const exercise = await env.DB
      .prepare('SELECT id FROM exercises WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
      .bind(exerciseId, userId)
      .first()
    if (!exercise) return null
    await env.DB
      .prepare(
        'INSERT OR IGNORE INTO workout_list_exercises (list_id, exercise_id, added_at) VALUES (?, ?, ?)',
      )
      .bind(listId, exerciseId, new Date().toISOString())
      .run()
    return this.getWorkoutList(userId, listId)
  },

  async removeExerciseFromList(userId, listId, exerciseId) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    await env.DB
      .prepare('DELETE FROM workout_list_exercises WHERE list_id = ? AND exercise_id = ?')
      .bind(listId, exerciseId)
      .run()
    return this.getWorkoutList(userId, listId)
  },

  // RIR effort logging never applies to stretching moves or cardio — mirrors
  // src/lib/effort.js isRirEligible (canonical English fields, both languages).
  rirEligibleExercise(ex) {
    if (!ex) return true
    if (String(ex.category ?? '').trim().toLowerCase() === 'cardio') return false
    if (/\bstretch/i.test(String(ex.name ?? ''))) return false
    return true
  },

  async updateExerciseSettings(userId, listId, exerciseId, { restSecs, restEnabled, rirEnabled }) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    const link = await env.DB
      .prepare('SELECT list_id FROM workout_list_exercises WHERE list_id = ? AND exercise_id = ?')
      .bind(listId, exerciseId)
      .first()
    if (!link) return null
    const updates = []
    const values = []
    if (restSecs !== undefined) {
      const n = Number(restSecs)
      if (!Number.isFinite(n) || n < 5 || n > 1800) throw new Error('restSecs must be between 5 and 1800')
      updates.push('rest_secs = ?')
      values.push(Math.round(n))
    }
    if (restEnabled !== undefined) {
      updates.push('rest_enabled = ?')
      values.push(restEnabled ? 1 : 0)
    }
    if (rirEnabled !== undefined) {
      if (rirEnabled) {
        const ex = await env.DB
          .prepare('SELECT category, name FROM exercises WHERE id = ?')
          .bind(exerciseId)
          .first()
          .catch(() => null)
        if (ex && !this.rirEligibleExercise(ex)) {
          throw new Error('RIR logging does not apply to stretching or cardio exercises')
        }
      }
      updates.push('rir_enabled = ?')
      values.push(rirEnabled ? 1 : 0)
    }
    if (updates.length === 0) return this.getWorkoutList(userId, listId)
    values.push(listId, exerciseId)
    const update = () => env.DB
      .prepare(`UPDATE workout_list_exercises SET ${updates.join(', ')} WHERE list_id = ? AND exercise_id = ?`)
      .bind(...values)
      .run()
    await update()
    return this.getWorkoutList(userId, listId)
  },

  // --- Workout Sessions ---

  async createSession(userId, listId) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    const id = crypto.randomUUID()
    const startedAt = new Date().toISOString()
    const owner = await env.DB.prepare('SELECT bodyweight, bodyweight_unit FROM users WHERE id = ?').bind(userId).first().catch(() => null)
    const bw = owner?.bodyweight ?? null
    const bwUnit = owner?.bodyweight_unit || 'kg'
    const insertFull = () => env.DB
      .prepare('INSERT INTO workout_sessions (id, list_id, list_name, started_at, bodyweight, bodyweight_unit) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, listId, list.name, startedAt, bw, bwUnit)
      .run()
    await insertFull()
    return this.getOwnedSession(userId, id)
  },

  async updateSessionBodyweight(userId, sessionId, bodyweight, bodyweightUnit = 'kg') {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    const bw = bodyweight === null ? null : Number(bodyweight)
    if (bw !== null && !(bw > 0)) throw new Error('bodyweight must be positive')
    const unit = bodyweightUnit === 'lbs' ? 'lbs' : 'kg'
    const update = () => env.DB.prepare('UPDATE workout_sessions SET bodyweight = ?, bodyweight_unit = ? WHERE id = ?').bind(bw, unit, sessionId).run()
    await update()
    return this.getOwnedSession(userId, sessionId)
  },

  // --- Weigh-in history (journal bodyweight card) ---

  async ensureWeighInTable() {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS bodyweight_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        weight REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        logged_at TEXT NOT NULL
      )`,
    ).run().catch(() => {})
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_bw_user_date ON bodyweight_log (user_id, logged_at)').run().catch(() => {})
  },

  async listWeighIns(userId) {
    await this.ensureWeighInTable()
    const { results } = await env.DB
      .prepare('SELECT * FROM bodyweight_log WHERE user_id = ? ORDER BY logged_at ASC')
      .bind(userId)
      .all()
    return (results || []).map(toWeighIn)
  },

  async logWeighIn(userId, weight, unit = 'kg', loggedAt = null) {
    const w = Number(weight)
    if (!isPositiveNumber(w)) throw new Error('weight must be a positive number')
    const u = unit === 'lbs' ? 'lbs' : 'kg'
    const at = loggedAt || new Date().toISOString()
    if (Number.isNaN(new Date(at).getTime())) throw new Error('logged_at must be a valid date')
    await this.ensureWeighInTable()
    const id = crypto.randomUUID()
    await env.DB
      .prepare('INSERT INTO bodyweight_log (id, user_id, weight, unit, logged_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, userId, w, u, at)
      .run()
    await syncCanonicalBodyweight(userId)
    const row = await env.DB.prepare('SELECT * FROM bodyweight_log WHERE id = ?').bind(id).first()
    return { entry: toWeighIn(row), user: await this.getUserById(userId) }
  },

  async deleteWeighIn(userId, id) {
    await this.ensureWeighInTable()
    const row = await env.DB.prepare('SELECT * FROM bodyweight_log WHERE id = ? AND user_id = ?').bind(id, userId).first()
    if (!row) return null
    await env.DB.prepare('DELETE FROM bodyweight_log WHERE id = ? AND user_id = ?').bind(id, userId).run()
    await syncCanonicalBodyweight(userId)
    return { user: await this.getUserById(userId) }
  },

  async setTargetWeight(userId, targetWeight) {
    const tw = targetWeight === null ? null : Number(targetWeight)
    if (tw !== null && !isPositiveNumber(tw)) throw new Error('target weight must be a positive number')
    const update = () => env.DB.prepare('UPDATE users SET target_weight = ? WHERE id = ?').bind(tw, userId).run()
    await update()
    return this.getUserById(userId)
  },

  async getSession(sessionId) {
    const session = await env.DB.prepare('SELECT * FROM workout_sessions WHERE id = ?').bind(sessionId).first()
    if (!session) return null
    return toSessionDetail(session, await getSessionSets(sessionId))
  },

  async getOwnedSession(userId, sessionId) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    return toSessionDetail(session, await getSessionSets(sessionId))
  },

  // All sessions across live AND soft-deleted lists — feeds the journal.
  async listAllSessionsForUser(userId) {
    const { results } = await env.DB
      .prepare(
        `SELECT s.* FROM workout_sessions s
         JOIN workout_lists l ON l.id = s.list_id
         WHERE l.user_id = ?
         ORDER BY s.started_at DESC`,
      )
      .bind(userId)
      .all()
    const sessions = await Promise.all(results.map((s) => this.getSession(s.id)))
    return sessions.filter(Boolean)
  },

  async listSessionsForList(userId, listId) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    const { results } = await env.DB
      .prepare('SELECT * FROM workout_sessions WHERE list_id = ? ORDER BY started_at DESC')
      .bind(listId)
      .all()
    const sessions = await Promise.all(results.map((s) => this.getSession(s.id)))
    return sessions.filter(Boolean)
  },

  async logSet(userId, sessionId, exerciseId, setNumber, reps, weight, weightUnit, rir, effortScale) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    if (session.completed_at) return null
    const id = crypto.randomUUID()
    const rirValue = normalizeRir(rir)
    const scaleValue = normalizeEffortScale(effortScale)
    const insertFull = () => env.DB
      .prepare(
        'INSERT INTO workout_session_sets (id, session_id, exercise_id, set_number, reps, weight, weight_unit, rir, effort_scale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, sessionId, exerciseId, setNumber, reps ?? null, weight ?? null, weightUnit || 'kg', rirValue, scaleValue)
      .run()
    await insertFull()
    return this.getSession(sessionId)
  },

  async deleteSet(userId, sessionId, setId) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    if (session.completed_at) return null
    await env.DB
      .prepare('DELETE FROM workout_session_sets WHERE id = ? AND session_id = ?')
      .bind(setId, sessionId)
      .run()
    return this.getSession(sessionId)
  },

  async completeSession(userId, sessionId) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    if (session.completed_at) return this.getSession(sessionId)
    const full = await this.getSession(sessionId)
    const sets = full?.sets || []
    const invalid = sets.filter((s) => !hasReps(s) && hasWeight(s))
    if (invalid.length > 0) {
      const err = new Error(
        `${invalid.length} set${invalid.length === 1 ? '' : 's'} need${invalid.length === 1 ? 's' : ''} reps before finishing`,
      )
      err.code = 'INCOMPLETE_SETS'
      err.incompleteIds = invalid.map((s) => s.id)
      err.incompleteCount = invalid.length
      throw err
    }
    const emptyIds = sets.filter((s) => !hasReps(s) && !hasWeight(s)).map((s) => s.id)
    const validCount = sets.filter((s) => hasReps(s)).length
    if (validCount === 0) {
      const err = new Error('Log at least one set with reps before finishing')
      err.code = 'EMPTY_SESSION'
      err.incompleteCount = 0
      throw err
    }
    let removedEmptySets = 0
    for (const id of emptyIds) {
      await env.DB
        .prepare('DELETE FROM workout_session_sets WHERE id = ? AND session_id = ?')
        .bind(id, sessionId)
        .run()
      removedEmptySets += 1
    }
    await env.DB
      .prepare('UPDATE workout_sessions SET completed_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), sessionId)
      .run()
    const finished = await this.getSession(sessionId)
    if (finished) finished.removedEmptySets = removedEmptySets
    return finished
  },

  async updateSet(userId, sessionId, setId, reps, weight, weightUnit, rir, effortScale) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return null
    if (session.completed_at) return null
    // rir is only overwritten when the caller sends it; reps/weight edits from
    // older clients (or fields the UI didn't touch) must preserve the rating.
    const updates = ['reps = ?', 'weight = ?', 'weight_unit = ?']
    const values = [reps ?? null, weight ?? null, weightUnit || 'kg']
    if (rir !== undefined) {
      values.push(normalizeRir(rir))
      updates.push('rir = ?')
    }
    if (effortScale !== undefined) {
      values.push(normalizeEffortScale(effortScale))
      updates.push('effort_scale = ?')
    }
    values.push(setId, sessionId)
    const runUpdate = () => env.DB
      .prepare(
        `UPDATE workout_session_sets SET ${updates.join(', ')} WHERE id = ? AND session_id = ?`,
      )
      .bind(...values)
      .run()
    await runUpdate()
    return this.getSession(sessionId)
  },

  async deleteSession(userId, sessionId) {
    const session = await getOwnedSessionRow(userId, sessionId)
    if (!session) return false
    // Sets cascade via foreign key, but delete explicitly for DBs without FK enforcement.
    await env.DB.prepare('DELETE FROM workout_session_sets WHERE session_id = ?').bind(sessionId).run()
    const result = await env.DB.prepare('DELETE FROM workout_sessions WHERE id = ?').bind(sessionId).run()
    return result.meta.changes > 0
  },

  async deleteSessionsForList(userId, listId) {
    const list = await env.DB.prepare(SELECT_LIST_BY_ID).bind(listId, userId).first()
    if (!list) return null
    const { results } = await env.DB
      .prepare('SELECT id FROM workout_sessions WHERE list_id = ?')
      .bind(listId)
      .all()
    const ids = (results || []).map((r) => r.id)
    if (ids.length > 0) {
      await env.DB.prepare('DELETE FROM workout_session_sets WHERE session_id IN (SELECT id FROM workout_sessions WHERE list_id = ?)').bind(listId).run()
      await env.DB.prepare('DELETE FROM workout_sessions WHERE list_id = ?').bind(listId).run()
    }
    return { deleted: ids.length }
  },

  async updateUserGender(userId, gender) {
    return this.updateUserProfile(userId, { gender })
  },

  async updateUserProfile(userId, { email, gender, name, bodyweight, bodyweightUnit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language }) {
    if (bodyweight !== undefined || bodyweightUnit !== undefined) {
      let bw = bodyweight === null ? null : bodyweight !== undefined ? Number(bodyweight) : undefined
      if (bw !== undefined && bw !== null && !isPositiveNumber(bw)) throw new Error('bodyweight must be positive')
      const unit = bodyweightUnit === 'lbs' ? 'lbs' : bodyweightUnit === 'kg' ? 'kg' : undefined
      const updateBodyweight = async () => {
        if (bw !== undefined && unit !== undefined) {
          await env.DB.prepare('UPDATE users SET bodyweight = ?, bodyweight_unit = ? WHERE id = ?').bind(bw, unit, userId).run()
        } else if (bw !== undefined) {
          await env.DB.prepare('UPDATE users SET bodyweight = ? WHERE id = ?').bind(bw, userId).run()
        } else if (unit !== undefined) {
          await env.DB.prepare('UPDATE users SET bodyweight_unit = ? WHERE id = ?').bind(unit, userId).run()
        }
      }
      await updateBodyweight()
    }
    if (name !== undefined) {
      const cleanName = name === null ? null : normalizeDisplayName(name)
      if (name !== null && cleanName === null) return null
      const update = () => env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(cleanName, userId).run()
      await update()
    }
    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
      if (!cleanEmail) return null
      const current = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
      if (!current) return null
      if (cleanEmail !== String(current.email || '').toLowerCase()) {
        const taken = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first()
        if (taken && taken.id !== userId) {
          const err = new Error('Email already in use')
          err.code = 'EMAIL_TAKEN'
          throw err
        }
        try {
          await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(cleanEmail, userId).run()
        } catch (err) {
          if (String(err?.message || '').toLowerCase().includes('unique')) {
            const conflict = new Error('Email already in use')
            conflict.code = 'EMAIL_TAKEN'
            throw conflict
          }
          throw err
        }
      }
    }
    if (gender !== undefined) {
      const clean = gender === null ? null : normalizeGender(gender)
      if (gender !== null && clean === null && String(gender).trim() !== '') return null
      await env.DB.prepare('UPDATE users SET gender = ? WHERE id = ?').bind(clean, userId).run()
    }
    if (effortScale !== undefined) {
      const clean = normalizeEffortScale(effortScale)
      const update = () => env.DB.prepare('UPDATE users SET effort_scale = ? WHERE id = ?').bind(clean, userId).run()
      await update()
    }
    if (language !== undefined) {
      const clean = normalizeLanguage(language)
      const update = () => env.DB.prepare('UPDATE users SET language = ? WHERE id = ?').bind(clean, userId).run()
      await update()
    }
    if (timerSound !== undefined || timerPlaySound !== undefined || timerVibrate !== undefined || timerFlash !== undefined) {
      const sets = []
      const vals = []
      if (timerSound !== undefined) {
        sets.push('timer_sound = ?')
        vals.push(normalizeTimerSound(timerSound))
      }
      if (timerPlaySound !== undefined) {
        sets.push('timer_sound_on = ?')
        vals.push(timerPlaySound ? 1 : 0)
      }
      if (timerVibrate !== undefined) {
        sets.push('timer_vibrate = ?')
        vals.push(timerVibrate ? 1 : 0)
      }
      if (timerFlash !== undefined) {
        sets.push('timer_flash = ?')
        vals.push(timerFlash ? 1 : 0)
      }
      vals.push(userId)
      const update = () => env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
      await update()
    }
    return this.getUserById(userId)
  },

  async deleteUser(userId) {
    // Explicit deletes so account removal works even if FK enforcement is off.
    // Order: sets -> sessions -> list links -> lists -> custom exercises -> user.
    await env.DB
      .prepare(
        'DELETE FROM workout_session_sets WHERE session_id IN (SELECT s.id FROM workout_sessions s JOIN workout_lists l ON l.id = s.list_id WHERE l.user_id = ?)',
      )
      .bind(userId)
      .run()
    await env.DB
      .prepare('DELETE FROM workout_sessions WHERE list_id IN (SELECT id FROM workout_lists WHERE user_id = ?)')
      .bind(userId)
      .run()
    await env.DB
      .prepare('DELETE FROM workout_list_exercises WHERE list_id IN (SELECT id FROM workout_lists WHERE user_id = ?)')
      .bind(userId)
      .run()
    await env.DB.prepare('DELETE FROM workout_lists WHERE user_id = ?').bind(userId).run()
    await env.DB.prepare('DELETE FROM exercises WHERE user_id = ?').bind(userId).run()
    await env.DB.prepare('DELETE FROM bodyweight_log WHERE user_id = ?').bind(userId).run().catch(() => {})
    const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    return result.meta.changes > 0
  },
}

export default db
