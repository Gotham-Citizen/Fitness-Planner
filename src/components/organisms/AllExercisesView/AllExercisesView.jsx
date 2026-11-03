import { useEffect, useState } from "react"

import { useTranslation } from "react-i18next"

import "./AllExercisesView.css"

import { Button } from "../../atoms/index.js"
import { MovementCard } from "../../molecules/index.js"

// "Show more" progress persists across movement-detail round-trips (the
// planner unmounts, which would otherwise reset the visible page size).
const PAGE_SIZE = 48
const VISIBLE_KEY = "all-exercises-visible"

const loadVisible = () => {
  try {
    const v = Number(sessionStorage.getItem(VISIBLE_KEY))
    return Number.isFinite(v) && v >= PAGE_SIZE ? v : PAGE_SIZE
  } catch {
    return PAGE_SIZE
  }
}

export const AllExercisesView = ({
  exercises,
  toolbar,
  onSelectExercise,
  onSaveExercise,
  quickAddListId,
  addedIds,
}) => {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(loadVisible)

  // Keep "Show more" progress alive across remounts.
  useEffect(() => {
    try {
      sessionStorage.setItem(VISIBLE_KEY, String(visible))
    } catch {
      // ignore (storage unavailable)
    }
  }, [visible])

  const sorted = exercises || []
  const shown = sorted.slice(0, visible)

  return (
    <section className="movement-list">
      <div className="movement-list-header">
        <div>
          <h2 className="movement-list-title">{t("movement.planTitle")}</h2>
          <p className="movement-list-subtitle">
            {t("movement.browseLead")}{" "}
            <strong>{t("movement.browseCount", { n: sorted.length.toLocaleString() })}</strong>{" "}
            {t("movement.browseRest")}
          </p>
        </div>
      </div>
      {toolbar}
      <div className="movement-grid">
        {shown.map((ex) => (
          <MovementCard
            key={ex.id}
            exercise={ex}
            onSelect={onSelectExercise}
            onSave={onSaveExercise}
            quickAddActive={Boolean(quickAddListId)}
            isAdded={addedIds?.has(ex.id)}
          />
        ))}
      </div>
      <div className="browse-more">
        <span>{t("movement.showing", { a: shown.length, b: sorted.length.toLocaleString() })}</span>
        {visible < sorted.length && (
          <Button variant="ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            {t("movement.showMore")}
          </Button>
        )}
      </div>
    </section>
  )
}