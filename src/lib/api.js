const API_BASE = import.meta.env.VITE_API_BASE ?? ""
const TOKEN_KEY = "fitplan_token"

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

const request = async (path, { method, body, auth = true } = {}) => {
  const headers = {}
  if (body) headers["Content-Type"] = "application/json"
  if (auth) {
    const token = getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let existing
    let code
    let incompleteCount
    let incompleteIds
    try {
      const data = await res.json()
      if (data?.error) message = data.error
      if (data?.existing) existing = data.existing
      if (data?.code) code = data.code
      if (data?.incompleteCount !== undefined) incompleteCount = data.incompleteCount
      if (data?.incompleteIds) incompleteIds = data.incompleteIds
    } catch {
      // keep default message
    }
    const error = new Error(message)
    error.status = res.status
    if (existing) error.existing = existing
    if (code) error.code = code
    if (incompleteCount !== undefined) error.incompleteCount = incompleteCount
    if (incompleteIds) error.incompleteIds = incompleteIds
    throw error
  }
  return res.json()
}

// --- Auth ---

export const signup = (email, password, gender = null, name = null, language = null) =>
  request("/auth/signup", { method: "POST", body: { email, password, gender, name, language }, auth: false })

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password }, auth: false })

export const fetchMe = () => request("/auth/me")

export const updateProfile = ({ email, gender, name, bodyweight, bodyweightUnit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language } = {}) => {
  const body = {}
  if (email !== undefined) body.email = email
  if (gender !== undefined) body.gender = gender
  if (name !== undefined) body.name = name
  if (bodyweight !== undefined) body.bodyweight = bodyweight
  if (bodyweightUnit !== undefined) body.bodyweightUnit = bodyweightUnit
  if (effortScale !== undefined) body.effortScale = effortScale
  if (timerSound !== undefined) body.timerSound = timerSound
  if (timerPlaySound !== undefined) body.timerPlaySound = timerPlaySound
  if (timerVibrate !== undefined) body.timerVibrate = timerVibrate
  if (timerFlash !== undefined) body.timerFlash = timerFlash
  if (language !== undefined) body.language = language
  return request("/auth/profile", { method: "PUT", body })
}

export const deleteAccount = () =>
  request("/auth/me", { method: "DELETE" })

// --- Exercises (public library + own customs when logged in) ---

export const fetchExercises = () => request("/exercises")

export const createExercise = ({ name, category, target, equipment }) =>
  request("/exercises", { method: "POST", body: { name, category, target, equipment } })

export const updateExercise = (id, fields) =>
  request(`/exercises/${id}`, { method: "PUT", body: fields })

export const deleteExercise = (id) =>
  request(`/exercises/${id}`, { method: "DELETE" })

// --- Workout lists (private) ---

export const fetchWorkoutLists = () => request("/workoutlists")

export const createWorkoutList = (name, exerciseId) =>
  request("/workoutlists", { method: "POST", body: { name, exerciseId } })

export const renameWorkoutList = (id, name) =>
  request(`/workoutlists/${id}`, { method: "PUT", body: { name } })

export const findListByNameInsensitive = (lists, name) => {
  const trimmed = typeof name === "string" ? name.trim().toLowerCase() : ""
  if (!trimmed) return null
  return (lists || []).find((l) => typeof l?.name === "string" && l.name.toLowerCase() === trimmed) || null
}

export const deleteWorkoutList = (id) =>
  request(`/workoutlists/${id}`, { method: "DELETE" })

export const addExerciseToList = (listId, exerciseId) =>
  request(`/workoutlists/${listId}/exercises`, { method: "POST", body: { exerciseId } })

export const removeExerciseFromList = (listId, exerciseId) =>
  request(`/workoutlists/${listId}/exercises/${exerciseId}`, { method: "DELETE" })

export const updateWorkoutExerciseSettings = (listId, exerciseId, settings) =>
  request(`/workoutlists/${listId}/exercises/${exerciseId}`, { method: "PUT", body: settings })

// --- Workout Sessions (private) ---

export const createSession = (listId) =>
  request(`/workoutlists/${listId}/sessions`, { method: "POST" })

export const fetchSessionsForList = (listId) =>
  request(`/workoutlists/${listId}/sessions`)

export const fetchAllSessions = () =>
  request("/sessions")

export const fetchSession = (sessionId) =>
  request(`/sessions/${sessionId}`)

export const logSet = (sessionId, exerciseId, setNumber, reps, weight, weightUnit, rir = null, effortScale) => {
  const body = { exerciseId, setNumber, reps, weight, weightUnit, rir }
  if (effortScale !== undefined) body.effortScale = effortScale
  return request(`/sessions/${sessionId}/sets`, { method: "POST", body })
}

export const deleteSet = (sessionId, setId) =>
  request(`/sessions/${sessionId}/sets/${setId}`, { method: "DELETE" })

export const updateSet = (sessionId, setId, { reps, weight, weightUnit, rir, effortScale }) =>
  request(`/sessions/${sessionId}/sets/${setId}`, { method: "PUT", body: { reps, weight, weightUnit, rir, effortScale } })

export const completeSession = (sessionId) =>
  request(`/sessions/${sessionId}/complete`, { method: "PUT" })

export const updateSessionBodyweight = (sessionId, bodyweight, bodyweightUnit) =>
  request(`/sessions/${sessionId}/bodyweight`, { method: "PUT", body: { bodyweight, bodyweightUnit } })

export const deleteSession = (sessionId) =>
  request(`/sessions/${sessionId}`, { method: "DELETE" })

export const clearSessionsForList = (listId) =>
  request(`/workoutlists/${listId}/sessions`, { method: "DELETE" })

// --- Weigh-in history (journal bodyweight card) ---

export const fetchWeighIns = () =>
  request("/bodyweight")

export const logWeighIn = ({ weight, unit, loggedAt } = {}) =>
  request("/bodyweight", { method: "POST", body: { weight, unit, loggedAt } })

export const deleteWeighIn = (id) =>
  request(`/bodyweight/${id}`, { method: "DELETE" })

export const setTargetWeight = (targetWeight) =>
  request("/bodyweight/goal", { method: "PUT", body: { targetWeight } })
