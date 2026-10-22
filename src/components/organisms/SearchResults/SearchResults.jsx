import { useTranslation } from "react-i18next"

import "./SearchResults.css"

import { Button } from "../../atoms/index.js"
import { MovementCard } from "../../molecules/index.js"

export const SearchResults = ({
  query,
  results,
  onSelectExercise,
  onSaveExercise,
  quickAddListId,
  addedIds,
  onClear,
  scopeLabel,
}) => {
  const { t } = useTranslation()
  return (
    <section className="movement-list">
      <div className="movement-list-header movement-list-header-row">
        <div>
          <h2 className="movement-list-title">{t("movement.resultsFor", { q: query.trim() })}</h2>
          <p className="movement-list-subtitle">
            {t("movement.found", { count: results.length })}
            {scopeLabel ? <> · {t("movement.inScope", { scope: scopeLabel })}</> : null}
          </p>
        </div>
      </div>
      {results.length === 0 ? (
        <div className="workouts-empty">
          <p>{t("movement.noMatch", { q: query.trim() })}</p>
          <Button variant="ghost" onClick={onClear}>
            {t("movement.clearSearch")}
          </Button>
        </div>
      ) : (
        <div className="movement-grid">
          {results.map((ex) => (
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
      )}
    </section>
  )
}