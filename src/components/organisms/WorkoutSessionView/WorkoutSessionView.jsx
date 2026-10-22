import { useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { effortColor, effortDisplayValue, effortFeelKey, isRirEligible, normalizeEffortScale, rirOf } from "../../../lib/effort.js"
import { exerciseName, localizedEquipment, mediaUrl } from "../../../lib/muscles.js"

import "./WorkoutSessionView.css"

import { Button } from "../../atoms/index.js"
import { RestTimer, RirPickerSheet } from "../../molecules/index.js"


const WEIGHT_INPUT_RE = /^\s*(\d*\.?\d+|\d+\.?)\s*(kg|kgs|lb|lbs)?\s*$/i

// Parses weight input like "50", "50kg", "110lbs". The unit suffix (if any)
// is returned separately so the caller can flip the set-unit button and the
// input itself keeps showing just the number.
const parseWeightInput = (value) => {
  if (value == null || String(value).trim() === "") return { ok: true, weight: null, weightUnit: null }
  const match = String(value).match(WEIGHT_INPUT_RE)
  if (!match) return { ok: false }
  const weight = parseFloat(match[1])
  if (!Number.isFinite(weight)) return { ok: false }
  const suffix = (match[2] || "").toLowerCase()
  const weightUnit = suffix.startsWith("lb") ? "lbs" : suffix.startsWith("kg") ? "kg" : null
  return { ok: true, weight, weightUnit }
}

export const WorkoutSessionView = ({ list, session, effortScale, timerSound, timerVibrate, timerFlash, onLogSet, onUpdateSet, onDeleteSet, onFinish, onBack, invalidSetIds }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const userScale = normalizeEffortScale(effortScale)
  const timerApis = useRef({})
  const invalidIds = new Set(invalidSetIds || [])
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

  const setsByExercise = {}
  for (const s of session.sets) {
    if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = []
    setsByExercise[s.exercise_id].push(s)
  }

  const setReady = (exerciseId) => {
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
  }

  const setResting = (exerciseId) => {
    setRestingEx((prev) => (prev[exerciseId] ? prev : { ...prev, [exerciseId]: true }))
  }

  const handleAddSet = (exerciseId) => {
    const existing = setsByExercise[exerciseId] || []
    const nextNumber = existing.length + 1
    onLogSet(session.id, exerciseId, nextNumber, null, null, "kg", null, userScale)
    setOpenEx((prev) => ({ ...prev, [exerciseId]: true }))
  }

  const handleDuplicateSet = (exerciseId) => {
    const existing = setsByExercise[exerciseId] || []
    const last = existing[existing.length - 1]
    if (!last) {
      handleAddSet(exerciseId)
      return
    }
    onLogSet(session.id, exerciseId, existing.length + 1, last.reps ?? null, last.weight ?? null, last.weight_unit || "kg", last.rir ?? null, userScale)
    setOpenEx((prev) => ({ ...prev, [exerciseId]: true }))
  }

  const handleFinishSet = (exerciseId) => {
    const started = timerApis.current[exerciseId]?.start?.() === true
    // Timer off (or unavailable): next set is available immediately.
    if (!started) setReady(exerciseId)
    else setResting(exerciseId)
  }

  const handleDeleteSet = (sessionId, setId, exerciseId) => {
    onDeleteSet(sessionId, setId)
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

  return (
    <section className="session-view">
      <div className="session-header">
        <Button variant="ghost" onClick={onBack}>
          {t("session.back")}
        </Button>
        <h2 className="session-title">{t("session.activeTitle", { name: list.name })}</h2>
        <Button onClick={() => onFinish(session.id)}>
          {t("session.finish")}
        </Button>
      </div>

      <div className="session-exercises">
        {list.exercises.map((ex) => {
          const exSets = setsByExercise[ex.id] || []
          return (
            <div key={ex.id} className="session-exercise-card">
              <div className="session-exercise-header">
                {mediaUrl(ex.image) ? (
                  <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                ) : (
                  <span className="session-exercise-placeholder" aria-hidden="true">💪</span>
                )}
                <div>
                  <h3 className="session-exercise-name">{exerciseName(ex, lang)}</h3>
                  <span className="session-exercise-equipment">{localizedEquipment(ex.equipment)}</span>
                </div>
              </div>

              <RestTimer
                exerciseId={ex.id}
                initialSecs={ex.restSecs}
                initialEnabled={ex.restEnabled}
                readOnly
                sound={timerSound}
                vibrate={timerVibrate}
                flash={timerFlash}
                onFinish={() => setReady(ex.id)}
                onStart={() => setResting(ex.id)}
                apiRef={(api) => {
                  if (api) timerApis.current[ex.id] = api
                  else delete timerApis.current[ex.id]
                }}
              />

              <div className="session-sets-table">
                <div className="session-sets-header">
                  <span className="set-col set-num">{t("session.set")}</span>
                  <span className="set-col">{t("session.reps")}</span>
                  <span className="set-col">{t("session.weight")}</span>
                  {ex.rirEnabled && isRirEligible(ex) && <span className="set-col">{userScale === "rpe" ? "RPE" : "RIR"}</span>}
                  <span className="set-col set-actions"></span>
                </div>
                {exSets.map((s, i) => {
                  const rir = rirOf(s)
                  const tint = effortColor(rir)
                  const feelKey = effortFeelKey(rir)
                  const feel = feelKey ? t(feelKey) : null
                  // Fixed scale for the whole active session: every pill shows
                  // the user's current preference (old RIR values convert via
                  // RPE = 10 - RIR). History views keep the original scale.
                  const setScaleLabel = userScale === "rpe" ? "RPE" : "RIR"
                  const displayVal = effortDisplayValue(rir, userScale)
                  return (
                  <div key={s.id}>
                    <div className={`session-set-row${invalidIds.has(s.id) ? " is-invalid" : ""}`}>
                    <div className="set-card-head">
                      <span className="set-col set-num"><span className="set-num-prefix" aria-hidden="true">{t("session.set")} </span>{i + 1}</span>
                      <Button
                        variant="icon"
                        tone="danger"
                        onClick={() => handleDeleteSet(session.id, s.id, ex.id)}
                        aria-label={t("session.removeSet", { n: i + 1 })}
                      >
                        &times;
                      </Button>
                    </div>
                    <div className="set-field">
                      <span className="set-field-label" aria-hidden="true">{t("session.reps")}</span>
                      <input
                        className={`set-input${invalidIds.has(s.id) ? " is-invalid" : ""}`}
                        type="number"
                        min="0"
                        value={s.reps ?? ""}
                        onChange={(e) => handleSetChange(s.id, "reps", e.target.value)}
                        placeholder="0"
                        aria-label={t("session.setReps", { n: i + 1 })}
                        aria-invalid={invalidIds.has(s.id) || undefined}
                      />
                    </div>
                    <div className="set-field">
                      <span className="set-field-label" aria-hidden="true">{t("session.weight")}</span>
                      <div className="set-weight-group">
                        <input
                          className="set-input set-input-weight"
                          type="text"
                          inputMode="decimal"
                          value={weightDrafts[s.id] ?? (s.weight ?? "")}
                          onChange={(e) => {
                            const v = e.target.value
                            setWeightDrafts((prev) => ({ ...prev, [s.id]: v }))
                          }}
                          onBlur={() => commitWeight(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              commitWeight(s.id)
                              e.currentTarget.blur()
                            }
                          }}
                          placeholder="0"
                          aria-label={t("session.setWeight", { n: i + 1 })}
                        />
                        <button
                          type="button"
                          className={`set-unit-button ${s.weight_unit === "kg" ? "is-kg" : "is-lbs"}`}
                          onClick={() => handleToggleUnit(s)}
                          title={t("session.unitTitle", { u: s.weight_unit === "kg" ? "lbs" : "kg" })}
                          aria-label={t("session.unitSwitch", { u: s.weight_unit, o: s.weight_unit === "kg" ? "lbs" : "kg" })}
                        >
                          {s.weight_unit}
                        </button>
                      </div>
                    </div>
                    {ex.rirEnabled && isRirEligible(ex) && (
                      <div className="set-field set-field-wide">
                        <span className="set-field-label" aria-hidden="true">{setScaleLabel}</span>
                        <button
                          type="button"
                          className={`rir-pill${rir == null ? " is-unrated" : ""}`}
                          style={tint ? { "--rir-tint": tint } : undefined}
                          title={feel ? t("session.ratedHint", { scale: setScaleLabel, v: displayVal, feel }) : t("session.unratedHint", { scale: setScaleLabel })}
                          aria-label={feel ? t("session.ratedHint", { scale: setScaleLabel, v: displayVal, feel }) : t("session.unratedAria", { n: i + 1, scale: setScaleLabel })}
                          onClick={() => setRirSheetSetId(s.id)}
                        >
                          <span className="rir-value" role="status">
                            {displayVal ?? "–"}
                          </span>
                        </button>
                      </div>
                    )}
                    </div>
                    {invalidIds.has(s.id) && (
                      <div className="set-invalid-hint" role="alert">{t("session.needsReps")}</div>
                    )}
                  </div>
                  )
                })}
              </div>

              {!restingEx[ex.id] && (
                openEx[ex.id] ? (
                  <Button
                    className="add-set-button"
                    onClick={() => handleFinishSet(ex.id)}
                  >
                    {t("session.finishSet")}
                  </Button>
                ) : exSets.length > 0 ? (
                  <div className="add-set-row">
                    <Button
                      variant="ghost"
                      className="add-set-button"
                      onClick={() => handleAddSet(ex.id)}
                    >
                      {t("session.addSet")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="add-set-button"
                      onClick={() => handleDuplicateSet(ex.id)}
                    >
                      {t("session.addDup")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="add-set-button"
                      onClick={() => handleAddSet(ex.id)}
                  >
                    {t("session.addSet")}
                  </Button>
                )
              )}
            </div>
          )
        })}
      </div>

      <div className="session-footer">
        <Button onClick={() => onFinish(session.id)}>
          {t("session.finish")}
        </Button>
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
