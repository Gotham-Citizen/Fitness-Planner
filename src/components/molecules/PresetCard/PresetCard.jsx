import { useState } from "react"

import { useTranslation } from "react-i18next"

import { exerciseName } from "../../../lib/muscles.js"
import { equipmentName, goalName, levelName, presetDesc, presetName } from "../../../lib/presets/index.js"

import "./PresetCard.css"

import { Button } from "../../atoms/index.js"

// One preset in the browser. Collapsed: summary + badges; expanded: the full
// exercise list with sets/reps/rest prescriptions and an Add-as-list action.
export const PresetCard = ({ preset, onAdd, onOpenExercise, adding = false }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [expanded, setExpanded] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAdd = async () => {
    const ok = await onAdd?.(preset)
    if (ok) setAdded(true)
  }

  const restLabel = (secs) => {
    if (secs >= 60) {
      const minutes = Math.floor(secs / 60)
      const rest = secs % 60
      return t("presets.restMixed", { minutes, seconds: rest })
    }
    return t("presets.restSecs", { count: secs })
  }

  return (
    <article className={`preset-card${expanded ? " is-expanded" : ""}`}>
      <div className="preset-card-badges">
        <span className="preset-badge preset-badge-goal">
          <span aria-hidden="true">{preset.goalIcon}</span> {goalName(preset.goal, lang)}
        </span>
        <span className="preset-badge">{equipmentName(preset.equipment, lang)}</span>
        <span className="preset-badge">{levelName(preset.level, lang)}</span>
        <span className="preset-badge">
          {t("presets.durationMinutes", { count: preset.durationMin })}
        </span>
      </div>

      <h3 className="preset-card-name">{presetName(preset, lang)}</h3>
      <p className="preset-card-desc">{presetDesc(preset, lang)}</p>

      <div className="preset-card-focus">
        {preset.focusLabels.slice(0, 4).map((label) => (
          <span key={label} className="preset-focus-chip">{label}</span>
        ))}
        {preset.focusLabels.length > 4 && (
          <span className="preset-focus-chip">+{preset.focusLabels.length - 4}</span>
        )}
      </div>

      <Button
        variant="secondary"
        className="preset-card-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? t("presets.hideExercises") : t("presets.viewExercises", { count: preset.totalCount })}
      </Button>

      {expanded && (
        <div className="preset-card-detail">
          <ul className="preset-slot-list">
            {preset.slots.map((slot, index) => {
              const name = slot.exercise
                ? exerciseName(slot.exercise, lang)
                : slot.exerciseName || slot.exercise
              return (
                <li key={`${slot.exercise}-${index}`} className={`preset-slot${slot.exercise ? "" : " is-missing"}`}>
                  <span className="preset-slot-index" aria-hidden="true">{index + 1}</span>
                  {slot.exercise ? (
                    <button
                      type="button"
                      className="preset-slot-name"
                      onClick={() => onOpenExercise?.(slot.exercise)}
                    >
                      {name}
                    </button>
                  ) : (
                    <span className="preset-slot-name">{name}</span>
                  )}
                  <span className="preset-slot-rx">
                    {t("presets.setsReps", { sets: slot.sets, reps: slot.reps })}
                    <span className="preset-slot-rest">· {restLabel(slot.restSecs)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <Button
            className="preset-card-add"
            disabled={adding || added || preset.availableCount === 0}
            onClick={handleAdd}
          >
            {added
              ? t("presets.added")
              : adding
                ? t("presets.adding")
                : t("presets.addAsList")}
          </Button>
          {preset.availableCount < preset.totalCount && (
            <p className="preset-card-note">{t("presets.someUnavailable", {
              found: preset.availableCount,
              total: preset.totalCount,
            })}</p>
          )}
        </div>
      )}
    </article>
  )
}
