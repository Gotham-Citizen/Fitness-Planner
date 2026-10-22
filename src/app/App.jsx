import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { CustomExerciseForm, MobileTabBar, PickBanner, SavePanel } from "../components/molecules/index.js"
import { AppHeader, EditWorkoutView, ExerciseLibrary, MovementDetail } from "../components/organisms/index.js"
import { AppShell, AuthTemplate } from "../components/templates/index.js"

import { AccountPage } from "./AccountPage/AccountPage.jsx"
import { AuthPage } from "./AuthPage/AuthPage.jsx"
import { BalancePage } from "./BalancePage/BalancePage.jsx"
import { HistoryPage } from "./HistoryPage/HistoryPage.jsx"
import { HomePage } from "./HomePage/HomePage.jsx"
import { JournalPage } from "./JournalPage/JournalPage.jsx"
import { PlannerPage } from "./PlannerPage/PlannerPage.jsx"
import { SessionPage } from "./SessionPage/SessionPage.jsx"
import { SummaryPage } from "./SummaryPage/SummaryPage.jsx"
import { TimerAlertsPage } from "./TimerAlertsPage/TimerAlertsPage.jsx"
import { WorkoutsPage } from "./WorkoutsPage/WorkoutsPage.jsx"

import {
  addExerciseToList,
  clearSessionsForList,
  completeSession,
  createExercise,
  createSession,
  createWorkoutList,
  deleteAccount,
  deleteExercise,
  deleteSession,
  deleteSet,
  deleteWeighIn,
  deleteWorkoutList,
  fetchAllSessions as fetchAllUserSessions,
  fetchExercises,
  fetchMe,
  fetchSessionsForList,
  fetchWeighIns,
  fetchWorkoutLists,
  getToken,
  logSet,
  logWeighIn,
  removeExerciseFromList,
  renameWorkoutList,
  setTargetWeight,
  setToken,
  updateExercise,
  updateProfile,
  updateSet,
  updateWorkoutExerciseSettings,
} from "../lib/api.js"
import { profileBodyweightKg } from "../lib/bodyweight.js"
import { hasEffort } from "../lib/effort.js"
import { todayKeyLocal } from "../lib/journal.js"
import { buildHierarchy, findExercise, searchExercises, titleCase } from "../lib/muscles.js"
import { appendViewedTarget, buildRecentRows, loadViewedTargets } from "../lib/recent.js"
import { computeRecovery } from "../lib/recovery.js"
import { classifySets } from "../lib/setValidation.js"
import { resolveAlertSound } from "../lib/timerAlert.js"
import { clearStoredLanguage, persistLanguage, storedLanguage } from "../utils/i18n.js"
import { normalizeLang } from "../utils/locale.js"

import "./App.css"

export const App = () => {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(() => localStorage.getItem("fitplan-theme") || "dark")
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("fitplan-theme", theme)
  }, [theme])
  const [authLoaded, setAuthLoaded] = useState(!getToken())
  const [user, setUser] = useState(null)
  const [exercises, setExercises] = useState(null)
  const [workoutLists, setWorkoutLists] = useState([])
  const [view, setView] = useState("home")
  const [selected, setSelected] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [activeSessionList, setActiveSessionList] = useState(null)
  const [finishAttempted, setFinishAttempted] = useState(false)
  const [summarySession, setSummarySession] = useState(null)
  const [summaryList, setSummaryList] = useState(null)
  const [historySessions, setHistorySessions] = useState([])
  const [historyList, setHistoryList] = useState(null)
  const [historySummarySession, setHistorySummarySession] = useState(null)
  const [historyReturnView, setHistoryReturnView] = useState("workouts")
  const [journalFilterListId, setJournalFilterListId] = useState("all")
  const [journalDateKey, setJournalDateKey] = useState(() => todayKeyLocal())
  const [error, setError] = useState(null)
  const [startingSession, setStartingSession] = useState(false)
  const [allSessions, setAllSessions] = useState([])
  const [sessionTick, setSessionTick] = useState(0)
  const [recoveryKey, setRecoveryKey] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingAddList, setPendingAddList] = useState(null)
  const [lastAdded, setLastAdded] = useState(null)
  const [editingListId, setEditingListId] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customFormListId, setCustomFormListId] = useState(null)
  const [viewedTargets, setViewedTargets] = useState(loadViewedTargets)
  const [recentRequested, setRecentRequested] = useState(false)
  const [authMode, setAuthMode] = useState("signup")
  const [weighIns, setWeighIns] = useState(null)
  const [savingWeighIn, setSavingWeighIn] = useState(false)
  const [sortAlpha, setSortAlpha] = useState(false)
  const [sortByDifficulty, setSortByDifficulty] = useState(false)
  const bwBackfillFor = useRef({})

  const showError = (msg) => {
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }

  useEffect(() => {
    fetchMe()
      .then(({ user }) => {
        setUser(user)
      })
      .catch(() => {
        setToken(null)
        // Guest state: drop any stale account-language cache so the UI
        // falls back to the browser language.
        clearStoredLanguage()
      })
      .finally(() => setAuthLoaded(true))
  }, [])

  const authenticated = Boolean(user && getToken())

  useEffect(() => {
    const next = normalizeLang(user?.language || storedLanguage())
    if (normalizeLang(i18n.language) !== next) {
      i18n.changeLanguage(next)
      // Only a signed-in account caches its language — guests always follow
      // the browser (clearStoredLanguage on logout resets to it).
      if (user?.language) persistLanguage(next)
    }
  }, [user?.language, i18n])

  const goLogin = () => {
    setAuthMode("login")
    setSelectedExercise(null)
    setView("auth")
  }

  const requireAuthOrGo = (nextView) => {
    if (authenticated) {
      setSelectedExercise(null)
      setView(nextView)
    } else {
      goLogin()
    }
  }

  useEffect(() => {
    // Public exercise library loads for guests too (server uses optionalAuth);
    // refetch after login to include the user's custom exercises.
    fetchExercises()
      .then(setExercises)
      .catch((err) => {
        console.error("Failed to load exercise data", err)
        showError(t("errors.loadExercises"))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    fetchWorkoutLists()
      .then(setWorkoutLists)
      .catch((err) => {
        console.error("Failed to load workout lists", err)
        showError(t("errors.loadLists"))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  const hierarchy = useMemo(() => (exercises ? buildHierarchy(exercises, null, normalizeLang(i18n.language)) : []), [exercises, i18n.language])

  const equipments = useMemo(() => {
    const set = new Set()
    for (const ex of exercises || []) {
      if (typeof ex?.equipment === "string" && ex.equipment.trim()) set.add(ex.equipment.trim())
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const handleCreateExercise = async ({ name, category, target, equipment }) => {
    if (!authenticated) {
      goLogin()
      return null
    }
    const ex = await createExercise({ name, category, target, equipment })
    setExercises((prev) => (prev ? [...prev, ex] : [ex]))
    // Created from inside Edit workout: add straight into that list and stay in the modal.
    if (customFormListId && workoutLists.some((l) => l.id === customFormListId)) {
      setShowCustomForm(false)
      setCustomFormListId(null)
      await handleAddExerciseToList(customFormListId, ex.id)
      return ex
    }
    setShowCustomForm(false)
    setCustomFormListId(null)
    setSelected({ category: ex.category, target: ex.target })
    setSelectedExercise(null)
    setView("planner")
    return ex
  }

  const handleUpdateExercise = async (id, fields) => {
    const updated = await updateExercise(id, fields)
    setExercises((prev) => (prev ? prev.map((ex) => (ex.id === id ? updated : ex)) : prev))
    setSelectedExercise((prev) => (prev && prev.id === id ? updated : prev))
    setSaveTarget((prev) => (prev && prev.id === id ? updated : prev))
    fetchWorkoutLists().then(setWorkoutLists).catch((err) => console.error("Failed to refresh lists", err))
    return updated
  }

  const handleDeleteExercise = async (id) => {
    await deleteExercise(id)
    setExercises((prev) => (prev ? prev.filter((ex) => ex.id !== id) : prev))
    setSelectedExercise((prev) => (prev && prev.id === id ? null : prev))
    setSaveTarget((prev) => (prev && prev.id === id ? null : prev))
    // Server cascades the join rows; drop it from local lists immediately.
    setWorkoutLists((prev) =>
      prev.map((l) => ({ ...l, exercises: l.exercises.filter((ex) => ex.id !== id) })),
    )
  }

  const searching = searchQuery.trim() !== ""
  const searchLang = normalizeLang(i18n.language)
  const searchResults = useMemo(
    () => (exercises && searching ? searchExercises(exercises, searchQuery, searchLang) : []),
    [exercises, searching, searchQuery, searchLang],
  )

  const fetchAllSessions = useCallback(() => {
    if (!authenticated) return Promise.resolve([])
    // Single endpoint covering live + deleted lists (journal history).
    // Falls back to per-list fan-out for servers predating /api/sessions.
    return fetchAllUserSessions().catch(() => {
      if (workoutLists.length === 0) return []
      return Promise.all(workoutLists.map((l) => fetchSessionsForList(l.id).catch(() => []))).then((groups) =>
        groups.flat(),
      )
    })
  }, [authenticated, workoutLists])

  const recoveryCacheKey = `${workoutLists.map((l) => l.id).join(",")}#${sessionTick}`

  useEffect(() => {
    if ((view !== "workouts" && view !== "journal" && view !== "balance" && view !== "structural-balance") || recoveryKey === recoveryCacheKey) return
    let cancelled = false
    fetchAllSessions()
      .then((flat) => {
        if (!cancelled) {
          setAllSessions(flat)
          setRecoveryKey(recoveryCacheKey)
        }
      })
      .catch((err) => {
        console.error("Failed to load sessions for recovery", err)
      })
    return () => {
      cancelled = true
    }
  }, [view, recoveryCacheKey, recoveryKey, fetchAllSessions])

  // Lazy sessions load for the library's Recent tab (first open only).
  useEffect(() => {
    if (!recentRequested || recoveryKey === recoveryCacheKey) return
    let cancelled = false
    fetchAllSessions()
      .then((flat) => {
        if (!cancelled) {
          setAllSessions(flat)
          setRecoveryKey(recoveryCacheKey)
        }
      })
      .catch((err) => {
        console.error("Failed to load sessions for recent muscles", err)
      })
    return () => {
      cancelled = true
    }
  }, [recentRequested, recoveryCacheKey, recoveryKey, fetchAllSessions])

  // Weigh-in history for the journal bodyweight card. Seeds the log from the
  // profile bodyweight once for users who logged it before history existed.
  useEffect(() => {
    if (view !== "journal" || !authenticated) return
    let cancelled = false
    fetchWeighIns()
      .then(async (list) => {
        if (cancelled) return
        let entries = Array.isArray(list) ? list : []
        const uid = user?.id
        if (entries.length === 0 && uid && user?.bodyweight != null && !bwBackfillFor.current[uid]) {
          bwBackfillFor.current[uid] = true
          try {
            const { entry, user: updated } = await logWeighIn({
              weight: user.bodyweight,
              unit: user.bodyweightUnit || "kg",
              loggedAt: new Date().toISOString(),
            })
            if (cancelled) return
            if (updated) setUser(updated)
            entries = [entry]
          } catch (err) {
            console.error("Failed to backfill weigh-in history", err)
          }
        }
        if (!cancelled) setWeighIns(entries)
      })
      .catch((err) => {
        console.error("Failed to load weigh-ins", err)
      })
    return () => {
      cancelled = true
    }
  }, [view, authenticated, user?.id, user?.bodyweight, user?.bodyweightUnit])

  const recentLoading = recentRequested && workoutLists.length > 0 && recoveryKey !== recoveryCacheKey
  const recoveryLoading = authenticated && view === "workouts" && workoutLists.length > 0 && recoveryKey !== recoveryCacheKey
  const journalLoading = authenticated && view === "journal" && workoutLists.length > 0 && recoveryKey !== recoveryCacheKey

  const liveSessions = useMemo(() => {
    if (!exercises || workoutLists.length === 0) return []
    const liveIds = new Set(workoutLists.map((l) => l.id))
    return allSessions.filter((s) => !s.listId || liveIds.has(s.listId))
  }, [exercises, allSessions, workoutLists])

  const journalSessions = useMemo(() => {
    // Journal keeps deleted lists' sessions; live-only feeds stay on liveSessions.
    if (journalFilterListId === "all") return allSessions
    return allSessions.filter((s) => s.listId === journalFilterListId)
  }, [allSessions, journalFilterListId])

  const showEffort = useMemo(() => hasEffort(journalSessions), [journalSessions])

  // Set ids with weight-but-no-reps, highlighted after a blocked Finish attempt.
  // Recomputed live so rows un-highlight as soon as reps are entered.
  const invalidFinishIds = useMemo(
    () => (finishAttempted && activeSession ? classifySets(activeSession.sets).invalidIds : []),
    [finishAttempted, activeSession],
  )

  const recovery = useMemo(
    () => (exercises ? computeRecovery({ exercises, allSessions: liveSessions }) : []),
    [exercises, liveSessions],
  )

  const recentRows = useMemo(
    () => buildRecentRows({ hierarchy, allSessions: liveSessions, viewedLog: viewedTargets }),
    [hierarchy, liveSessions, viewedTargets],
  )

  const selectedTarget = useMemo(() => {
    if (!selected || !exercises) return null
    if (!selected.target) return null
    const part = hierarchy.find((p) => p.name === selected.category)
    const target = part?.targets.find((t) => t.name === selected.target)
    if (!target) return null
    return { categoryLabel: titleCase(part.name), ...target }
  }, [selected, hierarchy, exercises])

  const selectedCategory = useMemo(() => {
    if (!selected || !exercises) return null
    const part = hierarchy.find((p) => p.name === selected.category)
    if (!part) return null
    return part
  }, [selected, hierarchy, exercises])

  const replaceList = (updated) => {
    setWorkoutLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  const findListByNameInsensitive = (name) => {
    const lowered = name.trim().toLowerCase()
    return workoutLists.find((l) => l.name.toLowerCase() === lowered) || null
  }

  const resolveCreateConflict = (trimmed, serverExisting, { silentExact = false } = {}) => {
    const existing = serverExisting
      ? workoutLists.find((l) => l.id === serverExisting.id) || {
          id: serverExisting.id,
          name: serverExisting.name,
        }
      : findListByNameInsensitive(trimmed)
    if (!existing) return null
    if (existing.name === trimmed) {
      if (!silentExact) showError(t("errors.nameExists", { name: existing.name }))
      return { status: "duplicate", existing }
    }
    return { status: "conflict", existing, proposed: trimmed }
  }

  const logViewedTarget = (category, target) => {
    if (!category || !target) return
    setViewedTargets((prev) => appendViewedTarget(prev, category, target))
  }

  const handleSelectTarget = (category, target) => {
    setView("planner")
    setSelectedExercise(null)
    setSelected({ category, target })
    logViewedTarget(category, target)
    setSortAlpha(false)
    setSortByDifficulty(false)
  }

  const handleSelectCategory = (category) => {
    setView("planner")
    setSelectedExercise(null)
    if (!category) {
      setSelected(null)
      setSortAlpha(false)
      setSortByDifficulty(false)
      return
    }
    setSelected({ category, target: null })
    setSortAlpha(false)
    setSortByDifficulty(false)
  }

  const handleSelectMuscle = (category, target) => {
    setSearchQuery("")
    handleSelectTarget(category, target)
  }

  const handleSelectExercise = (ex) => {
    setView("planner")
    setSelectedExercise(ex)
    if (ex?.category && ex?.target) logViewedTarget(ex.category, ex.target)
  }

  const goHome = () => {
    setView("home")
    setSelected(null)
    setSelectedExercise(null)
    setSearchQuery("")
    setPendingAddList(null)
    setLastAdded(null)
    setEditingListId(null)
  }

  const handleStartAddExercise = (list) => {
    setPendingAddList({ id: list.id, name: list.name })
    setLastAdded(null)
    setView("planner")
    setSelectedExercise(null)
  }

  const handleEditWorkout = (list) => {
    setEditingListId(list.id)
  }

  const handleCloseEditWorkout = () => {
    setEditingListId(null)
  }

  const handleEditAddExercise = (list) => {
    setEditingListId(list.id)
    handleStartAddExercise(list)
  }

  const handleCancelAddExercise = () => {
    setPendingAddList(null)
    setLastAdded(null)
  }

  const handleFinishAddExercise = () => {
    setPendingAddList(null)
    setLastAdded(null)
    setView("workouts")
    setSelectedExercise(null)
  }

  const handleUpdateWorkoutSettings = async (listId, exerciseId, settings) => {
    try {
      const updated = await updateWorkoutExerciseSettings(listId, exerciseId, settings)
      if (updated) replaceList(updated)
      return updated
    } catch (err) {
      console.error(err)
      showError(t("errors.updateRest"))
      return null
    }
  }

  const handleAddExerciseToList = async (listId, exerciseId) => {
    try {
      const updated = await addExerciseToList(listId, exerciseId)
      if (updated) replaceList(updated)
      return updated
    } catch (err) {
      console.error(err)
      showError(t("errors.addExercise"))
      return null
    }
  }

  const handleSaveDirect = async () => {
    if (!authenticated) {
      goLogin()
      return
    }
    if (!pendingAddList || !selectedExercise) return
    const updated = await handleAddExerciseToList(pendingAddList.id, selectedExercise.id)
    if (updated) {
      const list = updated.name || pendingAddList.name
      setPendingAddList({ id: updated.id, name: list })
      setLastAdded({ exerciseName: selectedExercise.name })
    }
  }

  const pendingAddExerciseIds = useMemo(() => {
    if (!pendingAddList) return new Set()
    const target = workoutLists.find((l) => l.id === pendingAddList.id)
    if (!target) return new Set()
    return new Set(target.exercises.map((ex) => ex.id))
  }, [pendingAddList, workoutLists])

  const handleCardSave = async (exercise) => {
    if (!authenticated) {
      goLogin()
      return
    }
    if (!pendingAddList || !workoutLists.some((l) => l.id === pendingAddList.id)) {
      setSaveTarget(exercise)
      return
    }
    if (pendingAddExerciseIds.has(exercise.id)) {
      setLastAdded({ exerciseName: exercise.name })
      return
    }
    const updated = await handleAddExerciseToList(pendingAddList.id, exercise.id)
    if (updated) {
      const list = updated.name || pendingAddList.name
      setPendingAddList({ id: updated.id, name: list })
      setLastAdded({ exerciseName: exercise.name })
    }
  }

  const handleOpenFromWorkout = (snapshot) => {
    const full = findExercise(exercises || [], snapshot.id) || snapshot
    setSelectedExercise(full)
  }

  const handleCreateList = async (name) => {
    if (!authenticated) {
      goLogin()
      return { status: "auth" }
    }
    const trimmed = typeof name === "string" ? name.trim() : ""
    if (!trimmed) return { status: "empty" }
    const clientExisting = findListByNameInsensitive(trimmed)
    if (clientExisting) {
      const conflict = resolveCreateConflict(trimmed, null)
      if (conflict) return conflict
    }
    try {
      const list = await createWorkoutList(trimmed)
      setWorkoutLists((prev) => [list, ...prev])
      return { status: "created", list }
    } catch (err) {
      console.error(err)
      if (err?.status === 409) {
        const conflict = resolveCreateConflict(trimmed, err.existing || null)
        if (conflict) return conflict
      }
      showError(err?.status === 409 ? err.message : t("errors.createList"))
      return { status: "error" }
    }
  }

  const handleCreateListFromSave = async (name) => {
    if (!authenticated) {
      goLogin()
      return { status: "auth" }
    }
    const trimmed = typeof name === "string" ? name.trim() : ""
    if (!trimmed) return { status: "empty" }
    const clientExisting = findListByNameInsensitive(trimmed)
    if (clientExisting) {
      // Save flow: exact duplicates auto-add silently (no toast, no question).
      const conflict = resolveCreateConflict(trimmed, null, { silentExact: true })
      if (conflict) return conflict
    }
    try {
      const list = await createWorkoutList(trimmed, saveTarget?.id)
      setWorkoutLists((prev) => [list, ...prev])
      return { status: "created", list, id: list.id }
    } catch (err) {
      console.error(err)
      if (err?.status === 409) {
        const conflict = resolveCreateConflict(trimmed, err.existing || null, { silentExact: true })
        if (conflict) return conflict
      }
      showError(err?.status === 409 ? err.message : t("errors.createList"))
      return { status: "error" }
    }
  }

  const handleRenameList = async (id, newName) => {
    const trimmed = typeof newName === "string" ? newName.trim() : ""
    if (!trimmed) return null
    try {
      const updated = await renameWorkoutList(id, trimmed)
      replaceList(updated)
      return updated
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.renameList"))
      return null
    }
  }

  const handleAddToList = async (listId) => {
    if (!authenticated) {
      goLogin()
      return
    }
    if (!saveTarget) return
    try {
      const updated = await addExerciseToList(listId, saveTarget.id)
      if (updated) replaceList(updated)
    } catch (err) {
      console.error(err)
      showError(t("errors.addExercise"))
    }
  }

  const handleRemoveList = async (id) => {
    try {
      await deleteWorkoutList(id)
      setWorkoutLists((prev) => prev.filter((l) => l.id !== id))
      setEditingListId((prev) => (prev === id ? null : prev))
      // Sessions survive in the journal; drop a stale journal filter.
      setJournalFilterListId((prev) => (prev === id ? "all" : prev))
    } catch (err) {
      console.error(err)
      showError(t("errors.deleteList"))
    }
  }

  const handleRemoveExercise = async (listId, exerciseId) => {
    try {
      const updated = await removeExerciseFromList(listId, exerciseId)
      if (updated) replaceList(updated)
    } catch (err) {
      console.error(err)
      showError(t("errors.removeExercise"))
    }
  }

  const handleCloseDetail = () => setSelectedExercise(null)

  const handleStartSession = async (list) => {
    if (!authenticated) {
      goLogin()
      return
    }
    try {
      setStartingSession(true)
      setFinishAttempted(false)
      const session = await createSession(list.id)
      setActiveSession(session)
      setActiveSessionList(list)
      setView("session")
    } catch (err) {
      console.error(err)
      showError(t("errors.startSession"))
    } finally {
      setStartingSession(false)
    }
  }

  const handleLogSet = async (sessionId, exerciseId, setNumber, reps, weight, weightUnit, rir = null, effortScale) => {
    try {
      const updated = await logSet(sessionId, exerciseId, setNumber, reps, weight, weightUnit, rir, effortScale ?? user?.effortScale ?? "rir")
      if (updated) setActiveSession(updated)
    } catch (err) {
      console.error(err)
      showError(t("errors.logSet"))
    }
  }

  const handleUpdateSet = async (sessionId, setId, { reps, weight, weightUnit, rir, effortScale }) => {
    try {
      const updated = await updateSet(sessionId, setId, { reps, weight, weightUnit, rir, effortScale })
      if (updated) setActiveSession(updated)
    } catch (err) {
      console.error(err)
      showError(t("errors.updateSet"))
    }
  }

  const handleDeleteSet = async (sessionId, setId) => {
    try {
      const updated = await deleteSet(sessionId, setId)
      if (updated) setActiveSession(updated)
    } catch (err) {
      console.error(err)
      showError(t("errors.deleteSet"))
    }
  }

  const handleFinishSession = async (sessionId) => {
    const sets = activeSession?.id === sessionId ? activeSession.sets || [] : []
    const pre = classifySets(sets)
    if (pre.invalidIds.length > 0) {
      setFinishAttempted(true)
      showError(t("errors.needsReps", { count: pre.invalidIds.length }))
      return
    }
    if (pre.validCount === 0) {
      setFinishAttempted(true)
      showError(t("errors.noSets"))
      return
    }
    try {
      const updated = await completeSession(sessionId)
      setFinishAttempted(false)
      setSessionTick((n) => n + 1)
      if (updated) {
        setSummarySession(updated)
        setSummaryList(activeSessionList)
        setView("summary")
      } else {
        setView("workouts")
      }
      setActiveSession(null)
      setActiveSessionList(null)
    } catch (err) {
      console.error(err)
      if (err?.code === "INCOMPLETE_SETS" || err?.code === "EMPTY_SESSION") {
        setFinishAttempted(true)
        showError(err.message || t("errors.incompleteSets"))
      } else {
        showError(t("errors.finishSession"))
      }
    }
  }

  const handleDoneSummary = () => {
    setSummarySession(null)
    setSummaryList(null)
    setView("workouts")
  }

  const handleSummaryHistory = () => {
    if (summaryList) {
      setSummarySession(null)
      handleShowHistory(summaryList)
      setSummaryList(null)
    }
  }

  const handleShowHistory = async (list) => {
    try {
      const sessions = await fetchSessionsForList(list.id)
      setHistorySessions(sessions)
      setHistoryList(list)
      setHistoryReturnView("workouts")
      setView("history")
    } catch (err) {
      console.error(err)
      showError(t("errors.loadSessions"))
    }
  }

  const handleOpenJournalSession = (session) => {
    const list = workoutLists.find((l) => l.id === session.listId) || {
      id: session.listId,
      name: session.listName || t("common.deletedWorkout"),
      exercises: [],
    }
    setHistoryList(list)
    setHistorySessions(allSessions.filter((s) => s.listId === session.listId))
    setHistorySummarySession(session)
    setHistoryReturnView("journal")
    setView("history-summary")
  }

  const handleBackFromSession = () => {
    setFinishAttempted(false)
    setView("workouts")
    setActiveSession(null)
    setActiveSessionList(null)
  }

  const handleBackFromHistory = () => {
    setView("workouts")
    setHistorySessions([])
    setHistoryList(null)
    setHistorySummarySession(null)
  }

  const handleOpenHistorySummary = (session) => {
    setHistorySummarySession(session)
    setHistoryReturnView("history")
    setView("history-summary")
  }

  const handleBackFromHistorySummary = () => {
    setHistorySummarySession(null)
    setView(historyReturnView === "journal" ? "journal" : "history")
  }

  const handleDeleteHistorySession = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      setHistorySessions((prev) => prev.filter((s) => s.id !== sessionId))
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setSessionTick((n) => n + 1)
      if (historySummarySession?.id === sessionId) {
        setHistorySummarySession(null)
        setView(historyReturnView === "journal" ? "journal" : "history")
      }
    } catch (err) {
      console.error(err)
      showError(t("errors.deleteSession"))
    }
  }

  const handleClearHistorySessions = async () => {
    if (!historyList) return
    try {
      await clearSessionsForList(historyList.id)
      setHistorySessions([])
      setAllSessions((prev) => prev.filter((s) => s.listId !== historyList.id))
      setSessionTick((n) => n + 1)
      setHistorySummarySession(null)
    } catch (err) {
      console.error(err)
      showError(t("errors.clearSessions"))
    }
  }

  const handleAuth = (token, authedUser) => {
    setToken(token)
    setUser(authedUser)
    setView("home")
    setSelectedExercise(null)
    fetchWorkoutLists().then(setWorkoutLists).catch((err) => console.error("Failed to refresh lists", err))
  }

  const handleOpenCustomInEdit = (list) => {
    if (!authenticated) {
      goLogin()
      return
    }
    if (!list || !workoutLists.some((l) => l.id === list.id)) return
    setCustomFormListId(list.id)
    setShowCustomForm(true)
  }

  const handleCloseCustomForm = () => {
    setShowCustomForm(false)
    setCustomFormListId(null)
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    // Drop the cached account language so the guest UI follows the browser.
    clearStoredLanguage()
    setFinishAttempted(false)
    setWorkoutLists([])
    setAllSessions([])
    setPendingAddList(null)
    setLastAdded(null)
    setEditingListId(null)
    setShowCustomForm(false)
    setCustomFormListId(null)
    setExercises(null)
    setActiveSession(null)
    setActiveSessionList(null)
    setHistorySessions([])
    setHistoryList(null)
    setHistorySummarySession(null)
    setSummarySession(null)
    setSummaryList(null)
    setWeighIns(null)
    setView("home")
    setSearchQuery("")
  }

  const handleUpdateProfile = async ({ email, gender, name, bodyweight, bodyweightUnit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language }) => {
    try {
      const { user: updated } = await updateProfile({ email, gender, name, bodyweight, bodyweightUnit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language })
      if (updated) setUser(updated)
      return updated
    } catch (err) {
      console.error(err)
      if (email !== undefined) showError(err?.status === 409 ? t("errors.emailTaken") : t("account.failedEmail"))
      else if (name !== undefined) showError(t("account.failedName"))
      else if (bodyweight !== undefined) showError(err?.message || t("account.failedBodyweight"))
      else if (effortScale !== undefined) showError(err?.message || t("account.failedEffort"))
      else if (timerSound !== undefined || timerPlaySound !== undefined || timerVibrate !== undefined || timerFlash !== undefined) showError(err?.message || t("timer.failed"))
      else if (language !== undefined) showError(err?.message || t("account.failedLanguage"))
      else showError(t("account.failedGender"))
      throw err
    }
  }

  const sortWeighIns = (list) => [...(list || [])].sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt))

  const handleLogWeighIn = async ({ weight, unit, loggedAt }) => {
    setSavingWeighIn(true)
    try {
      const { entry, user: updated } = await logWeighIn({ weight, unit, loggedAt })
      if (updated) setUser(updated)
      setWeighIns((prev) => sortWeighIns([...(prev || []), entry]))
      return entry
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.logWeighIn"))
      throw err
    } finally {
      setSavingWeighIn(false)
    }
  }

  const handleDeleteWeighIn = async (id) => {
    try {
      const { user: updated } = await deleteWeighIn(id)
      if (updated) setUser(updated)
      setWeighIns((prev) => (prev || []).filter((w) => w.id !== id))
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.deleteWeighIn"))
      throw err
    }
  }

  const handleSetTargetWeight = async (targetWeight) => {
    setSavingWeighIn(true)
    try {
      const { user: updated } = await setTargetWeight(targetWeight)
      if (updated) setUser(updated)
      return updated
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.saveGoal"))
      throw err
    } finally {
      setSavingWeighIn(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.deleteAccount"))
      throw err
    }
    handleLogout()
  }

  const editingList = useMemo(
    () => workoutLists.find((l) => l.id === editingListId) || null,
    [workoutLists, editingListId],
  )

  if (!authLoaded) {
    return (
      <div className="app">
        <div className="app-body">
          <main className="app-main">
            <section className="loading">
              <span className="spinner" aria-hidden="true"></span> {t("nav.loading")}
            </section>
          </main>
        </div>
      </div>
    )
  }

  const protectedViews = ["workouts", "journal", "balance", "structural-balance", "session", "summary", "history", "history-summary", "account", "timer-alerts"]
  const showAuthGate = !authenticated && (view === "auth" || protectedViews.includes(view))

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    if (view === "home" && value.trim() !== "") setView("planner")
  }

  const handleNavigate = (next) => {
    if (next === "workouts" || next === "journal" || next === "balance") requireAuthOrGo(next)
    else { setView(next); setSelectedExercise(null) }
  }

  const handleTabNavigate = (tab) => {
    if (tab === "home") { setView("home"); setSelectedExercise(null) }
    else if (tab === "planner") { setView("planner"); setSelectedExercise(null) }
    else if (tab === "workouts") requireAuthOrGo("workouts")
    else if (tab === "journal") requireAuthOrGo("journal")
    else if (tab === "balance") requireAuthOrGo("balance")
  }

  const tabId = view === "home" ? "home"
    : view === "planner" ? "planner"
      : view === "journal" || (view === "history-summary" && historyReturnView === "journal") ? "journal"
        : view === "balance" || view === "structural-balance" ? "balance"
          : view === "workouts" || view === "session" || view === "summary" || view === "history" || view === "history-summary" ? "workouts"
            : "home"

  const banner = pendingAddList && view !== "session" ? (
    <PickBanner
      listName={pendingAddList.name}
      addedExerciseName={lastAdded?.exerciseName ?? null}
      onDone={handleFinishAddExercise}
      onCancel={handleCancelAddExercise}
    />
  ) : null

  const librarySidebar = exercises && !showAuthGate ? (
    <ExerciseLibrary
      hierarchy={hierarchy}
      exercises={exercises}
      selectedCategory={selected?.category || null}
      selectedTarget={selected?.target || null}
      onSelectCategory={handleSelectCategory}
      onSelectTarget={handleSelectTarget}
      onSelectExercise={handleSelectExercise}
      recentTouched={recentRows.touched}
      recentUnexplored={recentRows.unexplored}
      recentLoading={recentLoading}
      onRequestRecent={() => setRecentRequested(true)}
      sortByAlpha={sortAlpha}
      sortByDifficulty={sortByDifficulty}
    />
  ) : null

  let body
  if (showAuthGate) {
    body = <AuthPage banner={banner} authMode={authMode} onAuth={handleAuth} onBack={goHome} />
  } else if (selectedExercise) {
    body = (
      <AuthTemplate banner={banner}>
        <MovementDetail
          exercise={selectedExercise}
          onBack={handleCloseDetail}
          onSave={pendingAddList ? handleSaveDirect : () => setSaveTarget(selectedExercise)}
          saveLabel={pendingAddList ? `Add to "${pendingAddList.name}"` : undefined}
          onUpdateExercise={handleUpdateExercise}
          onDeleteExercise={handleDeleteExercise}
        />
      </AuthTemplate>
    )
  } else if (view === "session" && activeSession && activeSessionList) {
    body = (
      <SessionPage
        banner={banner}
        sidebar={librarySidebar}
        list={activeSessionList}
        session={activeSession}
        effortScale={user?.effortScale || "rir"}
        timerSound={resolveAlertSound(user?.timerPlaySound ?? 1, user?.timerSound || "beep")}
        timerVibrate={user?.timerVibrate ?? 1}
        timerFlash={user?.timerFlash ?? 0}
        invalidSetIds={invalidFinishIds}
        onLogSet={handleLogSet}
        onUpdateSet={handleUpdateSet}
        onDeleteSet={handleDeleteSet}
        onFinish={handleFinishSession}
        onBack={handleBackFromSession}
      />
    )
  } else if (view === "summary" && summarySession && summaryList) {
    body = (
      <SummaryPage
        banner={banner}
        sidebar={librarySidebar}
        list={summaryList}
        session={summarySession}
        previousSessions={allSessions}
        gender={user?.gender ?? null}
        onDone={handleDoneSummary}
        onHistory={handleSummaryHistory}
      />
    )
  } else if (view === "history" && historyList) {
    body = (
      <HistoryPage
        banner={banner}
        sidebar={librarySidebar}
        list={historyList}
        sessions={historySessions}
        onBack={handleBackFromHistory}
        onOpenSummary={handleOpenHistorySummary}
        onDeleteSession={handleDeleteHistorySession}
        onClearAll={handleClearHistorySessions}
      />
    )
  } else if (view === "history-summary" && historySummarySession && historyList) {
    body = (
      <SummaryPage
        banner={banner}
        sidebar={historyReturnView === "journal" ? null : librarySidebar}
        list={historyList}
        session={historySummarySession}
        mode="history"
        heroTitle={historyList.name}
        previousSessions={historySessions}
        gender={user?.gender ?? null}
        onBack={handleBackFromHistorySummary}
      />
    )
  } else if (view === "workouts") {
    body = (
      <WorkoutsPage
        banner={banner}
        workoutLists={workoutLists}
        recovery={recovery}
        recoveryLoading={recoveryLoading}
        startingSession={startingSession}
        onRemoveList={handleRemoveList}
        onOpenExercise={handleOpenFromWorkout}
        onCreateList={handleCreateList}
        onRenameList={handleRenameList}
        onEditWorkout={handleEditWorkout}
        onStartSession={handleStartSession}
        onHistory={handleShowHistory}
        onSelectMuscle={handleSelectMuscle}
      />
    )
  } else if (view === "journal") {
    body = (
      <JournalPage
        banner={banner}
        sessions={journalSessions}
        workoutLists={workoutLists}
        filterListId={journalFilterListId}
        onFilterChange={setJournalFilterListId}
        selectedDateKey={journalDateKey}
        onSelectDate={setJournalDateKey}
        onOpenSession={handleOpenJournalSession}
        loading={journalLoading}
        weighIns={weighIns}
        weightUnit={user?.bodyweightUnit || "kg"}
        user={user}
        weighInsLoading={weighIns === null}
        showEffort={showEffort}
        savingWeighIn={savingWeighIn}
        effortScale={user?.effortScale || "rir"}
        onLogWeighIn={handleLogWeighIn}
        onDeleteWeighIn={handleDeleteWeighIn}
        onSetGoal={handleSetTargetWeight}
      />
    )
  } else if (view === "account") {
    body = (
      <AccountPage
        key={`${user?.id ?? "account"}-${user?.name ?? ""}-${user?.email ?? ""}-${user?.gender ?? ""}-${user?.bodyweight ?? ""}-${user?.bodyweightUnit ?? ""}-${user?.effortScale ?? ""}-${user?.timerSound ?? ""}-${user?.timerPlaySound ?? ""}-${user?.timerVibrate ?? ""}-${user?.timerFlash ?? ""}`}
        banner={banner}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
        onOpenTimerAlerts={() => { setSelectedExercise(null); setView("timer-alerts") }}
      />
    )
  } else if (view === "timer-alerts") {
    body = (
      <TimerAlertsPage
        key={`${user?.id ?? "timer-alerts"}-${user?.timerSound ?? ""}-${user?.timerPlaySound ?? ""}-${user?.timerVibrate ?? ""}-${user?.timerFlash ?? ""}`}
        banner={banner}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onBack={() => { setSelectedExercise(null); setView("account") }}
      />
    )
  } else if (view === "balance" || view === "structural-balance") {
    body = (
      <BalancePage
        banner={banner}
        mode={view === "structural-balance" ? "structural" : "balance"}
        sessions={allSessions}
        exercises={exercises || []}
        user={user}
        bodyweightKg={profileBodyweightKg(user) || 0}
        gender={user?.gender}
        onOpenStructural={() => { setSelectedExercise(null); setView("structural-balance") }}
        onBackToBalance={() => setView("balance")}
      />
    )
  } else if (view === "home") {
    body = (
      <HomePage
        banner={banner}
        searchQuery={searchQuery}
        searching={searching}
        onSearchChange={handleSearchChange}
        onClearSearch={() => setSearchQuery("")}
      />
    )
  } else {
    body = (
      <PlannerPage
        banner={banner}
        searching={searching}
        exercises={exercises}
        searchResults={searchResults}
        searchQuery={searchQuery}
        selectedTarget={selectedTarget}
        selectedCategory={selectedCategory}
        pendingAddList={pendingAddList}
        pendingAddExerciseIds={pendingAddExerciseIds}
        hierarchy={hierarchy}
        selected={selected}
        recentRows={recentRows}
        recentLoading={recentLoading}
        onSelectExercise={handleSelectExercise}
        onSaveExercise={handleCardSave}
        onClearSearch={() => setSearchQuery("")}
        onQueryChange={handleSearchChange}
        onSelectCategory={handleSelectCategory}
        onSelectTarget={handleSelectTarget}
        onRequestRecent={() => setRecentRequested(true)}
        sortAlpha={sortAlpha}
        sortByDifficulty={sortByDifficulty}
        onToggleSortAlpha={() => setSortAlpha((p) => !p)}
        onToggleSortByDifficulty={() => setSortByDifficulty((p) => !p)}
      />
    )
  }

  const overlays = (
    <>
      {saveTarget && authenticated && (
        <SavePanel
          exercise={saveTarget}
          workoutLists={workoutLists}
          onAddToList={handleAddToList}
          onCreateList={handleCreateListFromSave}
          onRenameList={handleRenameList}
          onClose={() => setSaveTarget(null)}
        />
      )}
      {showCustomForm && authenticated && (
        <CustomExerciseForm
          hierarchy={hierarchy}
          equipments={equipments}
          onCreate={handleCreateExercise}
          onClose={handleCloseCustomForm}
        />
      )}
      {editingList && !pendingAddList && (
        <EditWorkoutView
          list={editingList}
          onClose={handleCloseEditWorkout}
          onAddExercise={handleEditAddExercise}
          onCreateCustom={handleOpenCustomInEdit}
          onRemoveExercise={handleRemoveExercise}
          onUpdateSettings={handleUpdateWorkoutSettings}
        />
      )}
    </>
  )

  return (
    <AppShell
      header={(
        <AppHeader
          view={view}
          historyReturnView={historyReturnView}
          authenticated={authenticated}
          userName={user?.name?.trim() || "user"}
          theme={theme}
          onGoHome={goHome}
          onNavigate={handleNavigate}
          onLogin={goLogin}
          onOpenAccount={() => { setView("account"); setSelectedExercise(null) }}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
      )}
      body={body}
      tabBar={(
        <MobileTabBar active={tabId} onNavigate={handleTabNavigate} />
      )}
      overlays={overlays}
      error={error}
      onDismissError={() => setError(null)}
    />
  )
}
