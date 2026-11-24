import { useMemo } from "react"

import { useTranslation } from "react-i18next"

import { computePersonalRecords } from "../../../lib/personalRecords.js"

import "./PersonalRecordsCard.css"

import { Button } from "../../atoms/index.js"

/**
 * Personal records card — header only. The full list lives on
 * `PersonalRecordsPage`; clicking "View more" asks the parent to navigate
 * there via `onViewMore`. `sessions` / `exercises` are only used to enable
 * or disable the button.
 */
export const PersonalRecordsCard = ({
  sessions,
  exercises,
  onViewMore,
}) => {
  const { t } = useTranslation()

  const hasAny = useMemo(
    () => computePersonalRecords(sessions, { limit: 1, exercises }).length > 0,
    [sessions, exercises],
  )

  return (
    <div className="balance-card balance-open-card journal-pr-card">
      <div className="balance-open-text">
        <h3>{t("journal.personalRecords")}</h3>
        <p className="panel-subtitle">{t("journal.personalRecordsSub")}</p>
      </div>
      <Button
        variant="primary"
        size="detail-small"
        onClick={() => onViewMore?.()}
        disabled={!hasAny}
      >
        {t("journal.prViewMore")}
      </Button>
    </div>
  )
}