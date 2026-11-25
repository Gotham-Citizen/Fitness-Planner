import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { useLeaveGuard, useThemeFavicon } from "../hooks/index.js"

import { CustomExerciseForm, LeavePrompt, MobileTabBar, PickBanner, SavePanel } from "../components/molecules/index.js"
import { AppHeader, EditWorkoutView, ExerciseLibrary, MovementDetail } from "../components/organisms/index.js"
import { PlanScheduleView } from "../components/organisms/PlanScheduleView/PlanScheduleView.jsx"
import { QuestionnaireView } from "../components/organisms/QuestionnaireView/QuestionnaireView.jsx"
import { AppShell, AuthTemplate } from "../components/templates/index.js"

import { AccountPage } from "./AccountPage/AccountPage.jsx"
import { AuthPage } from "./AuthPage/AuthPage.jsx"
import { BalancePage } from "./BalancePage/BalancePage.jsx"
import { HistoryPage } from "./HistoryPage/HistoryPage.jsx"
import { HomePage } from "./HomePage/HomePage.jsx"
import { JournalPage } from "./JournalPage/JournalPage.jsx"
import { PersonalRecordsPage } from "./PersonalRecordsPage/PersonalRecordsPage.jsx"
import { PlannerPage } from "./PlannerPage/PlannerPage.jsx"
import { SessionPage } from "./SessionPage/SessionPage.jsx"
import { SummaryPage } from "./SummaryPage/SummaryPage.jsx"
import { TimerAlertsPage } from "./TimerAlertsPage/TimerAlertsPage.jsx"
import { WorkoutHistoryPage } from "./WorkoutHistoryPage/WorkoutHistoryPage.jsx"
import { WorkoutsPage } from "./WorkoutsPage/WorkoutsPage.jsx"

import {   addExerciseToList,
  clearSessionsForList,
  completeSession,
  createExercise,
  createSession,
  createWorkoutList,
  createWorkoutListWithExercises,
  deleteAccount,
  deleteExercise,
  deleteSession,
  deleteSet,
  deleteWeighIn,
  deleteWorkoutList,
  fetchAllSessions as fetchAllUserSessions,
  fetchExercise,
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
reorderWorkoutListExercises,
  saveQuestionnaire,
  setTargetWeight,
  setToken,
  updateExercise,
  updateProfile,
  updateSet,
  updateWorkoutExerciseSettings } from "../lib/api.js"
import { profileBodyweightKg } from "../lib/bodyweight.js"
import { todayKeyLocal } from "../lib/journal.js"
import { buildHierarchy, exerciseName, findExercise, searchExercises, titleCase } from "../lib/muscles.js"
import { generatePlan } from "../lib/planGenerator.js"
import { presetName } from "../lib/presets/index.js"
import { appendViewedTarget, buildRecentRows, loadViewedTargets } from "../lib/recent.js"
import { computeRecovery } from "../lib/recovery.js"
import { nextOccurrenceISO } from "../lib/schedule.js"
import { classifySets } from "../lib/setValidation.js"
import { resolveAlertSound } from "../lib/timerAlert.js"
import { clearStoredLanguage, persistLanguage, storedLanguage } from "../utils/i18n.js"
import { normalizeLang } from "../utils/locale.js"
import { isValidTheme, loadStoredTheme, persistTheme, THEMES, themeScheme } from "../utils/themes.js"

import "./App.css"

export const App = () => {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState(loadStoredTheme)
  const [focusSearchOnNextPlanner, setFocusSearchOnNextPlanner] = useState(false)
  const clearFocusOnNextPlanner = useCallback(
    () => setFocusSearchOnNextPlanner(false),
    [],
  )
  const [authLoaded, setAuthLoaded] = useState(!getToken())
  const [user, setUser] = useState(null)
  const [exercises, setExercises] = useState(null)
  const [workoutLists, setWorkoutLists] = useState([])
  const [view, setView] = useState("home")
  const [plannerTab, setPlannerTab] = useState("exercises")
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
  const [historySummaryList, setHistorySummaryList] = useState(null)
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
  const [questionnaireReturnView, setQuestionnaireReturnView] = useState("account")
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false)
  const bwBackfillFor = useRef({})
  const errorTimerRef = useRef(null)

  // Every entry into the planner that means "browse movements" resets the tab;
  // only the Browse programs button opens the Programs tab directly.
  const openPlannerExercises = () => {
    setPlannerTab("exercises")
    setView("planner")
  }
  // 从 Journal 跳出到 personal-records / workout-history / 单条 session
  // 详情之前，记下滚动位置；回到 journal 且内容就绪后再滚回去。
  const journalScrollRef = useRef({ window: 0, main: 0 })
  const shouldRestoreJournalScrollRef = useRef(false)

  const showError = useCallback((msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (msg) {
      setError(msg)
      errorTimerRef.current = setTimeout(() => setError(null), 5000)
    } else {
      setError(null)
    }
  }, [])

  // Library rows omit instruction bodies; fetch them only when a movement opens.
  const withExerciseDetails = useCallback(async (ex) => {
    if (!ex || (ex.instructions && ex.instruction_steps)) return ex
    try {
      const full = await fetchExercise(ex.id)
      return { ...ex, ...full }
    } catch (err) {
      console.error("Failed to load exercise detail", err)
      showError(t("errors.loadExercises"))
      return ex
    }
  }, [showError, t])

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    // Light-themed components read this to adapt their colors.
    root.dataset.scheme = themeScheme(theme)
    persistTheme(theme)
  }, [theme])

  // Declared after the theme effect so the CSS variables already resolve to
  // the new palette when the favicon SVG is generated.
  useThemeFavicon(theme)

  useEffect(() => {
    if (!getToken()) {
      clearStoredLanguage()
      return
    }
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
      document.documentElement.lang = next
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

  const handleCreateExercise = async ({ name, category, target, equipment, gifUrl, instructionSteps,
  instructions,
  instructionsLang, }) => {
    if (!authenticated) {
      goLogin()
      return null
    }
    const ex = await createExercise({ name, category, target, equipment, gifUrl, instructionSteps, instructions, instructionsLang, })
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
    openPlannerExercises()
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
    if ((view !== "workouts" && view !== "journal" && view !== "balance" && view !== "structural-balance" && view !== "personal-records") || recoveryKey === recoveryCacheKey) return
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

  // 从 Journal 跳出前记录滚动位置（window 与可能独立滚动的 #main-content 都覆盖）。
  const saveJournalScroll = () => {
    if (typeof window === "undefined") return
    const main = document.getElementById("main-content")
    journalScrollRef.current = {
      window: window.scrollY || window.pageYOffset || 0,
      main: main?.scrollTop || 0,
    }
    shouldRestoreJournalScrollRef.current = true
  }

  // 回到 journal 后，等 sessions / weigh-ins 就绪、JournalPage 渲染完成
  // （双 rAF 等一帧布局）再把滚动位置恢复回去，避免被截断到顶部附近。
  useLayoutEffect(() => {
    if (view !== "journal") return
    if (!shouldRestoreJournalScrollRef.current) return
    if (journalLoading) return
    if (weighIns === null) return
    const { window: wy, main: my } = journalScrollRef.current
    shouldRestoreJournalScrollRef.current = false
    if (wy === 0 && my === 0) return
    let raf1, raf2
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (wy > 0) window.scrollTo(0, wy)
        const main = document.getElementById("main-content")
        if (main && my > 0) main.scrollTop = my
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [view, journalLoading, weighIns])

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

  const findListByNameInsensitive = (name, ignoreId = null) => {
    const lowered = name.trim().toLowerCase()
    return workoutLists.find((l) => l.id !== ignoreId && l.name.toLowerCase() === lowered) || null
  }

  const resolveCreateConflict = (trimmed, serverExisting, { silentExact = false, ignoreId = null } = {}) => {
    const existing = serverExisting
      ? workoutLists.find((l) => l.id === serverExisting.id) || {
          id: serverExisting.id,
          name: serverExisting.name,
        }
      : findListByNameInsensitive(trimmed, ignoreId)
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
    openPlannerExercises()
    setSelectedExercise(null)
    setSelected({ category, target })
    logViewedTarget(category, target)
    setSortAlpha(false)
    setSortByDifficulty(false)
  }

  const handleSelectCategory = (category) => {
    openPlannerExercises()
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

  // M6 — equipment scope selection from the library's Equipment tab.
  const handleSelectEquipment = (equipment) => {
    openPlannerExercises()
    setSelectedExercise(null)
    setSelected(equipment ? { equipment } : null)
    setSortAlpha(false)
    setSortByDifficulty(false)
  }

  const handleSelectMuscle = (category, target) => {
    setSearchQuery("")
    handleSelectTarget(category, target)
  }

  const handleSelectExercise = async (ex) => {
    if (!ex) return
    openPlannerExercises()
    setSelectedExercise(ex)
    if (ex.category && ex.target) logViewedTarget(ex.category, ex.target)
    const full = await withExerciseDetails(ex)
    if (full !== ex) setSelectedExercise((prev) => (prev && prev.id === ex.id ? full : prev))
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
    openPlannerExercises()
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

  // C2 — persist drag/arrow reorders. Optimistic, rollback on failure.
  const handleReorderExercises = async (listId, order) => {
    const previous = workoutLists
    setWorkoutLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list
        const byId = new Map(list.exercises.map((ex) => [ex.id, ex]))
        const reordered = order.map((id) => byId.get(id)).filter(Boolean)
        return { ...list, exercises: reordered }
      }),
    )
    try {
      await reorderWorkoutListExercises(listId, order)
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.updateRest"))
      setWorkoutLists(previous)
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
      setLastAdded({ exercise: selectedExercise })
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
      setLastAdded({ exercise })
      return
    }
    const updated = await handleAddExerciseToList(pendingAddList.id, exercise.id)
    if (updated) {
      const list = updated.name || pendingAddList.name
      setPendingAddList({ id: updated.id, name: list })
      setLastAdded({ exercise })
    }
  }

  const handleOpenFromWorkout = async (snapshot) => {
    const base = findExercise(exercises || [], snapshot.id) || snapshot
    setSelectedExercise(base)
    const full = await withExerciseDetails(base)
    if (full !== base) setSelectedExercise((prev) => (prev && prev.id === base.id ? full : prev))
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

  // M6 — add a preset as a new workout list. Uses only APIs with known
  // signatures; the preset shape ({ name, exerciseIds | exercises }) is
  // tolerant of a string-id array or an array of exercise objects.
  const handleAddPreset = async (preset) => {
    if (!authenticated) {
      goLogin()
      return null
    }
    // Preset names are localized objects ({ en, zh, es }); the API needs a
    // plain localized string or it rejects the request as "name is required".
    const name = typeof preset?.name === "string"
      ? preset.name.trim()
      : presetName(preset, normalizeLang(i18n.language)).trim()
    if (!name) return null
    try {
      const ids = (preset.exerciseIds ?? preset.exercises ?? [])
        .map((ex) => (typeof ex === "string" ? ex : ex?.id))
        .filter(Boolean)
      if (ids.length === 0) {
        const list = await createWorkoutList(name)
        setWorkoutLists((prev) => [list, ...prev])
        return list
      }
      const list = await createWorkoutList(name, ids[0])
      for (let i = 1; i < ids.length; i++) {
        try {
          await addExerciseToList(list.id, ids[i])
        } catch (err) {
          console.error("handleAddPreset: failed to add", ids[i], err)
        }
      }
      const fresh = await fetchWorkoutLists()
      setWorkoutLists(fresh)
      return list
    } catch (err) {
      console.error("handleAddPreset failed", err)
      showError(err?.message || t("errors.createList"))
      return null
    }
  }

  const handleRenameList = async (id, newName, { checkConflict = false, ignoreId = null } = {}) => {
    const trimmed = typeof newName === "string" ? newName.trim() : ""
    if (!trimmed) return null
    if (checkConflict) {
      const conflict = resolveCreateConflict(trimmed, null, {
        silentExact: true,
        ignoreId,
      })
      if (conflict) return conflict
    }
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

  // History summaries need exercise metadata for names, ranks and effort
  // settings. The all-sessions view uses a synthetic list with no exercises,
  // so resolve from saved lists and fall back to the exercise catalog.
  const resolveHistorySummaryList = (session) => {
    const saved = workoutLists.find((list) => list.id === session?.listId)
    const base = saved || {
      id: session?.listId || "__all",
      name: session?.listName || t("common.deletedWorkout"),
      exercises: [],
    }
    const byId = new Map()
    for (const exercise of base.exercises || []) byId.set(exercise.id, exercise)
    for (const exercise of exercises || []) {
      if (!byId.has(exercise.id)) byId.set(exercise.id, exercise)
    }
    return { ...base, exercises: Array.from(byId.values()) }
  }

  // M4 — all-sessions history. Uses a synthetic list so the shared
  // "history-summary" branch (which requires `historyList`) can render.
  const handleShowAllHistory = async () => {
    saveJournalScroll()
    try {
      const all = await fetchAllUserSessions()
      const sorted = [...all].sort((a, b) =>
        String(b.completedAt || "").localeCompare(String(a.completedAt || "")),
      )
      setHistorySessions(sorted)
      setHistoryList({
        id: "__all",
        name: t("journal.workoutHistory"),
        exercises: [],
      })
      setHistoryReturnView("workout-history")
      setView("workout-history")
    } catch (err) {
      console.error(err)
      showError(err?.message || t("errors.loadSessions"))
    }
  }

  const handleOpenJournalSession = (session) => {
    saveJournalScroll()
    const list = resolveHistorySummaryList(session)
    setHistoryList(list)
    setHistorySummaryList(list)
    setHistorySessions(allSessions.filter((s) => s.listId === session.listId))
    setHistorySummarySession(session)
    setHistoryReturnView("journal")
    setView("history-summary")
  }

  // Opens the full personal-records page from the journal view.
  const handleOpenPersonalRecords = () => {
    saveJournalScroll()
    setSelectedExercise(null)
    setView("personal-records")
  }

  // Opens the summary of the session a PR was set in. Returns to the
  // personal-records page (not the journal) so the user keeps their context.
  const handleOpenPersonalRecordsSession = (session) => {
    saveJournalScroll()
    const list = resolveHistorySummaryList(session)
    setHistoryList(list)
    setHistorySummaryList(list)
    setHistorySessions(allSessions.filter((s) => s.listId === session.listId))
    setHistorySummarySession(session)
    setHistoryReturnView("personal-records")
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
    setHistorySummaryList(null)
    setHistorySummarySession(null)
  }

  const handleOpenHistorySummary = (session, from = "history") => {
    setHistorySummarySession(session)
    setHistorySummaryList(resolveHistorySummaryList(session))
    setHistoryReturnView(from)
    setView("history-summary")
  }

  const handleBackFromHistorySummary = () => {
    setHistorySummarySession(null)
    setHistorySummaryList(null)
    if (historyReturnView === "journal") setView("journal")
    else if (historyReturnView === "personal-records") setView("personal-records")
    else if (historyReturnView === "workout-history") setView("workout-history")
    else setView("history")
  }

  const handleDeleteHistorySession = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      setHistorySessions((prev) => prev.filter((s) => s.id !== sessionId))
      setAllSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setSessionTick((n) => n + 1)
      if (historySummarySession?.id === sessionId) {
        setHistorySummarySession(null)
        if (historyReturnView === "journal") setView("journal")
        else if (historyReturnView === "personal-records") setView("personal-records")
        else if (historyReturnView === "workout-history") setView("workout-history")
        else setView("history")
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

  // Build workout lists from questionnaire answers and make the chosen
  // schedule (fixed week or repeating rotation) active. Shared by signup and
  // by the questionnaire retake. Existing lists stay in the library.
  const createStarterPlan = async (answers) => {
    try {
      const isRotation = answers?.scheduleMode === "rotation"
      const restDays = Math.min(6, Math.max(1, Number(answers?.restDays) || 1))
      // The catalog loads for guests too; refetch when it is missing so a
      // failed or in-flight initial load cannot produce an empty plan.
      const catalog = exercises?.length ? exercises : await fetchExercises()
      const plan = generatePlan(
        isRotation ? { ...answers, daysPerWeek: answers.workoutDays } : answers,
        catalog,
        i18n.language,
      )
      // Keep each created list paired with its intended weekday so a failed
      // list never shifts the remaining days onto the wrong schedule slots.
      const scheduled = []
      for (const [index, list] of plan.lists.entries()) {
        try {
          const created = await createWorkoutListWithExercises(list.name, list.exercises)
          scheduled.push({ weekday: plan.weekdays[index], id: created.id, list: created })
        } catch (err) {
          console.error("generatePlan: create list failed", list.name, err)
        }
      }
      if (scheduled.length > 0) {
        // Rotation stores one full cycle (workouts then rest) and repeats it
        // from today; fixed keeps the generated weekday slots.
        const schedule = isRotation
          ? {
              mode: "rotation",
              weekStartsOn: 0,
              rotation: [
                ...scheduled.map(({ id }) => ({ type: "workout", listId: id })),
                ...Array.from({ length: restDays }, () => ({ type: "rest" })),
              ],
              rotationStartedAt: nextOccurrenceISO(new Date().getDay()),
            }
          : {
              mode: "fixed",
              weekStartsOn: 0,
              fixed: Object.fromEntries(scheduled.map(({ weekday, id }) => [String(weekday), id])),
            }
        try {
          const { user: updated } = await updateProfile({ schedule })
          if (updated) setUser(updated)
        } catch (err) {
          console.error("generatePlan: save schedule failed", err)
        }
        // Seed immediately: an in-flight refetch may otherwise paint a stale
        // empty list before the new POSTs land.
        const fresh = scheduled.map(({ list }) => list)
        setWorkoutLists((prev) => [
          ...fresh,
          ...(prev || []).filter((l) => !fresh.some((f) => f.id === l.id)),
        ])
      }
    } catch (err) {
      console.error("generatePlan failed", err)
    }
  }

  // M7 — accept the signup mode and its options; generate starter lists
  // when the signup wizard asked for a plan.
  const handleAuth = async (token, authedUser, mode = "login", options = {}) => {
    setToken(token)
    setUser(authedUser)
    setView("home")
    setSelectedExercise(null)

    if (mode === "signup" && options?.generatePlan && options?.answers) {
      await createStarterPlan(options.answers)
    }

    try {
      const fresh = await fetchWorkoutLists()
      setWorkoutLists(fresh)
    } catch (err) {
      console.error("Failed to refresh lists", err)
    }
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

  const handlePickTheme = (next) => {
    if (isValidTheme(next)) setTheme(next)
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
    setHistorySummaryList(null)
    setHistorySummarySession(null)
    setSummarySession(null)
    setSummaryList(null)
    setWeighIns(null)
    setView("home")
    setSearchQuery("")
  }

  const handleUpdateProfile = async ({ email, gender, name, bodyweight, bodyweightUnit, unit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language, schedule }) => {
    try {
      const { user: updated } = await updateProfile({ email, gender, name, bodyweight, bodyweightUnit, unit, effortScale, timerSound, timerPlaySound, timerVibrate, timerFlash, language, schedule })
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
      else if (schedule !== undefined) showError(err?.message || t("schedule.failed"))
      else showError(t("account.failedGender"))
      throw err
    }
  }

  const handleUpdateQuestionnaire = async (answers) => {
    setSavingQuestionnaire(true)
    try {
      // `generatePlan` is a UI-only choice — the server stores answers only.
      const { generatePlan: shouldGeneratePlan, ...savedAnswers } = answers || {}
      const { user: updated } = await saveQuestionnaire(savedAnswers)
      if (updated) setUser(updated)
      if (shouldGeneratePlan) {
        await createStarterPlan(savedAnswers)
        try {
          const fresh = await fetchWorkoutLists()
          setWorkoutLists(fresh)
        } catch (err) {
          console.error("Failed to refresh lists", err)
        }
      }
      // Return to whichever view opened the questionnaire once everything is saved.
      setView(questionnaireReturnView)
      return updated
    } catch (err) {
      console.error(err)
      showError(err?.message || t("account.failedQuestionnaire"))
      throw err
    } finally {
      setSavingQuestionnaire(false)
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

  // Leave guard for the active session. Called before the early return for
  // !authLoaded (Rules of Hooks) and after handleBackFromSession is defined.
  const hasActiveSession = view === "session" && Boolean(activeSession?.id)
  const { requestLeave, leavePromptOpen, stay, leave } = useLeaveGuard(hasActiveSession, handleBackFromSession)

  if (!authLoaded) {
    return (
      <div className="app">
        <div className="app-body">
          <main className="app-main" id="main-content">
            <section className="loading">
              <span className="spinner" aria-hidden="true"></span> {t("nav.loading")}
            </section>
          </main>
        </div>
      </div>
    )
  }

  const protectedViews = [
    "workouts", "journal", "balance", "structural-balance", "session", "summary",
    "history", "history-summary", "workout-history", "account", "timer-alerts",
    "questionnaire", "plan-schedule", "personal-records",
  ]
  const showAuthGate = !authenticated && (view === "auth" || protectedViews.includes(view))

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    if (view === "home" && value.trim() !== "") {
      openPlannerExercises()
      setFocusSearchOnNextPlanner(true)
    }
  }

  const handleNavigate = (next) => {
    if (next === "workouts" || next === "journal" || next === "balance") requireAuthOrGo(next)
    else { setView(next); setSelectedExercise(null) }
  }

  const handleTabNavigate = (tab) => {
    if (tab === "home") { setView("home"); setSelectedExercise(null) }
    else if (tab === "planner") { openPlannerExercises(); setSelectedExercise(null) }
    else if (tab === "workouts") requireAuthOrGo("workouts")
    else if (tab === "journal") requireAuthOrGo("journal")
    else if (tab === "balance") requireAuthOrGo("balance")
  }

  // Every "leave the session" entry point goes through requestLeave: in-session
  // triggers the prompt; otherwise the action runs unchanged.
  const guardedTabNavigate = (tab) => requestLeave(() => handleTabNavigate(tab))
  const guardedNavigate = (next) => requestLeave(() => handleNavigate(next))
  const guardedGoHome = () => requestLeave(goHome)
  const guardedLogin = () => requestLeave(goLogin)
  const guardedOpenAccount = () =>
    requestLeave(() => { setView("account"); setSelectedExercise(null) })
  const guardedBackFromSession = () => requestLeave(handleBackFromSession)

  const tabId = view === "home" ? "home"
    : view === "planner" ? "planner"
      : view === "journal" || view === "personal-records" || view === "workout-history"
        || (view === "history-summary" && (historyReturnView === "journal" || historyReturnView === "personal-records" || historyReturnView === "workout-history")) ? "journal"
        : view === "balance" || view === "structural-balance" ? "balance"
          : view === "workouts" || view === "session" || view === "summary" || view === "history" || view === "history-summary" ? "workouts"
            : "home"

  const banner = pendingAddList && view !== "session" ? (
    <PickBanner
      listName={pendingAddList.name}
      addedExerciseName={lastAdded?.exercise
        ? exerciseName(lastAdded.exercise, normalizeLang(i18n.language))
        : null}
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
        defaultWeightUnit={user?.unit || "kg"}
        invalidSetIds={invalidFinishIds}
        onLogSet={handleLogSet}
        onUpdateSet={handleUpdateSet}
        onDeleteSet={handleDeleteSet}
        onFinish={handleFinishSession}
        onBack={guardedBackFromSession}
      />
    )
  } else if (view === "summary" && summarySession && summaryList) {
    body = (
      <SummaryPage
        banner={banner}
        sidebar={librarySidebar}
        list={summaryList}
        exercises={exercises} 
        session={summarySession}
        previousSessions={allSessions}
        gender={user?.gender ?? null}
        weightUnit={user?.unit || "kg"}
        onDone={handleDoneSummary}
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
  } else if (view === "workout-history") {
    body = (
      <WorkoutHistoryPage
        banner={banner}
        list={historyList}
        title={t("journal.workoutHistory")}
        sessions={historySessions}
        exercises={exercises || []}
        onBack={() => {
          setHistorySessions([])
          setHistoryList(null)
          setHistorySummaryList(null)
          setView("journal")
        }}
        onOpenSummary={(session) => handleOpenHistorySummary(session, "workout-history")}
        onDeleteSession={handleDeleteHistorySession}
      />
    )
  } else if (view === "history-summary" && historySummarySession && (historySummaryList || historyList)) {
    const summaryList = historySummaryList || historyList
    body = (
      <SummaryPage
        banner={banner}
        sidebar={historyReturnView === "journal" || historyReturnView === "personal-records" || historyReturnView === "workout-history" ? null : librarySidebar}
        list={summaryList}
        session={historySummarySession}
        mode="history"
        heroTitle={summaryList.name}
        previousSessions={historySessions}
        gender={user?.gender ?? null}
        weightUnit={user?.unit || "kg"}
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
        onAddExercises={handleEditAddExercise}
        onStartSession={handleStartSession}
        onHistory={handleShowHistory}
        onSelectMuscle={handleSelectMuscle}
        showGoalsPrompt={authenticated && !user?.questionnaire}
        onOpenQuestionnaire={() => {
          setQuestionnaireReturnView("workouts")
          setSelectedExercise(null)
          setView("questionnaire")
        }}
        onOpenPresets={() => {
          setPlannerTab("programs")
          setView("planner")
          setSelectedExercise(null)
        }}
      />
    )
  } else if (view === "journal") {
    body = (
      <JournalPage
        banner={banner}
        sessions={journalSessions}
        workoutLists={workoutLists}
        exercises={exercises || []}
        filterListId={journalFilterListId}
        onFilterChange={setJournalFilterListId}
        selectedDateKey={journalDateKey}
        onSelectDate={setJournalDateKey}
        onOpenSession={handleOpenJournalSession}
        onOpenHistory={handleShowAllHistory}
        onOpenPersonalRecords={handleOpenPersonalRecords}
        loading={journalLoading}
        weighIns={weighIns}
        weightUnit={user?.bodyweightUnit || "kg"}
        user={user}
        weighInsLoading={weighIns === null}
        savingWeighIn={savingWeighIn}
        effortScale={user?.effortScale || "rir"}
        onLogWeighIn={handleLogWeighIn}
        onDeleteWeighIn={handleDeleteWeighIn}
        onSetGoal={handleSetTargetWeight}
      />
    )
  } else if (view === "personal-records") {
    body = (
      <AuthTemplate banner={banner}>
        <PersonalRecordsPage
          sessions={allSessions}
          exercises={exercises || []}
          gender={user?.gender ?? null}
          weightUnit={user?.bodyweightUnit || "kg"}
          onOpenSession={handleOpenPersonalRecordsSession}
          onBack={() => setView("journal")}
        />
      </AuthTemplate>
    )
  } else if (view === "account") {
    body = (
      <AccountPage
        key={`${user?.id ?? "account"}-${user?.name ?? ""}-${user?.email ?? ""}-${user?.gender ?? ""}-${user?.bodyweight ?? ""}-${user?.bodyweightUnit ?? ""}-${user?.unit ?? ""}-${user?.effortScale ?? ""}-${user?.timerSound ?? ""}-${user?.timerPlaySound ?? ""}-${user?.timerVibrate ?? ""}-${user?.timerFlash ?? ""}`}
        banner={banner}
        user={user}
        theme={theme}
        onPickTheme={handlePickTheme}
        onUpdateProfile={handleUpdateProfile}
        onSetTargetWeight={handleSetTargetWeight}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
        onOpenTimerAlerts={() => { setSelectedExercise(null); setView("timer-alerts") }}
        onOpenQuestionnaire={() => {
          setQuestionnaireReturnView("account")
          setSelectedExercise(null)
          setView("questionnaire")
        }}
        onOpenPlanSchedule={() => { setSelectedExercise(null); setView("plan-schedule") }}
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
  } else if (view === "questionnaire") {
    body = (
      <AuthTemplate banner={banner}>
        <QuestionnaireView
          initialAnswers={{
            goal: user?.questionnaire?.goal,
            experience: user?.questionnaire?.experience,
            focus: user?.questionnaire?.focus,
            scheduleMode: user?.questionnaire?.scheduleMode,
            workoutDays: user?.questionnaire?.workoutDays,
            restDays: user?.questionnaire?.restDays,
            daysPerWeek: user?.questionnaire?.daysPerWeek,
            equipment: user?.questionnaire?.equipment,
            sessionMinutes: user?.questionnaire?.sessionMinutes,
          }}
          onSave={handleUpdateQuestionnaire}
          saving={savingQuestionnaire}
          onBack={() => { setSelectedExercise(null); setView(questionnaireReturnView) }}
        />
      </AuthTemplate>
    )
  } else if (view === "plan-schedule") {
    body = (
      <AuthTemplate banner={banner}>
        <PlanScheduleView
          user={user}
          workoutLists={workoutLists}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => { setSelectedExercise(null); setView("account") }}
        />
      </AuthTemplate>
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
        schedule={user?.schedule}
        workoutLists={workoutLists}
        startingSession={startingSession}
        onStartSession={handleStartSession}
      />
    )
  } else {
    body = (
      <PlannerPage
        activeTab={plannerTab}
        onTabChange={setPlannerTab}
        banner={banner}
        searching={searching}
        exercises={exercises}
        searchResults={searchResults}
        searchQuery={searchQuery}
        selectedTarget={selectedTarget}
        selectedCategory={selectedCategory}
        autoFocusSearch={focusSearchOnNextPlanner}
        onAutoFocusSearchHandled={clearFocusOnNextPlanner}
        pendingAddList={pendingAddList}
        pendingAddExerciseIds={pendingAddExerciseIds}
        hierarchy={hierarchy}
        selected={selected}
        questionnaire={user?.questionnaire || null}
        recentRows={recentRows}
        recentLoading={recentLoading}
        onSelectExercise={handleSelectExercise}
        onSaveExercise={handleCardSave}
        onClearSearch={() => setSearchQuery("")}
        onQueryChange={handleSearchChange}
        onSelectCategory={handleSelectCategory}
        onSelectTarget={handleSelectTarget}
        onSelectEquipment={handleSelectEquipment}
        onAddPreset={handleAddPreset}
        onRequestRecent={() => setRecentRequested(true)}
        sortAlpha={sortAlpha}
        sortByDifficulty={sortByDifficulty}
        onToggleSortAlpha={() => setSortAlpha((p) => !p)}
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
          onReorderExercises={handleReorderExercises}
          onRenameList={handleRenameList}
        />
      )}
      <LeavePrompt open={leavePromptOpen} onStay={stay} onLeave={leave} />
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
          onGoHome={guardedGoHome}
          onNavigate={guardedNavigate}
          onLogin={guardedLogin}
          onOpenAccount={guardedOpenAccount}
          onToggleTheme={() => {
            const i = THEMES.findIndex((x) => x.id === theme)
            setTheme(THEMES[(i + 1) % THEMES.length].id)
          }}
        />
      )}
      body={body}
      tabBar={(
        <MobileTabBar active={tabId} onNavigate={guardedTabNavigate} />
      )}
      overlays={overlays}
      error={error}
      onDismissError={() => setError(null)}
    />
  )
}