import express from 'express'
import db from './db.js'
import { hashPassword, verifyPassword, createToken } from './auth.js'
import { requireAuth, optionalAuth } from './authMiddleware.js'
import { GENDERS, isPositiveNumber, isValidEmail } from './validate.js'

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

export function createApp() {
  const app = express()

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Max-Age', '86400')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  // --- Auth ---

  app.post('/api/auth/signup', async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      const password = typeof req.body?.password === 'string' ? req.body.password : ''
      const genderRaw = req.body?.gender ?? null
      const gender = genderRaw === null ? null : String(genderRaw).trim().toLowerCase()
      const displayName = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 30) : ''
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' })
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
      if (displayName.length < 2) return res.status(400).json({ error: 'Please enter your name (2-30 characters)' })
      if (gender !== null && !GENDERS.includes(gender)) {
        return res.status(400).json({ error: 'Gender must be male, female, or other' })
      }
      const languageRaw = req.body?.language
      const language = languageRaw == null ? null : String(languageRaw).trim().toLowerCase()
      if (language !== null && language !== 'en' && language !== 'zh') {
        return res.status(400).json({ error: 'language must be en or zh' })
      }
      const existing = await db.getUserByEmail(email)
      if (existing) return res.status(409).json({ error: 'Email already registered' })
      const passwordHash = await hashPassword(password)
      const user = await db.createUser(email, passwordHash, gender, displayName, language)
      const token = await createToken(user.id)
      res.status(201).json({ token, user })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      const password = typeof req.body?.password === 'string' ? req.body.password : ''
      if (!isValidEmail(email) || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }
      const user = await db.getUserByEmail(email)
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
      const token = await createToken(user.id)
      const safeUser = { id: user.id, email: user.email, name: user.name ?? null, createdAt: user.createdAt, gender: user.gender ?? null, bodyweight: user.bodyweight ?? null, bodyweightUnit: user.bodyweightUnit || 'kg', targetWeight: user.targetWeight ?? null, effortScale: user.effortScale || 'rir', timerSound: user.timerSound || 'beep', timerPlaySound: user.timerPlaySound ?? 1, timerVibrate: user.timerVibrate ?? 1, timerFlash: user.timerFlash ?? 0, language: user.language || 'en' }
      res.json({ token, user: safeUser })
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/auth/me', requireAuth, async (req, res, next) => {
    try {
      const user = await db.getUserById(req.userId)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ user })
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/auth/profile', requireAuth, async (req, res, next) => {
    try {
      const body = req.body || {}
      const hasGender = Object.prototype.hasOwnProperty.call(body, 'gender')
      const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email')
      const hasName = Object.prototype.hasOwnProperty.call(body, 'name')
      const hasBw = Object.prototype.hasOwnProperty.call(body, 'bodyweight')
      const hasBwUnit = Object.prototype.hasOwnProperty.call(body, 'bodyweightUnit')
      const hasEffort = Object.prototype.hasOwnProperty.call(body, 'effortScale')
      const hasTimerSound = Object.prototype.hasOwnProperty.call(body, 'timerSound')
      const hasTimerPlaySound = Object.prototype.hasOwnProperty.call(body, 'timerPlaySound')
      const hasTimerVibrate = Object.prototype.hasOwnProperty.call(body, 'timerVibrate')
      const hasTimerFlash = Object.prototype.hasOwnProperty.call(body, 'timerFlash')
      const hasLanguage = Object.prototype.hasOwnProperty.call(body, 'language')
      if (!hasGender && !hasEmail && !hasName && !hasBw && !hasBwUnit && !hasEffort && !hasTimerSound && !hasTimerPlaySound && !hasTimerVibrate && !hasTimerFlash && !hasLanguage) return res.status(400).json({ error: 'Nothing to update' })
      const updates = {}
      if (hasName) {
        const cleanName = typeof body.name === 'string' ? body.name.trim().slice(0, 30) : ''
        if (cleanName.length < 2) {
          return res.status(400).json({ error: 'Please enter your name (2-30 characters)' })
        }
        updates.name = cleanName
      }      if (hasEmail) {
        const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
        if (!isValidEmail(cleanEmail)) {
          return res.status(400).json({ error: 'Valid email is required' })
        }
        updates.email = cleanEmail
      }
      if (hasGender) {
        const raw = body.gender
        const gender = raw === null ? null : typeof raw === 'string' && raw.trim() === '' ? null : String(raw).trim().toLowerCase()
        if (gender !== null && !GENDERS.includes(gender)) {
          return res.status(400).json({ error: 'Gender must be male, female, other, or empty to clear' })
        }
        updates.gender = gender
      }
      if (hasBw) {
        const bw = body.bodyweight === null || body.bodyweight === '' ? null : Number(body.bodyweight)
        if (bw !== null && !isPositiveNumber(bw)) {
          return res.status(400).json({ error: 'bodyweight must be a positive number' })
        }
        updates.bodyweight = bw
      }
      if (hasBwUnit) {
        const unit = String(body.bodyweightUnit || '').toLowerCase()
        if (unit !== 'kg' && unit !== 'lbs') {
          return res.status(400).json({ error: 'bodyweightUnit must be kg or lbs' })
        }
        updates.bodyweightUnit = unit
      }
      if (hasEffort) {
        const scale = String(body.effortScale || '').toLowerCase()
        if (scale !== 'rir' && scale !== 'rpe') {
          return res.status(400).json({ error: 'effortScale must be rir or rpe' })
        }
        updates.effortScale = scale
      }
      if (hasTimerSound) {
        const sound = String(body.timerSound || '').toLowerCase()
        if (!['off', 'beep', 'chime', 'bell'].includes(sound)) {
          return res.status(400).json({ error: 'timerSound must be off, beep, chime, or bell' })
        }
        updates.timerSound = sound
      }
      if (hasTimerPlaySound) {
        updates.timerPlaySound = body.timerPlaySound ? 1 : 0
      }
      if (hasTimerVibrate) {
        updates.timerVibrate = body.timerVibrate ? 1 : 0
      }
      if (hasTimerFlash) {
        updates.timerFlash = body.timerFlash ? 1 : 0
      }
      if (hasLanguage) {
        const lang = String(body.language || '').toLowerCase()
        if (lang !== 'en' && lang !== 'zh') {
          return res.status(400).json({ error: 'language must be en or zh' })
        }
        updates.language = lang
      }
      const user = await db.updateUserProfile(req.userId, updates)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ user })
    } catch (err) {
      if (err?.code === 'EMAIL_TAKEN') {
        return res.status(409).json({ error: 'Email already in use' })
      }
      next(err)
    }
  })

  app.delete('/api/auth/me', requireAuth, async (req, res, next) => {
    try {
      const ok = await db.deleteUser(req.userId)
      if (!ok) return res.status(404).json({ error: 'User not found' })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  // --- Exercises (public) ---

  app.get('/api/exercises', optionalAuth, async (req, res, next) => {
    try {
      res.json(await db.getExercises(req.userId || null))
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/exercises', requireAuth, async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      const category = typeof req.body?.category === 'string' ? req.body.category.trim() : ''
      const target = typeof req.body?.target === 'string' ? req.body.target.trim() : ''
      const equipment = typeof req.body?.equipment === 'string' ? req.body.equipment.trim() : ''
      if (!name || !category || !target) {
        return res.status(400).json({ error: 'name, category, and target are required' })
      }
      res.status(201).json(await db.createExercise(req.userId, { name, category, target, equipment }))
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/exercises/:id', optionalAuth, async (req, res, next) => {
    try {
      const ex = await db.getExercise(req.params.id, req.userId || null)
      if (!ex) return res.status(404).json({ error: 'Exercise not found' })
      res.json(ex)
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/exercises/:id', requireAuth, async (req, res, next) => {
    try {
      const fields = {}
      if ('name' in (req.body || {})) {
        fields.name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
        if (!fields.name) return res.status(400).json({ error: 'name is required' })
      }
      if ('instructions' in (req.body || {})) {
        fields.instructions = typeof req.body.instructions === 'string' ? req.body.instructions : ''
      }
      if ('instructionsLang' in (req.body || {})) {
        fields.instructionsLang = req.body.instructionsLang === 'zh' ? 'zh' : 'en'
      }
      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' })
      }
      const ex = await db.updateExercise(req.userId, req.params.id, fields)
      if (!ex) return res.status(404).json({ error: 'Exercise not found' })
      res.json(ex)
    } catch (err) {
      next(err)
    }
  })

  app.delete('/api/exercises/:id', requireAuth, async (req, res, next) => {
    try {
      const ok = await db.deleteExercise(req.userId, req.params.id)
      if (!ok) return res.status(404).json({ error: 'Exercise not found' })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  // --- Workout lists (protected) ---

  app.get('/api/workoutlists', requireAuth, async (req, res, next) => {
    try {
      res.json(await db.listWorkoutLists(req.userId))
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/workoutlists', requireAuth, async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      if (!name) return res.status(400).json({ error: 'name is required' })
      const exerciseId = typeof req.body?.exerciseId === 'string' ? req.body.exerciseId : undefined
      res.status(201).json(await db.createWorkoutList(req.userId, name, exerciseId))
    } catch (err) {
      if (err?.code === 'WORKOUT_NAME_CONFLICT') {
        return res.status(409).json({
          error: err.message || 'A workout with this name already exists',
          existing: err.existing || undefined,
        })
      }
      next(err)
    }
  })

  app.put('/api/workoutlists/:id', requireAuth, async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      if (!name) return res.status(400).json({ error: 'name is required' })
      const list = await db.renameWorkoutList(req.userId, req.params.id, name)
      if (!list) return res.status(404).json({ error: 'Workout list not found' })
      res.json(list)
    } catch (err) {
      if (err?.code === 'WORKOUT_NAME_CONFLICT') {
        return res.status(409).json({
          error: err.message || 'A workout with this name already exists',
          existing: err.existing || undefined,
        })
      }
      next(err)
    }
  })

  app.delete('/api/workoutlists/:id', requireAuth, async (req, res, next) => {
    try {
      const ok = await db.deleteWorkoutList(req.userId, req.params.id)
      if (!ok) return res.status(404).json({ error: 'Workout list not found' })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/workoutlists/:id/exercises', requireAuth, async (req, res, next) => {
    try {
      const exerciseId = typeof req.body?.exerciseId === 'string' ? req.body.exerciseId : ''
      if (!exerciseId) return res.status(400).json({ error: 'exerciseId is required' })
      const list = await db.addExerciseToList(req.userId, req.params.id, exerciseId)
      if (!list) return res.status(404).json({ error: 'Workout list or exercise not found' })
      res.json(list)
    } catch (err) {
      next(err)
    }
  })

  app.delete('/api/workoutlists/:id/exercises/:exerciseId', requireAuth, async (req, res, next) => {
    try {
      const list = await db.removeExerciseFromList(req.userId, req.params.id, req.params.exerciseId)
      if (!list) return res.status(404).json({ error: 'Workout list not found' })
      res.json(list)
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/workoutlists/:id/exercises/:exerciseId', requireAuth, async (req, res, next) => {
    try {
      const body = req.body ?? {}
      const settings = {}
      if ('restSecs' in body) settings.restSecs = body.restSecs
      if ('restEnabled' in body) settings.restEnabled = body.restEnabled
      if ('rirEnabled' in body) settings.rirEnabled = body.rirEnabled
      if (Object.keys(settings).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' })
      }
      const list = await db.updateExerciseSettings(req.userId, req.params.id, req.params.exerciseId, settings)
      if (!list) return res.status(404).json({ error: 'Workout list or exercise not found' })
      res.json(list)
    } catch (err) {
      if (err?.message?.includes('restSecs') || err?.message?.includes('RIR logging does not apply')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  // --- Workout Sessions (protected) ---

  app.post('/api/workoutlists/:id/sessions', requireAuth, async (req, res, next) => {
    try {
      const session = await db.createSession(req.userId, req.params.id)
      if (!session) return res.status(404).json({ error: 'Workout list not found' })
      res.status(201).json(session)
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/workoutlists/:id/sessions', requireAuth, async (req, res, next) => {
    try {
      const sessions = await db.listSessionsForList(req.userId, req.params.id)
      if (sessions === null) return res.status(404).json({ error: 'Workout list not found' })
      res.json(sessions)
    } catch (err) {
      next(err)
    }
  })

  // All sessions across live and deleted workout lists — feeds the journal.
  app.get('/api/sessions', requireAuth, async (req, res, next) => {
    try {
      res.json(await db.listAllSessionsForUser(req.userId))
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/sessions/:sessionId', requireAuth, async (req, res, next) => {
    try {
      const session = await db.getOwnedSession(req.userId, req.params.sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })
      res.json(session)
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/sessions/:sessionId/sets', requireAuth, async (req, res, next) => {
    try {
      const { exerciseId, setNumber, reps, weight, weightUnit, rir, effortScale } = req.body ?? {}
      if (!exerciseId) return res.status(400).json({ error: 'exerciseId is required' })
      if (setNumber == null) return res.status(400).json({ error: 'setNumber is required' })
      const scale = req.body?.effort_scale ?? effortScale
      const session = await db.logSet(req.userId, req.params.sessionId, exerciseId, setNumber, reps, weight, weightUnit, rir, scale)
      if (!session) return res.status(404).json({ error: 'Session not found or already completed' })
      res.json(session)
    } catch (err) {
      if (err?.message?.includes('rir')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  app.delete('/api/sessions/:sessionId/sets/:setId', requireAuth, async (req, res, next) => {
    try {
      const session = await db.deleteSet(req.userId, req.params.sessionId, req.params.setId)
      if (!session) return res.status(404).json({ error: 'Session not found or already completed' })
      res.json(session)
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/sessions/:sessionId/sets/:setId', requireAuth, async (req, res, next) => {
    try {
      const { reps, weight, weightUnit, rir, effortScale } = req.body ?? {}
      const scale = req.body?.effort_scale ?? effortScale
      const session = await db.updateSet(req.userId, req.params.sessionId, req.params.setId, reps, weight, weightUnit, rir, scale)
      if (!session) return res.status(404).json({ error: 'Session not found or already completed' })
      res.json(session)
    } catch (err) {
      if (err?.message?.includes('rir')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  app.put('/api/sessions/:sessionId/complete', requireAuth, async (req, res, next) => {
    try {
      const session = await db.completeSession(req.userId, req.params.sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })
      res.json(session)
    } catch (err) {
      if (err?.code === 'INCOMPLETE_SETS' || err?.code === 'EMPTY_SESSION') {
        return res.status(400).json({
          error: err.message,
          code: err.code,
          incompleteCount: err.incompleteCount ?? 0,
          incompleteIds: err.incompleteIds || [],
        })
      }
      next(err)
    }
  })

  app.put('/api/sessions/:sessionId/bodyweight', requireAuth, async (req, res, next) => {
    try {
      const { bodyweight, bodyweightUnit } = req.body ?? {}
      const session = await db.updateSessionBodyweight(req.userId, req.params.sessionId, bodyweight ?? null, bodyweightUnit || 'kg')
      if (!session) return res.status(404).json({ error: 'Session not found' })
      res.json(session)
    } catch (err) {
      if (String(err?.message || '').includes('bodyweight')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  // --- Weigh-in history (journal bodyweight card) ---

  app.get('/api/bodyweight', requireAuth, async (req, res, next) => {
    try {
      res.json(await db.listWeighIns(req.userId))
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/bodyweight', requireAuth, async (req, res, next) => {
    try {
      const { weight, unit, loggedAt } = req.body ?? {}
      if (weight === undefined || weight === null || weight === '') {
        return res.status(400).json({ error: 'weight is required' })
      }
      res.status(201).json(await db.logWeighIn(req.userId, weight, unit || 'kg', loggedAt || null))
    } catch (err) {
      if (String(err?.message || '').includes('weight') || String(err?.message || '').includes('logged_at')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  app.delete('/api/bodyweight/:id', requireAuth, async (req, res, next) => {
    try {
      const result = await db.deleteWeighIn(req.userId, req.params.id)
      if (!result) return res.status(404).json({ error: 'Weigh-in not found' })
      res.json(result)
    } catch (err) {
      next(err)
    }
  })

  app.put('/api/bodyweight/goal', requireAuth, async (req, res, next) => {
    try {
      const { targetWeight } = req.body ?? {}
      const value = targetWeight === null || targetWeight === '' ? null : Number(targetWeight)
      const user = await db.setTargetWeight(req.userId, value)
      res.json({ user })
    } catch (err) {
      if (String(err?.message || '').includes('target weight')) {
        return res.status(400).json({ error: err.message })
      }
      next(err)
    }
  })

  app.delete('/api/sessions/:sessionId', requireAuth, async (req, res, next) => {
    try {
      const ok = await db.deleteSession(req.userId, req.params.sessionId)
      if (!ok) return res.status(404).json({ error: 'Session not found' })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  app.delete('/api/workoutlists/:id/sessions', requireAuth, async (req, res, next) => {
    try {
      const result = await db.deleteSessionsForList(req.userId, req.params.id)
      if (result === null) return res.status(404).json({ error: 'Workout list not found' })
      res.json({ ok: true, ...result })
    } catch (err) {
      next(err)
    }
  })

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
