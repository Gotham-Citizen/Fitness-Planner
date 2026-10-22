import { useTranslation } from "react-i18next"

import { exerciseName, localizedEquipment, mediaUrl } from "../../../lib/muscles.js"

import "./MovementCard.css"

export const MovementCard = ({ exercise, onSelect, onSave, quickAddActive, isAdded, lang }) => {
  const { t, i18n } = useTranslation()
  const l = lang || (String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en")
  const name = exerciseName(exercise, l)
  const img = mediaUrl(exercise.image)
  const added = quickAddActive && isAdded
  return (
    <div className="movement-card">
      <button type="button" className="movement-card-open" onClick={() => onSelect(exercise)} aria-label={t("movement.openAria", { name })}>
        <span className="movement-card-media" aria-hidden="true">
          {img ? (
            <img src={img} alt="" loading="lazy" />
          ) : (
            <span className="movement-card-placeholder">💪</span>
          )}
        </span>
        <span className="movement-card-body">
          <span className="movement-card-name">{name}</span>
          <span className="movement-card-equipment">{localizedEquipment(exercise.equipment)}</span>
        </span>
      </button>
      {onSave && (
        <button
          type="button"
          className={`movement-card-add${added ? " is-added" : ""}`}
          onClick={(e) => {
            e.stopPropagation()
            if (added) return
            onSave(exercise)
          }}
          disabled={added}
          aria-label={added ? t("movement.savedAria", { name }) : t("movement.saveAria", { name })}
          title={added ? t("movement.savedAria", { name }) : t("movement.saveAria", { name })}
        >
          {added ? t("movement.added") : t("movement.add")}
        </button>
      )}
    </div>
  )
}
