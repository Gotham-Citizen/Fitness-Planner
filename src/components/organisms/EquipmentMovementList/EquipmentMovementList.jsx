import { useTranslation } from "react-i18next"

import { localizedEquipment, titleCase } from "../../../lib/muscles.js"

import { MovementCard } from "../../molecules/index.js"

/**
 * Main-page view for one equipment scope (e.g. "Barbell"): header with the
 * localized equipment name + movement count, then the movement card grid.
 * Mirrors MovementList / CategoryMovementList.
 */
export const EquipmentMovementList = ({ equipment, toolbar, exercises, onSelectExercise, onSaveExercise, quickAddListId, addedIds }) => {
  const { t } = useTranslation()
  const list = exercises || []
  return (
    <section className="movement-list">
      <div className="movement-list-header">
        <div>
          <h2 className="movement-list-title">{titleCase(localizedEquipment(equipment))}</h2>
          <p className="movement-list-subtitle">{t("movement.movements", { n: list.length })}</p>
        </div>
      </div>
      {toolbar}
      <div className="movement-grid">
        {list.map((ex) => (
          <MovementCard key={ex.id} exercise={ex} onSelect={onSelectExercise} onSave={onSaveExercise} quickAddActive={Boolean(quickAddListId)} isAdded={addedIds?.has(ex.id)} />
        ))}
      </div>
    </section>
  )
}
