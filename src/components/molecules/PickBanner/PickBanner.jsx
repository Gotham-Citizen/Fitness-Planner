import { useTranslation } from "react-i18next"

import "./PickBanner.css"

import { Button } from "../../atoms/index.js"

/**
 * Pending-add banner shown while picking an exercise for a list (molecule).
 */
export const PickBanner = ({ listName, addedExerciseName, onDone, onCancel }) => {
  const { t } = useTranslation()
  return (
    <div className="pick-banner" role="status">
      <span className="pick-banner-text">
        {t("home.addingTo", { name: listName })}
        {addedExerciseName ? (
          <> {t("home.added", { name: addedExerciseName })}</>
        ) : (
          <> {t("home.addHint")}</>
        )}
      </span>
      <div className="pick-banner-actions">
        <Button onClick={onDone}>
          {t("home.done")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("home.cancel")}
        </Button>
      </div>
    </div>
  )
}
