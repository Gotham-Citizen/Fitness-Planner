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
export const WorkoutSessionView = ({ list, session, effortScale, timerSound, timerVibrate, timerFlash, onLogSet, onUpdateSet, onDeleteSet, onFinish, onBack, invalidSetIds }) => {
  const { t } = useTranslation()
  const userScale = normalizeEffortScale(effortScale)
  const timerApis = useRef({})
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

  const handleAddSet = useCallback(
    (exerciseId) => {
      const existing = setsByExercise[exerciseId] || []
      onLogSet(session.id, exerciseId, existing.length + 1, null, null, "kg", null, userScale)
      setOpenEx((prev) => ({ ...prev, [exerciseId]: true }))
    },
    [onLogSet, setsByExercise, session.id, userScale],
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
    const started = timerApis.current[exerciseId]?.start?.() === true
    // Timer off (or unavailable): next set is available immediately.
    if (!started) setReady(exerciseId)
    else setResting(exerciseId)
  }

  const handleDeleteSet = (exerciseId, setId) => {
    onDeleteSet(session.id, setId)
    try {
      timerApis.current[exerciseId]?.stop?.()
    } catch {
      // ignore
    }
    setReady(exerciseId)
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
          <Button onClick={onBack}>{t("session.back")}</Button>
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
        <Button onClick={onBack}>{t("session.back")}</Button>
        <h2 className="session-title">{t("session.activeTitle", { name: list.name })}</h2>
      </div>

      <SessionProgressBar
        current={activeIndex}
        total={exercises.length}
        onSelect={(index) => setCurrentIndex(clampIndex(index, lastIndex))}
      />

      <MovementDetailCard exercise={current}>
        <SessionExerciseSets
          exercise={current}
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
          onRestFinish={() => setReady(current.id)}
          onRestStart={() => setResting(current.id)}
          onRestApi={(api) => {
            if (api) timerApis.current[current.id] = api
            else delete timerApis.current[current.id]
          }}
        />
      </MovementDetailCard>

      <div className="session-nav">
        <Button
          variant="ghost"
          onClick={() => setCurrentIndex((index) => clampIndex(index - 1, lastIndex))}
          disabled={activeIndex <= 0}
        >
          {t("session.previous")}
        </Button>
        <span className="session-nav-count">{t("session.movementOf", { n: activeIndex + 1, total: exercises.length })}</span>
        <Button
          variant="ghost"
          onClick={() => setCurrentIndex((index) => clampIndex(index + 1, lastIndex))}
          disabled={activeIndex >= lastIndex}
        >
          {t("session.next")}
        </Button>
      </div>

      <div className="session-footer">
        <Button onClick={() => onFinish(session.id)}>{t("session.finish")}</Button>
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
