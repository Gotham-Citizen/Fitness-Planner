import { useState } from "react"

import { useTranslation } from "react-i18next"

import "./AllExercisesView.css"

import { Button } from "../../atoms/index.js"
import { MovementCard } from "../../molecules/index.js"

const PAGE_SIZE = 48

export const AllExercisesView = ({
  exercises,
  onSelectExercise,
  onSaveExercise,
  quickAddListId,
  addedIds,
}) => {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(PAGE_SIZE)
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