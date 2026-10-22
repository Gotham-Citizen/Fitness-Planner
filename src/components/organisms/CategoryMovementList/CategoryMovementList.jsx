import { useMemo } from "react"

import { useTranslation } from "react-i18next"

import { localizedCategory, localizedTarget } from "../../../lib/muscles.js"

import "./CategoryMovementList.css"

import { MovementCard } from "../../molecules/index.js"

export const CategoryMovementList = ({ category, exercises, onSelectExercise, onSaveExercise, quickAddListId, addedIds }) => {
  const { t } = useTranslation()
  const groupedExercises = useMemo(() => {
    if (!exercises) {
      return category.targets.map((tg) => ({ name: tg.name, exercises: tg.exercises || [], count: tg.count }))
    }
    const filtered = exercises.filter((ex) => ex.category === category.name)
    const groups = new Map()
    for (const ex of filtered) {
      if (!groups.has(ex.target)) {
        groups.set(ex.target, [])
      }
      groups.get(ex.target).push(ex)
    }
    const result = []
    for (const tg of category.targets) {
      result.push({
        name: tg.name,
        exercises: groups.get(tg.name) || [],
        count: groups.get(tg.name)?.length || 0,
      })
    }
    return result
  }, [exercises, category])

  return (
    <section className="movement-list">
      <div className="movement-list-header">
        <div>
          <h2 className="movement-list-title">{localizedCategory(category.name)}</h2>
          <p className="movement-list-subtitle">
            {t("movement.movements", { n: groupedExercises.reduce((sum, g) => sum + g.count, 0) })} · {t("movement.muscle", { count: groupedExercises.filter((g) => g.count > 0).length })}
          </p>
        </div>
      </div>
      {groupedExercises.map((tg) => (
        <div key={tg.name} className="movement-group">
          <h3 className="movement-group-title">
            {localizedTarget(tg.name)} · {t("movement.movements", { n: tg.count })}
          </h3>
          <div className="movement-grid">
            {tg.exercises.map((ex) => (
              <MovementCard key={ex.id} exercise={ex} onSelect={onSelectExercise} onSave={onSaveExercise} quickAddActive={Boolean(quickAddListId)} isAdded={addedIds?.has(ex.id)} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
