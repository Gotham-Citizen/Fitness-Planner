import { useCallback, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { normalizeEffortScale, rirOf } from "../../../lib/effort.js"

import "./WorkoutSessionView.css"

import { Button } from "../../atoms/index.js"
import { MovementDetailCard, RirPickerSheet, SessionProgressBar } from "../../molecules/index.js"
import { SessionExerciseSets } from "./SessionExerciseSets.jsx"
import { parseWeightInput } from "./weightInput.js"

// How many movements a workout may hold. Bounds the progress bar and the index
// arithmetic below; presets are seeded with at most 30 exercises anyway.
const MAX_EXERCISES = 200

const clampIndex = (value, last) => (value < 0 ? 0 : value > last ? last : value)

/**
 * Active workout session, one movement at a time.
 *
 * The whole session is driven by `currentIndex`: everything above the set table
 * (title, prescription, GIF, instructions) comes from the single movement that
 * index points at, and the progress bar above it doubles as nav — Previous /
 * Next move by one, and each segment jumps straight to that movement. Movement
 * is always manual: there is no auto-advance, so a rest timer running on one
 * movement never yanks you to the next one before you are done with it.
 *
 * Per-exercise session state (an open set, resting, weight drafts) is keyed by
 * exercise id rather than by index, so hopping around the list cannot strand a
 * half-logged set behind you.
 */
export const WorkoutSessionView = ({ list, session, effortScale, timerSound, timerVibrate, timerFlash, defaultWeightUnit = "kg", onLogSet, onUpdateSet, onDeleteSet, onFinish, onBack, invalidSetIds }) => {
  const { t } = useTranslation()
  const userScale = normalizeEffortScale(effortScale)
  const timerApis = useRef({})
  // The visible RestTimer can outlive the movement that started it: navigating
  // to another movement leaves the countdown running, so remember its owner.
  // State drives rendering; the ref mirror lets synchronous timer callbacks
  // read the owner immediately after it changes.
  const [restOwner, setRestOwner] = useState(null)
  const restOwnerRef = useRef(null)
  const invalidIds = new Set(invalidSetIds || [])

  const exercises = list.exercises || []
  const lastIndex = Math.max(0, exercises.length - 1)

  // Tracks per exercise whether the latest set is still open (being performed).
  // Finished state is purely local: reloads and pre-existing sets count as finished.
  const [openEx, setOpenEx] = useState({})
  // Tracks per exercise whether a rest timer is currently running. While resting,
  // the Finish/Add button for that exercise is hidden.
  const [restingEx, setRestingEx] = useState({})
  // Local weight drafts so intermediate typing like "2." stays visible.
  // The server is only updated on blur / Enter (see commitWeight).
  const [weightDrafts, setWeightDrafts] = useState({})
  // Which set's RIR bottom-sheet is open (set id or null).
  const [rirSheetSetId, setRirSheetSetId] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // The session can run alongside a list that changes (an exercise removed
  // elsewhere, or an empty list), so the index is always clamped on read.
  const activeIndex = clampIndex(currentIndex, Math.min(lastIndex, MAX_EXERCISES - 1))
  const current = exercises[activeIndex]
  // Captured per render so the timer API is registered/unregistered under a
  // stable id, even when the owner changes while it is running.
  const timerOwnerId = restOwner?.id ?? current?.id

  const setsByExercise = useMemo(() => {
    const grouped = {}
    for (const s of session.sets || []) {
      if (!grouped[s.exercise_id]) grouped[s.exercise_id] = []
      grouped[s.exercise_id].push(s)
    }
    return grouped
  }, [session.sets])

  const setReady = useCallback((exerciseId) => {
    setOpenEx((prev) => {
      if (!prev[exerciseId]) return prev
      const next = { ...prev }
      delete next[exerciseId]
      return next
    })
    setRestingEx((prev) => {
      if (!prev[exerciseId]) return prev
      const next = { ...prev }
      delete next[exerciseId]
      return next
    })
  }, [])

  const setResting = useCallback((exerciseId) => {
    setRestingEx((prev) => (prev[exerciseId] ? prev : { ...prev, [exerciseId]: true }))
  }, [])

  // Navigation is independent of the rest timer: the countdown keeps running
  // and stays bound to the exercise that started it.
  const navigateTo = useCallback((index) => {
    setCurrentIndex(clampIndex(index, lastIndex))
  }, [lastIndex])

  // Only one RestTimer is mounted at a time, so its API may be registered
  // under the previous movement while a new timer is being started.
  const activeTimerApi = () => timerApis.current[restOwnerRef.current?.id ?? current?.id]
    ?? Object.values(timerApis.current)[0]

  const rememberRestOwner = (owner) => {
    restOwnerRef.current = owner
    setRestOwner(owner)
  }

  const clearRestOwner = () => {
    restOwnerRef.current = null
    setRestOwner(null)
  }

  const handleAddSet = useCallback(
    (exerciseId) => {
      const existing = setsByExercise[exerciseId] || []
      onLogSet(session.id, exerciseId, existing.length + 1, null, null, defaultWeightUnit, null, userScale)
      setOpenEx((prev) => ({ ...prev, [exerciseId]: true }))
    },
    [defaultWeightUnit, onLogSet, setsByExercise, session.id, userScale],
  )

  const handleDuplicateSet = useCallback(
    (exerciseId) => {
      const existing = setsByExercise[exerciseId] || []
      const last = existing[existing.length - 1]
      if (!last) {
        handleAddSet(exerciseId)
        return
      }
      onLogSet(session.id, exerciseId, existing.length + 1, last.reps ?? null, last.weight ?? null, last.weight_unit || "kg", last.rir ?? null, userScale)
      setOpenEx((prev) => ({ ...prev, [exerciseId]: true }))
    },
    [handleAddSet, onLogSet, setsByExercise, session.id, userScale],
  )

  const handleFinishSet = (exerciseId) => {
    const ex = exercises.find((e) => e.id === exerciseId)
    rememberRestOwner({ id: exerciseId, secs: ex?.restSecs, enabled: ex?.restEnabled })
    const started = activeTimerApi()?.start?.({ secs: ex?.restSecs, enabled: ex?.restEnabled }) === true
    // Timer off (or unavailable): next set is available immediately.
    if (!started) {
      clearRestOwner()
      setReady(exerciseId)
    } else setResting(exerciseId)
  }

  // Tapping Next with an unfinished set is treated as finishing that set:
  // the rest timer starts and keeps running on the next movement.
  const handleNext = () => {
    if (openEx[current.id] && !restingEx[current.id]) handleFinishSet(current.id)
    navigateTo(activeIndex + 1)
  }

  const handleDeleteSet = (exerciseId, setId) => {
    const ownerId = restOwnerRef.current?.id ?? exerciseId
    onDeleteSet(session.id, setId)
    try {
      activeTimerApi()?.stop?.()
    } catch {
      // ignore
    }
    clearRestOwner()
    setReady(exerciseId)
    if (ownerId !== exerciseId) setReady(ownerId)
  }

  const handleSetChange = (setId, field, value, scale) => {
    const set = session.sets.find((s) => s.id === setId)
    if (!set) return
    if (field === "reps") {
      const num = parseInt(value, 10) || null
      onUpdateSet(session.id, setId, { reps: num, weight: set.weight, weightUnit: set.weight_unit, rir: set.rir ?? null })
    } else if (field === "weight") {
      const parsed = parseWeightInput(value)
      if (!parsed.ok) {
        // Invalid on commit: drop the draft so the input reverts to the saved value.
        setWeightDrafts((prev) => {
          if (!(setId in prev)) return prev
          const next = { ...prev }
          delete next[setId]
          return next
        })
        return
      }
      const nextUnit = parsed.weightUnit || set.weight_unit
      if (parsed.weight === set.weight && nextUnit === set.weight_unit) {
        setWeightDrafts((prev) => {
          if (!(setId in prev)) return prev
          const next = { ...prev }
          delete next[setId]
          return next
        })
        return
      }
      onUpdateSet(session.id, setId, {
        reps: set.reps,
        weight: parsed.weight,
        weightUnit: nextUnit,
        rir: set.rir ?? null,
      })
      setWeightDrafts((prev) => {
        if (!(setId in prev)) return prev
        const next = { ...prev }
        delete next[setId]
        return next
      })
    } else if (field === "rir") {
      onUpdateSet(session.id, setId, {
        reps: set.reps,
        weight: set.weight,
        weightUnit: set.weight_unit,
        rir: value,
        effortScale: scale === undefined ? userScale : scale,
      })
    }
  }

  const commitWeight = (setId) => {
    const draft = weightDrafts[setId]
    if (draft === undefined) return
    handleSetChange(setId, "weight", draft)
  }

  const handleToggleUnit = (set) => {
    const newUnit = set.weight_unit === "kg" ? "lbs" : "kg"
    onUpdateSet(session.id, set.id, { reps: set.reps, weight: set.weight, weightUnit: newUnit, rir: set.rir ?? null })
  }

  // An empty workout can reach the session (every exercise deleted after start),
  // in which case there is nothing to present and finishing is the only action.
  if (!current) {
    return (
      <section className="session-view">
        <div className="session-header">
          <Button onClick={onBack}>{t("common.back")}</Button>
          <h2 className="session-title">{t("session.activeTitle", { name: list.name })}</h2>
        </div>
        <p className="workout-list-empty">{t("editWorkout.empty")}</p>
        <div className="session-footer">
          <Button onClick={() => onFinish(session.id)}>{t("session.finish")}</Button>
        </div>
      </section>
    )
  }

  const exSets = setsByExercise[current.id] || []

  return (
    <section className="session-view">
      <div className="session-header">
        <Button onClick={onBack}>{t("common.back")}</Button>
        <h2 className="session-title">{t("session.activeTitle", { name: list.name })}</h2>
      </div>

      <SessionProgressBar
        current={activeIndex}
        total={exercises.length}
        onSelect={navigateTo}
      />

      <MovementDetailCard exercise={current}>
        <SessionExerciseSets
          exercise={current}
          timerExerciseId={timerOwnerId}
          timerSecs={restOwner?.secs ?? current.restSecs}
          timerEnabled={restOwner?.enabled ?? current.restEnabled}
          sets={exSets}
          userScale={userScale}
          timerSound={timerSound}
          timerVibrate={timerVibrate}
          timerFlash={timerFlash}
          invalidIds={invalidIds}
          weightDrafts={weightDrafts}
          resting={Boolean(restingEx[current.id])}
          open={Boolean(openEx[current.id])}
          onAddSet={() => handleAddSet(current.id)}
          onDuplicateSet={() => handleDuplicateSet(current.id)}
          onFinishSet={() => handleFinishSet(current.id)}
          onDeleteSet={handleDeleteSet}
          onSetChange={handleSetChange}
          onToggleUnit={handleToggleUnit}
          onCommitWeight={commitWeight}
          onWeightDraft={(setId, value) => setWeightDrafts((prev) => ({ ...prev, [setId]: value }))}
          onOpenRir={setRirSheetSetId}
          onRestFinish={() => {
            const ownerId = restOwnerRef.current?.id
            clearRestOwner()
            if (ownerId) setReady(ownerId)
          }}
          onRestStart={() => {
            const ownerId = restOwnerRef.current?.id
            if (ownerId) setResting(ownerId)
          }}
          onRestApi={(api) => {
            if (api) timerApis.current[timerOwnerId] = api
            else delete timerApis.current[timerOwnerId]
          }}
        />
      </MovementDetailCard>

      <div className="session-nav">
        <Button
          variant="ghost"
          onClick={() => navigateTo(activeIndex - 1)}
          disabled={activeIndex <= 0}
        >
          {t("session.previous")}
        </Button>
        <span className="session-nav-count">{t("session.movementOf", { n: activeIndex + 1, total: exercises.length })}</span>
        {activeIndex < lastIndex ? (
          <Button
            variant="ghost"
            onClick={handleNext}
          >
            {t("session.next")}
          </Button>
        ) : (
          <Button className="finish-session-button" onClick={() => onFinish(session.id)}>
            {t("session.finish")}
          </Button>
        )}
      </div>

      {(() => {
        const sheetSet = rirSheetSetId == null ? null : session.sets.find((s) => s.id === rirSheetSetId)
        if (!sheetSet) return null
        return (
          <RirPickerSheet
            key={sheetSet.id}
            value={rirOf(sheetSet)}
            scale={userScale}
            lockScale
            onSelect={(v, pickedScale) => handleSetChange(sheetSet.id, "rir", v, pickedScale ?? userScale)}
            onClose={() => setRirSheetSetId(null)}
          />
        )
      })()}
    </section>
  )
}
