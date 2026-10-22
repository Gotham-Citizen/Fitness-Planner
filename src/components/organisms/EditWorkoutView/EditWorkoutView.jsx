import { useTranslation } from "react-i18next"

import { isRirEligible } from "../../../lib/effort.js"
import { exerciseName, mediaUrl } from "../../../lib/muscles.js"

import "./EditWorkoutView.css"

import { Button } from "../../atoms/index.js"
import { ModalShell } from "../../molecules/index.js"

const PRESETS = [30, 60, 90, 120, 180, 300]

const restSecsOf = (ex) => {
  const n = Number(ex?.restSecs)
  return Number.isFinite(n) ? Math.min(1800, Math.max(5, Math.round(n))) : 60
}

const restEnabledOf = (ex) => {
  return ex?.restEnabled === undefined ? true : Boolean(ex.restEnabled)
}

const rirEnabledOf = (ex) => {
  return ex?.rirEnabled === undefined ? false : Boolean(ex.rirEnabled)
}

export const EditWorkoutView = ({ list, onClose, onAddExercise, onCreateCustom, onRemoveExercise, onUpdateSettings }) => {
  const { t, i18n } = useTranslation()
  if (!list) return null

  const handleToggle = (ex) => {
    onUpdateSettings?.(list.id, ex.id, { restEnabled: !restEnabledOf(ex) })
  }

  const handlePreset = (ex, secs) => {
    onUpdateSettings?.(list.id, ex.id, { restSecs: secs, restEnabled: true })
  }

  const handleCustom = (ex, value) => {
    const n = parseInt(value, 10)
    if (!Number.isFinite(n) || n < 5 || n > 1800) return
    onUpdateSettings?.(list.id, ex.id, { restSecs: n, restEnabled: true })
  }

  return (
    <ModalShell
      dialogClassName="edit-workout-modal"
      label={t("editWorkout.title", { name: list.name })}
      title={t("editWorkout.title", { name: list.name })}
      onClose={onClose}
      closeLabel={t("editWorkout.closeEditor")}
      footer={(
        <Button onClick={onClose}>
          {t("editWorkout.done")}
        </Button>
      )}
    >
          <div className="edit-workout-add-row">
            <Button variant="secondary" onClick={() => onAddExercise?.(list)}>
              {t("editWorkout.addExercise")}
            </Button>
            <Button variant="secondary" onClick={() => onCreateCustom?.(list)}>
              {t("editWorkout.newCustom")}
            </Button>
          </div>
          {list.exercises.length === 0 ? (
            <p className="workout-list-empty edit-workout-empty">{t("editWorkout.empty")}</p>
          ) : (
            <ul className="edit-workout-list">
              {list.exercises.map((ex) => {
                const secs = restSecsOf(ex)
                const enabled = restEnabledOf(ex)
                const rirOn = rirEnabledOf(ex)
                return (
                  <li key={ex.id} className="edit-workout-row">
                    <div className="edit-workout-row-main">
                      {mediaUrl(ex.image) ? (
                        <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                      ) : (
                        <span className="workout-exercise-placeholder" aria-hidden="true">💪</span>
                      )}
                        <span className="workout-exercise-name">{exerciseName(ex, String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en")}</span>
                      <Button
                        variant="icon"
                        tone="danger"
                        onClick={() => onRemoveExercise?.(list.id, ex.id)}
                        aria-label={t("editWorkout.removeAria", { name: ex.name })}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="edit-workout-timer">
                      <button
                        type="button"
                        className={`rest-toggle ${enabled ? "is-on" : ""}`}
                        onClick={() => handleToggle(ex)}
                        aria-pressed={enabled}
                        title={enabled ? t("editWorkout.restTitleOn") : t("editWorkout.restTitleOff")}
                      >
                        ⏱ {enabled ? t("editWorkout.restOn") : t("editWorkout.restOff")}
                      </button>
                      {enabled && (
                        <div className="rest-presets" role="group" aria-label={t("editWorkout.restFor", { name: ex.name })}>
                          {PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              className={`rest-preset ${secs === p ? "is-selected" : ""}`}
                              onClick={() => handlePreset(ex, p)}
                              aria-pressed={secs === p}
                            >
                              {p >= 60 ? `${p / 60}${t("rest.minUnit")}` : `${p}${t("rest.secUnit")}`}
                            </button>
                          ))}
                          <input
                            className="rest-custom"
                            type="number"
                            min="5"
                            max="1800"
                            defaultValue={secs}
                            key={`${ex.id}-${secs}-${enabled}`}
                            onBlur={(e) => handleCustom(ex, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur()
                            }}
                            aria-label={t("editWorkout.restFor", { name: ex.name })}
                            title={t("editWorkout.customRest")}
                          />
                        </div>
                      )}
                    </div>
                    <div className="edit-workout-rir">
                      {isRirEligible(ex) ? (
                        <>
                          <button
                            type="button"
                            className={`rir-toggle ${rirOn ? "is-on" : ""}`}
                            onClick={() => onUpdateSettings?.(list.id, ex.id, { rirEnabled: !rirOn })}
                            aria-pressed={rirOn}
                            title={rirOn ? t("editWorkout.effortAriaOn") : t("editWorkout.effortAriaOff")}
                          >
                            {rirOn ? t("editWorkout.effortOn") : t("editWorkout.effortOff")}
                          </button>
                          {rirOn && (
                            <p className="rir-hint">{t("editWorkout.effortHint")}</p>
                          )}
                        </>
                      ) : (
                        <p className="rir-hint">{t("editWorkout.effortNotEligible")}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
    </ModalShell>
  )
}
