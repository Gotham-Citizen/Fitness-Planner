import { useTranslation } from "react-i18next"

import { localizedCategory, localizedTarget } from "../../../lib/muscles.js"

import { MovementCard } from "../../molecules/index.js"

export const MovementList = ({ target, categoryLabel, exercises, onSelectExercise, onSaveExercise, quickAddListId, addedIds }) => {
  const { t } = useTranslation()
  const filtered = exercises ? exercises.filter((ex) => ex.target === target.name) : target.exercises || []
  return (
    <section className="movement-list">
      <div className="movement-list-header">
        <div>
          <h2 className="movement-list-title">{localizedTarget(target.name)}</h2>
          <p className="movement-list-subtitle">
            {localizedCategory(categoryLabel)} · {t("movement.movements", { n: filtered.length })}
          </p>
        </div>
      </div>
      <div className="movement-grid">
        {filtered.map((ex) => (
          <MovementCard key={ex.id} exercise={ex} onSelect={onSelectExercise} onSave={onSaveExercise} quickAddActive={Boolean(quickAddListId)} isAdded={addedIds?.has(ex.id)} />
        ))}
      </div>
    </section>
  )
}
