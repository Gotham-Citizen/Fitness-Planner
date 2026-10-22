import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { groupExercisesByEquipment } from "../../../lib/equipmentGroups.js"
import { exerciseName, localizedEquipment, mediaUrl, titleCase } from "../../../lib/muscles.js"
import { normalizeLang } from "../../../utils/locale.js"

import "./ExerciseBrowser.css"

import { EquipmentImage } from "../../atoms/index.js"

// Equipment picker -> drill-down into one equipment's exercises.
// `exercises` arrive pre-sorted (alpha / difficulty toggles upstream);
// `onSelectExercise` behaves exactly like the old equipment rows.
export const ExerciseBrowser = ({ exercises, onSelectExercise }) => {
  // State
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)
  const [selectedEquipment, setSelectedEquipment] = useState(null)

  // Hooks
  // Most exercises first (ties A to Z by label); "other" always sinks last.
  const groups = useMemo(() => {
    const withLabels = groupExercisesByEquipment(exercises).map((g) => ({
      ...g,
      label: titleCase(localizedEquipment(g.key)),
    }))
    withLabels.sort((a, b) => {
      if (a.key === "other") return 1
      if (b.key === "other") return -1
      const byCount = b.exercises.length - a.exercises.length
      if (byCount !== 0) return byCount
      return a.label.localeCompare(b.label, lang === "zh" ? "zh" : "en")
    })
    return withLabels
  }, [exercises, lang])

  // Values
  const activeGroup = selectedEquipment
    ? groups.find((g) => g.key === selectedEquipment)
    : null

  // Picker: one card per equipment type.
  if (!activeGroup) {
    return (
      <div className="equipment-browser">
        <ul className="equipment-grid">
          {groups.map((g) => (
            <li key={g.key}>
              <button
                type="button"
                className="equipment-card"
                onClick={() => setSelectedEquipment(g.key)}
                aria-label={t("library.equipmentPickAria", { name: g.label, n: g.exercises.length })}
              >
                <EquipmentImage equipment={g.key} className="equipment-card-icon" />
                <span className="equipment-card-name">{g.label}</span>
                <span className="equipment-card-count" aria-hidden="true">{g.exercises.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Drill-down: fixed header, scrollable exercise list.
  return (
    <div className="equipment-browser">
      <div className="equipment-drilldown-head">
        <button
          type="button"
          className="equipment-back"
          onClick={() => setSelectedEquipment(null)}
        >
          <span aria-hidden="true">←</span>
          <span>{t("library.equipmentBack")}</span>
        </button>
        <div className="equipment-drilldown-title">
          <EquipmentImage equipment={activeGroup.key} className="equipment-drilldown-icon" />
          <span className="equipment-drilldown-name">{activeGroup.label}</span>
          <span className="equipment-drilldown-count" aria-hidden="true">
            {activeGroup.exercises.length}
          </span>
        </div>
      </div>
      <ul
        className="equipment-rows"
        aria-label={t("library.equipmentExercisesAria", { name: activeGroup.label })}
      >
        {activeGroup.exercises.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              className="equipment-row"
              onClick={() => onSelectExercise?.(ex)}
            >
              <span className="muscle-thumb">
                {ex.image ? (
                  <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">💪</span>
                )}
              </span>
              <span className="muscle-label">{exerciseName(ex, lang)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
