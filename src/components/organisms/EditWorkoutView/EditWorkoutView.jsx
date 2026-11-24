import { useState } from "react"

import { useTranslation } from "react-i18next"

import { useDragReorder } from "../../../hooks/index.js"

import { isRirEligible } from "../../../lib/effort.js"
import { exerciseName, mediaUrl } from "../../../lib/muscles.js"

import "./EditWorkoutView.css"

import { Button, GifFrame } from "../../atoms/index.js"
import { ReorderControls } from "../../molecules/index.js"
import { formatRestSecs } from "../../molecules/RestTimePicker/formatRest.js"
import { RestTimePicker } from "../../molecules/RestTimePicker/RestTimePicker.jsx"

const EMPTY = []
const NO_PROPS = {}

const restSecsOf = (ex) => {
  const n = Number(ex?.restSecs)
  return Number.isFinite(n) ? Math.min(1800, Math.max(5, Math.round(n))) : 60
}
const restEnabledOf = (ex) =>
  ex?.restEnabled === undefined ? true : Boolean(ex.restEnabled)
const rirEnabledOf = (ex) =>
  ex?.rirEnabled === undefined ? false : Boolean(ex.rirEnabled)

export const EditWorkoutView = ({
  list,
  onClose,
  onAddExercise,
  onCreateCustom,
  onRemoveExercise,
  onUpdateSettings,
  onReorderExercises,
}) => {
  const { t, i18n } = useTranslation()
  const [editingRestId, setEditingRestId] = useState(null)

  // Drag-to-reorder. Hook order is kept unconditional so it survives the
  // early return below.
  const canReorder = list != null && list.exercises.length > 1
  const { liftedIndex, offsetFor, handleProps, move } = useDragReorder({
    items: canReorder ? list.exercises : EMPTY,
    onDrop: (next) => onReorderExercises?.(list.id, next.map((ex) => ex.id)),
    disabled: !canReorder,
  })

  if (!list) return null

  const handleToggleRest = (ex) =>
    onUpdateSettings?.(list.id, ex.id, { restEnabled: !restEnabledOf(ex) })

  const handleToggleRir = (ex) =>
    onUpdateSettings?.(list.id, ex.id, { rirEnabled: !rirEnabledOf(ex) })

  const openRest = (ex) => {
    if (!restEnabledOf(ex)) {
      onUpdateSettings?.(list.id, ex.id, { restEnabled: true })
    }
    setEditingRestId(ex.id)
  }

  const activeEx = editingRestId
    ? list.exercises.find((e) => e.id === editingRestId)
    : null

  return (
    <div
      className="edit-workout-page"
      role="region"
      aria-labelledby="edit-workout-title"
    >
      <header className="edit-workout-page-header">
        <button
          type="button"
          className="edit-workout-back"
          onClick={onClose}
          aria-label={t("editWorkout.closeEditor")}
        >
          ←
        </button>
        <h1 id="edit-workout-title" className="edit-workout-page-title">
          {t("editWorkout.title", { name: list.name })}
        </h1>
      </header>

      <main className="edit-workout-page-body">
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
            {list.exercises.map((ex, index) => {
              const secs = restSecsOf(ex)
              const enabled = restEnabledOf(ex)
              const rirOn = rirEnabledOf(ex)
              const lifted = canReorder && liftedIndex === index
              const offset = canReorder ? offsetFor(index) : 0
              return (
                <li
                  key={ex.id}
                  data-drag-index={index}
                  className={`edit-workout-row sortable-row${lifted ? " is-lifted" : ""}`}
                  style={offset ? { transform: `translateY(${offset}px)` } : undefined}
                  {...(canReorder ? handleProps : NO_PROPS)}
                >
                  <ReorderControls
                    index={index}
                    total={list.exercises.length}
                    onNudge={(step) => move(index, step)}
                    gripLabel={t("editWorkout.dragHandle", { name: ex.name })}
                    upLabel={t("editWorkout.moveUp", { name: ex.name })}
                    downLabel={t("editWorkout.moveDown", { name: ex.name })}
                  />

                  <div className="edit-workout-row-main">
                    {mediaUrl(ex.image) ? (
                      <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                    ) : mediaUrl(ex.gif_url) ? (
                      <span className="workout-exercise-placeholder" aria-hidden="true">
                        <GifFrame src={mediaUrl(ex.gif_url)} />
                      </span>
                    ) : (
                      <span className="workout-exercise-placeholder" aria-hidden="true">💪</span>
                    )}
                    <span className="workout-exercise-name">
                      {exerciseName(
                        ex,
                        String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
                      )}
                    </span>
                    <Button
                      variant="icon"
                      tone="danger"
                      className="edit-workout-row-remove"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onRemoveExercise?.(list.id, ex.id)}
                      aria-label={t("editWorkout.removeAria", { name: ex.name })}
                    >
                      ✕
                    </Button>
                  </div>

                  {(ex.prescribedSets != null || ex.prescribedReps) && (
                    <p className="edit-workout-rx">
                      <span aria-hidden="true">🎯 </span>
                      {t("editWorkout.prescribed", {
                        sets: ex.prescribedSets ?? "–",
                        reps: ex.prescribedReps ?? "",
                      })}
                    </p>
                  )}

                  <div
                    className="edit-workout-settings"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="edit-workout-timer">
                      <span className="edit-workout-timer-label">{t("editWorkout.rest")}</span>

                      <button
                        type="button"
                        className={`rest-toggle ${enabled ? "is-on" : ""}`}
                        onClick={() => handleToggleRest(ex)}
                        aria-pressed={enabled}
                        aria-label={
                          enabled ? t("editWorkout.restTitleOn") : t("editWorkout.restTitleOff")
                        }
                        title={
                          enabled ? t("editWorkout.restTitleOn") : t("editWorkout.restTitleOff")
                        }
                      >
                        <span aria-hidden="true">⏱</span>
                      </button>

                      {/* Trigger: opens the bottom-sheet picker. */}
                      <button
                        type="button"
                        className={`rest-time-display ${enabled ? "is-on" : ""}`}
                        onClick={() => openRest(ex)}
                        aria-haspopup="dialog"
                        aria-expanded={editingRestId === ex.id}
                        aria-label={t("editWorkout.restFor", { name: ex.name })}
                      >
                        <span aria-hidden="true">⏱</span>
                        <span className="rest-time-value">
                          {enabled ? formatRestSecs(secs) : t("editWorkout.restOff")}
                        </span>
                      </button>
                    </div>

                    <div className="edit-workout-rir">
                      {isRirEligible(ex) ? (
                        <>
                          <button
                            type="button"
                            className={`rir-toggle ${rirOn ? "is-on" : ""}`}
                            onClick={() => handleToggleRir(ex)}
                            aria-pressed={rirOn}
                            title={
                              rirOn ? t("editWorkout.effortAriaOn") : t("editWorkout.effortAriaOff")
                            }
                          >
                            {rirOn ? t("editWorkout.effortOn") : t("editWorkout.effortOff")}
                          </button>
                          {rirOn && <p className="rir-hint">{t("editWorkout.effortHint")}</p>}
                        </>
                      ) : (
                        <p className="rir-hint">{t("editWorkout.effortNotEligible")}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <footer className="edit-workout-page-footer">
        <Button onClick={onClose}>{t("editWorkout.done")}</Button>
      </footer>

      {activeEx && (
        <RestTimePicker
          presentation="sheet"
          value={restSecsOf(activeEx)}
          onSelect={(next) => {
            onUpdateSettings?.(list.id, activeEx.id, {
              restSecs: next,
              restEnabled: true,
            })
            setEditingRestId(null)
          }}
          onClose={() => setEditingRestId(null)}
          ariaLabel={t("editWorkout.restFor", { name: activeEx.name })}
          formatValue={formatRestSecs}
        />
      )}
    </div>
  )
}