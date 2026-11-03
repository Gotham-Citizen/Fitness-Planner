import { useMemo } from "react"

import { useTranslation } from "react-i18next"

import { groupExercisesByEquipment } from "../../../lib/equipmentGroups.js"
import { localizedEquipment, titleCase } from "../../../lib/muscles.js"
import { normalizeLang } from "../../../utils/locale.js"

import "./ExerciseBrowser.css"

import { EquipmentImage } from "../../atoms/index.js"

// Equipment picker: one card per equipment type. Selecting a card hands
// the equipment scope to the main page (which lists its exercises) and
// the library drawer closes — no in-drawer drill-down anymore.
export const ExerciseBrowser = ({ exercises, onSelectEquipment }) => {
  // Hooks
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)

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

  // Picker: one card per equipment type.
  return (
    <div className="equipment-browser">
      <ul className="equipment-grid">
        {groups.map((g) => (
          <li key={g.key}>
            <button
              type="button"
              className="equipment-card"
              onClick={() => onSelectEquipment?.(g.key)}
              aria-label={t("library.equipmentPickAria", { name: g.label, n: g.exercises.length })}
            >
              <EquipmentImage equipment={g.key} className="equipment-card-icon" />
              <span className="equipment-card-name">{g.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
