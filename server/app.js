import express from 'express'
import { Image } from 'imagescript'
import db, { normalizeQuestionnaire } from './db.js'
import { hashPassword, verifyPassword, createToken } from './auth.js'
import { requireAuth, optionalAuth } from './authMiddleware.js'
import { GENDERS, isPositiveNumber, isValidEmail } from './validate.js'

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'
const GOALS = ['strength', 'muscle', 'fat_loss', 'general'] // 按你的问卷选项改
const EXPERIENCE = ['beginner', 'intermediate', 'advanced']

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
      // Survey answers collected in the signup wizard. Validated with the
      // same rules as the retake endpoint; absent = signup without answers
      // (older clients), which the account questionnaire can fill later.
      const questionnaireRaw = req.body?.questionnaire ?? null
      let questionnaire = null
      if (questionnaireRaw != null) {
        try {
          questionnaire = normalizeQuestionnaire(questionnaireRaw)
        } catch (err) {
          return res.status(400).json({ error: err.message })
        }
      }
      const existing = await db.getUserByEmail(email)
      if (existing) return res.status(409).json({ error: 'Email already registered' })
      const passwordHash = await hashPassword(password)
      const user = await db.createUser(email, passwordHash, gender, displayName, language, questionnaire)
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
      const safeUser = { id: user.id, email: user.email, name: user.name ?? null, createdAt: user.createdAt, gender: user.gender ?? null, bodyweight: user.bodyweight ?? null, bodyweightUnit: user.bodyweightUnit || 'kg', targetWeight: user.targetWeight ?? null, effortScale: user.effortScale || 'rir', timerSound: user.timerSound || 'beep', timerPlaySound: user.timerPlaySound ?? 1, timerVibrate: user.timerVibrate ?? 1, timerFlash: user.timerFlash ?? 0, language: user.language || 'en', questionnaire: user.questionnaire ?? null, questionnaireUpdatedAt: user.questionnaireUpdatedAt ?? null }
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
      const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
      const hasGender = has('gender')
      const hasEmail = has('email')
      const hasName = has('name')
      const hasBw = has('bodyweight')
      const hasBwUnit = has('bodyweightUnit')
      const hasEffort = has('effortScale')
      const hasTimerSound = has('timerSound')
      const hasTimerPlaySound = has('timerPlaySound')
      const hasTimerVibrate = has('timerVibrate')
      const hasTimerFlash = has('timerFlash')
      const hasLanguage = has('language')
      const hasSchedule = has('schedule')
      const hasPlan = has('plan')
      if (
        !hasGender && !hasEmail && !hasName && !hasBw && !hasBwUnit &&
        !hasEffort && !hasTimerSound && !hasTimerPlaySound && !hasTimerVibrate &&
        !hasTimerFlash && !hasLanguage && !hasSchedule && !hasPlan
      ) {
        return res.status(400).json({ error: 'Nothing to update' })
      }
      const updates = {}
      if (hasName) {
        const cleanName = typeof body.name === 'string' ? body.name.trim().slice(0, 30) : ''
        if (cleanName.length < 2) {
          return res.status(400).json({ error: 'Please enter your name (2-30 characters)' })
        }
        updates.name = cleanName
      }
      if (hasEmail) {
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
      if (hasSchedule) {
        // Shape validation lives in normalizeSchedule (db.js) — bad plans fail
        // loudly with a 400 so the editor can show what's wrong.
        updates.schedule = body.schedule
      }
      if (hasPlan) {
        // Questionnaire answers (goal / experience / days / equipment ...).
        const p = body.plan
        if (p === null) {
          updates.plan = null
        } else {
          if (typeof p !== 'object' || Array.isArray(p)) {
            return res.status(400).json({ error: 'plan must be an object' })
          }
          const days = Number(p.daysPerWeek)
          if (!Number.isInteger(days) || days < 1 || days > 7) {
            return res.status(400).json({ error: 'daysPerWeek must be an integer from 1 to 7' })
          }
          if (!p.goal || !p.experience || !p.equipment) {
            return res.status(400).json({ error: 'goal, experience and equipment are required' })
          }
          if (!GOALS.includes(p.goal)) {
            return res.status(400).json({ error: `goal must be one of: ${GOALS.join(", ")}` })
          }
          if (!EXPERIENCE.includes(p.experience)) {
            return res.status(400).json({ error: `experience must be one of: ${EXPERIENCE.join(", ")}` })
          }
          const minutes = p.sessionMinutes == null || p.sessionMinutes === '' ? null : Number(p.sessionMinutes)
          if (minutes !== null && !isPositiveNumber(minutes)) {
            return res.status(400).json({ error: 'sessionMinutes must be a positive number' })
          }
          updates.plan = {
            goal: String(p.goal),
            experience: String(p.experience),
            daysPerWeek: days,
            equipment: String(p.equipment),
            sessionMinutes: minutes,
            generatePlan: !!p.generatePlan,
          }
        }
      }
      const user = await db.updateUserProfile(req.userId, updates)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ user })
    } catch (err) {
      if (err?.code === 'EMAIL_TAKEN') {
        return res.status(409).json({ error: 'Email already in use' })
      }
      // normalizeSchedule validation errors surface as 400s.
      if (String(err?.message || '').startsWith('schedule')) {
        return res.status(400).json({ error: err.message })
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

  // Registration questionnaire (goals) — saved once at onboarding and
  // refillable from the account page. The client reads the answers back via
  // GET /api/auth/me (user.questionnaire).
  app.put('/api/auth/questionnaire', requireAuth, async (req, res, next) => {
    try {
      const answers = req.body?.answers
      const user = await db.saveQuestionnaire(req.userId, answers)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json({ user })
    } catch (err) {
      if (String(err?.message || '').includes('required')) {
        return res.status(400).json({ error: err.message })
      }
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
      const gifUrl = typeof req.body?.gifUrl === 'string' ? req.body.gifUrl.trim() : ''
      const instructions = typeof req.body?.instructions === 'string' ? req.body.instructions.trim() : ''
      const instructionsLang = req.body?.instructionsLang === 'zh' ? 'zh' : 'en'
      const instructionSteps = Array.isArray(req.body?.instructionSteps)
        ? req.body.instructionSteps
        : []
      if (!name || !category || !target) {
        return res.status(400).json({ error: 'name, category, and target are required' })
      }
      if (gifUrl && !/^https?:\/\/\S+$/i.test(gifUrl)) {
        return res.status(400).json({ error: 'gifUrl must be an http(s) URL' })
      }
      if (gifUrl.length > 1000) {
        return res.status(400).json({ error: 'gifUrl is too long' })
      }
      if (instructions.length > 4000) {
        return res.status(400).json({ error: 'instructions are too long (max 4000 characters)' })
      }
      if (instructionSteps.length > 20) {
        return res.status(400).json({ error: 'instructionSteps must contain at most 20 entries' })
      }
      const cleanSteps = []
      for (const step of instructionSteps) {
        if (typeof step !== 'string') {
          return res.status(400).json({ error: 'each instruction step must be a string' })
        }
        const trimmed = step.trim()
        if (trimmed.length > 500) {
          return res.status(400).json({ error: 'each instruction step is too long (max 500 characters)' })
        }
        if (trimmed) cleanSteps.push(trimmed)
      }
      res.status(201).json(await db.createExercise(req.userId, { name, category, target, equipment, gifUrl: gifUrl || null, instructionSteps: cleanSteps, instructions, instructionsLang }))
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

  // --- Exercise media (uploaded custom-exercise GIFs) ---
  // GIF bytes are stored base64 in D1 (exercise_media) and served back through
  // the public GET /api/media/:id so <img> tags can load them without auth
  // headers. Ids are unguessable UUIDs — same trust model as pasted URLs.

  // Raw bytes must fit a D1 row after base64 inflation (~x4/3); D1 caps rows
  // at 2,000,000 bytes, so uploads are capped well below that.
  const MAX_GIF_BYTES = 1400000

  app.post('/api/media', requireAuth, express.raw({ type: 'image/*', limit: '4mb' }), async (req, res, next) => {
    try {
      const buf = Buffer.isBuffer(req.body) ? req.body : null
      if (!buf || buf.length === 0) {
        return res.status(400).json({ error: 'GIF file body is required (Content-Type image/gif)' })
      }
      if (buf.length > MAX_GIF_BYTES) {
        return res.status(413).json({ error: 'GIF is too large (max 1.4 MB)' })
      }
      // Magic bytes gate: renamed non-GIF uploads are rejected.
      const magic = buf.subarray(0, 6).toString('latin1')
      if (magic !== 'GIF87a' && magic !== 'GIF89a') {
        return res.status(400).json({ error: 'Only GIF files are supported' })
      }
      const media = await db.createMedia(req.userId, 'image/gif', buf.toString('base64'))
      // Absolute http(s) URL keeps exercises.gif_url validation/display untouched.
      const proto = String(req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim()
      res.status(201).json({ id: media.id, url: `${proto}://${req.get('host')}/api/media/${media.id}` })
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/media/:id', async (req, res, next) => {
    try {
      const media = await db.getMedia(req.params.id)
      if (!media) return res.status(404).json({ error: 'Media not found' })
      const buf = Buffer.from(media.data, 'base64')
      res.setHeader('Content-Type', media.content_type || 'image/gif')
      res.setHeader('Content-Length', String(buf.length))
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.send(buf)
    } catch (err) {
      next(err)
    }
  })

    // --- GIF cover (first frame → PNG) ---
  // User-pasted GIF URLs are decoded server-side (no CORS in Workers) and
  // returned as a static PNG so <img> tags can show a cover without playing
  // the animation. Cached in the Cache API; upstream cached at the edge via
  // cf.cacheEverything so repeated requests don't re-decode.

  const MAX_GIF_FETCH_BYTES = 8 * 1024 * 1024 // raw GIF cap; RGBA decode inflates ~10x

  app.get('/api/gif-cover', async (req, res, next) => {
    try {
      const url = String(req.query.url || '').trim()
      if (!/^https?:\/\/\S+$/i.test(url)) {
        return res.status(400).json({ error: 'url must be an http(s) URL' })
      }
      if (url.length > 1000) {
        return res.status(400).json({ error: 'url is too long' })
      }

      // Cache API: one decode per unique URL, then pure cache hits.
      const cacheKey = new Request(`https://gif-cover.internal/${encodeURIComponent(url)}`)
      const cache = typeof caches !== 'undefined' ? caches.default : null

      if (cache) {
        const hit = await cache.match(cacheKey)
        if (hit) {
          const buf = Buffer.from(await hit.arrayBuffer())
          res.setHeader('Content-Type', 'image/png')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          res.setHeader('Content-Length', String(buf.length))
          return res.send(buf)
        }
      }

      // Server-side fetch — no browser CORS here.
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'FitnessApp/1.0 (+gif-cover)' },
        cf: { cacheTtl: 86400, cacheEverything: true },
      })
      if (!upstream.ok) {
        return res.status(502).json({ error: `upstream ${upstream.status}` })
      }

      const buf = await upstream.arrayBuffer()
      if (buf.byteLength > MAX_GIF_FETCH_BYTES) {
        return res.status(413).json({ error: 'gif is too large' })
      }

      // Magic bytes: reject anti-hotlink HTML responses before decoding.
      const sig = String.fromCharCode(...new Uint8Array(buf.slice(0, 6)))
      if (sig !== 'GIF87a' && sig !== 'GIF89a') {
        return res.status(415).json({ error: 'not a gif' })
      }

      // onlyExtractFirstFrame = true → decode just frame 0, minimal CPU.
      const frame = await Image.decode(new Uint8Array(buf), true)
      const png = await frame.encode()

      if (cache) {
        await cache.put(cacheKey, new Response(png, {
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
        }))
      }

      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Content-Length', String(png.byteLength))
      res.send(Buffer.from(png))
    } catch (err) {
      next(err)   // hits your existing error handler → 500 JSON
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
      // Preset/plan creation sends the whole exercise sequence (with
      // prescribed sets/reps + rest settings) in one call.
      let exercises = null
      if (Array.isArray(req.body?.exercises)) {
        if (req.body.exercises.length > 30) {
          return res.status(400).json({ error: 'exercises must contain at most 30 entries' })
        }
        exercises = req.body.exercises
          .filter((entry) => entry && typeof entry.exerciseId === 'string' && entry.exerciseId)
          .map((entry) => ({
            exerciseId: entry.exerciseId,
            restSecs: entry.restSecs,
            prescribedSets: entry.prescribedSets,
            prescribedReps: entry.prescribedReps,
          }))
      }
      res.status(201).json(await db.createWorkoutList(req.userId, name, exerciseId, exercises))
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
      // Optional preset prescription carried with a single-exercise add.
      const prescription = {}
      if ('restSecs' in (req.body || {})) prescription.restSecs = req.body.restSecs
      if ('prescribedSets' in (req.body || {})) prescription.prescribedSets = req.body.prescribedSets
      if ('prescribedReps' in (req.body || {})) prescription.prescribedReps = req.body.prescribedReps
      const list = await db.addExerciseToList(
        req.userId,
        req.params.id,
        exerciseId,
        Object.keys(prescription).length > 0 ? prescription : null,
      )
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

  // Manual ordering (drag-to-reorder). Registered before the ":exerciseId"
  // route so the literal "reorder" segment is not swallowed as an id.
  // The payload must list every exercise in the target list exactly once —
  // see db.reorderListExercises.
  app.put('/api/workoutlists/:id/exercises/reorder', requireAuth, async (req, res, next) => {
    try {
      const order = Array.isArray(req.body?.order) ? req.body.order : null
      if (!order || order.length === 0) {
        return res.status(400).json({ error: 'order must be a non-empty array of exercise ids' })
      }
      if (order.some((id) => typeof id !== 'string' || !id)) {
        return res.status(400).json({ error: 'order must contain exercise ids' })
      }
      const list = await db.reorderListExercises(req.userId, req.params.id, order)
      if (!list) {
        return res.status(400).json({ error: 'order must match the workouts exercises exactly' })
      }
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
      if ('prescribedSets' in body) settings.prescribedSets = body.prescribedSets
      if ('prescribedReps' in body) settings.prescribedReps = body.prescribedReps
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
