import { useTranslation } from "react-i18next"

import { effortColor, effortDisplayValue, effortFeelKey, isRirEligible, rirOf } from "../../../lib/effort.js"

import { Button } from "../../atoms/index.js"
import { RestTimer } from "../../molecules/index.js"

/**
 * Private sibling of WorkoutSessionView — not part of the organisms barrel.
 * Renders everything below a movement's instructions during an active session:
 * its rest timer, the set table, and the Add set / duplicate / Finish set row.
 *
 * It is pure presentation: every action is a prop, and all per-exercise session
 * state (open set, resting, weight drafts) lives in WorkoutSessionView, so a
 * single movement on screen and a list of them would both work unchanged.
 */
export const SessionExerciseSets = ({
  exercise,
  sets,
  userScale,
  timerSound,
  timerVibrate,
  timerFlash,
  invalidIds,
  weightDrafts,
  resting,
  open,
  onAddSet,
  onDuplicateSet,
  onFinishSet,
  onDeleteSet,
  onSetChange,
  onToggleUnit,
  onCommitWeight,
  onWeightDraft,
  onOpenRir,
  onRestFinish,
  onRestStart,
  onRestApi,
}) => {
  const { t } = useTranslation()
  const showRir = exercise.rirEnabled && isRirEligible(exercise)

  return (
    <>
      <RestTimer
        exerciseId={exercise.id}
        initialSecs={exercise.restSecs}
        initialEnabled={exercise.restEnabled}
        readOnly
        sound={timerSound}
        vibrate={timerVibrate}
        flash={timerFlash}
        onFinish={onRestFinish}
        onStart={onRestStart}
        apiRef={onRestApi}
      />

      <div className={`session-sets-table${showRir ? " has-rir" : ""}`}>
        <div className="session-sets-header">
          <span className="set-col set-num">{t("session.set")}</span>
          <span className="set-col">{t("session.reps")}</span>
          <span className="set-col">{t("session.weight")}</span>
          {showRir && (
            <span className="set-col">{userScale === "rpe" ? "RPE" : "RIR"}</span>
          )}
          <span className="set-col set-actions"></span>
      </div>

        {sets.map((s, i) => {
          const rir = rirOf(s)
          const tint = effortColor(rir)
          const feelKey = effortFeelKey(rir)
          const feel = feelKey ? t(feelKey) : null
          // Fixed scale for the whole active session: every pill shows the
          // user's current preference (old RIR values convert via RPE = 10 - RIR).
          // History views keep the original scale.
          const setScaleLabel = userScale === "rpe" ? "RPE" : "RIR"
          const displayVal = effortDisplayValue(rir, userScale)
          return (
            <div key={s.id}>
              <div className={`session-set-row${invalidIds.has(s.id) ? " is-invalid" : ""}`}>
                <div className="set-card-head">
                  <span className="set-col set-num">
                    <span className="set-num-prefix" aria-hidden="true">{t("session.set")} </span>
                    {i + 1}
                  </span>
                </div>
                <div className="set-fields-row">
                  <div className="set-field">
                    <span className="set-field-label" aria-hidden="true">{t("session.reps")}</span>
                    <input
                      className={`set-input${invalidIds.has(s.id) ? " is-invalid" : ""}`}
                      type="number"
                      min="0"
                      value={s.reps ?? ""}
                      onChange={(e) => onSetChange(s.id, "reps", e.target.value)}
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
                        onChange={(e) => onWeightDraft(s.id, e.target.value)}
                        onBlur={() => onCommitWeight(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            onCommitWeight(s.id)
                            e.currentTarget.blur()
                          }
                        }}
                        placeholder="0"
                        aria-label={t("session.setWeight", { n: i + 1 })}
                      />
                      <button
                        type="button"
                        className={`set-unit-button ${s.weight_unit === "kg" ? "is-kg" : "is-lbs"}`}
                        onClick={() => onToggleUnit(s)}
                        title={t("session.unitTitle", { u: s.weight_unit === "kg" ? "lbs" : "kg" })}
                        aria-label={t("session.unitSwitch", { u: s.weight_unit, o: s.weight_unit === "kg" ? "lbs" : "kg" })}
                      >
                        {s.weight_unit}
                      </button>
                    </div>
                  </div>
                  {showRir && (
                    <div className="set-field set-field-wide">
                      <span className="set-field-label" aria-hidden="true">{setScaleLabel}</span>
                      <button
                        type="button"
                        className={`rir-pill${rir == null ? " is-unrated" : ""}`}
                        style={tint ? { "--rir-tint": tint } : undefined}
                        aria-label={feel ? t("session.ratedHint", { scale: setScaleLabel, v: displayVal, feel }) : t("session.unratedAria", { n: i + 1, scale: setScaleLabel })}
                        onClick={() => onOpenRir(s.id)}
                      >
                        <span className="rir-value" role="status">
                          {displayVal ?? "–"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  variant="icon"
                  tone="danger"
                  className="set-delete"
                  onClick={() => onDeleteSet(exercise.id, s.id)}
                  aria-label={t("session.removeSet", { n: i + 1 })}
                >
                  &times;
                </Button>
              </div>
              {invalidIds.has(s.id) && (
                <div className="set-invalid-hint" role="alert">{t("session.needsReps")}</div>
              )}
            </div>
          )
        })}
      </div>

      {!resting && (
        open ? (
          <Button className="add-set-button" onClick={onFinishSet}>
            {t("session.finishSet")}
          </Button>
        ) : sets.length > 0 ? (
          <div className="add-set-row">
            <Button variant="ghost" className="add-set-button" onClick={onAddSet}>
              {t("session.addSet")}
            </Button>
            <Button variant="ghost" className="add-set-button" onClick={onDuplicateSet}>
              {t("session.addDup")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="add-set-button" onClick={onAddSet}>
            {t("session.addSet")}
          </Button>
        )
      )}
    </>
  )
}
