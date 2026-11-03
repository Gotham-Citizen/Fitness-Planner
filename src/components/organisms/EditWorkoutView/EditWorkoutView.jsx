import { useTranslation } from "react-i18next"

import { useDragReorder } from "../../../hooks/index.js"

import { isRirEligible } from "../../../lib/effort.js"
import { exerciseName, mediaUrl } from "../../../lib/muscles.js"

import "./EditWorkoutView.css"

import { Button, GifFrame } from "../../atoms/index.js"
import { ModalShell, ReorderControls, RestTimeDisplay } from "../../molecules/index.js"
import { formatRestSecs } from "../../molecules/RestTimePicker/formatRest.js"

// Stable identity for the drag hook when reordering is unavailable, so it never
// sees a fresh array on every render (which would restart its gesture book).
const EMPTY = []
const NO_PROPS = {}

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

export const EditWorkoutView = ({ list, onClose, onAddExercise, onCreateCustom, onRemoveExercise, onUpdateSettings, onReorderExercises }) => {
  const { t, i18n } = useTranslation()

  // Drag-to-reorder. The hook owns one gesture for the whole list and hands
  // back a per-row transform plus a `move` action. Order stays derived from
  // `list.exercises` — the hook holds no shadow copy, so a server re-render
  // and a local move can never drift apart.
  // Kept above the early return below so hook order stays unconditional.
  const canReorder = list != null && list.exercises.length > 1
  const { liftedIndex, offsetFor, handleProps, move } = useDragReorder({
    items: canReorder ? list.exercises : EMPTY,
    onDrop: (next) => onReorderExercises?.(list.id, next.map((ex) => ex.id)),
    disabled: !canReorder,
  })

  if (!list) return null

  const handleToggleRest = (ex) => {
    onUpdateSettings?.(list.id, ex.id, { restEnabled: !restEnabledOf(ex) })
  }

  const handleRestEnableAndOpen = (ex) => {
    onUpdateSettings?.(list.id, ex.id, { restEnabled: true })
  }

  const handleRestChange = (ex, restSecs) => {
    onUpdateSettings?.(list.id, ex.id, { restSecs, restEnabled: true })
  }

  const handleToggleRir = (ex) => {
    onUpdateSettings?.(list.id, ex.id, { rirEnabled: !rirEnabledOf(ex) })
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
                      onNudge={(offsetStep) => move(index, offsetStep)}
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
                        {exerciseName(ex, String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en")}
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

                    <div className="edit-workout-settings" onPointerDown={(e) => e.stopPropagation()}>
                      <div className="edit-workout-timer">
                        <span className="edit-workout-timer-label">{t("editWorkout.rest")}</span>
                        <button
                          type="button"
                          className={`rest-toggle ${enabled ? "is-on" : ""}`}
                          onClick={() => handleToggleRest(ex)}
                          aria-pressed={enabled}
                          aria-label={enabled ? t("editWorkout.restTitleOn") : t("editWorkout.restTitleOff")}
                          title={enabled ? t("editWorkout.restTitleOn") : t("editWorkout.restTitleOff")}
                        >
                          <span aria-hidden="true">⏱</span>
                        </button>
                        <RestTimeDisplay
                          enabled={enabled}
                          secs={secs}
                          offLabel={t("editWorkout.restOff")}
                          ariaLabel={t("editWorkout.restFor", { name: ex.name })}
                          onToggleAndOpen={() => handleRestEnableAndOpen(ex)}
                          onChange={(next) => handleRestChange(ex, next)}
                          showValue="outside"
                          formatValue={formatRestSecs}
                        />
                      </div>

                      <div className="edit-workout-rir">
                        {isRirEligible(ex) ? (
                          <>
                            <button
                              type="button"
                              className={`rir-toggle ${rirOn ? "is-on" : ""}`}
                              onClick={() => handleToggleRir(ex)}
                              aria-pressed={rirOn}
                              title={rirOn ? t("editWorkout.effortAriaOn") : t("editWorkout.effortAriaOff")}
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
    </ModalShell>
  )
}