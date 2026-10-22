import { useTranslation } from "react-i18next"

import { deltaColor, formatWeighInDate } from "../../../lib/bodyweightChart.js"
import { localeFromI18n } from "../../../utils/locale.js"

import { Button } from "../../atoms/index.js"
import { ModalShell } from "../ModalShell/ModalShell.jsx"

export const WeighInsModal = ({ groups, unit, deletingId, onDeleteWeighIn, onClose }) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const total = groups.reduce((n, week) => n + week.n, 0)
  const fmt = (iso) => formatWeighInDate(iso, locale)
  return (
    <ModalShell
      dialogClassName="weigh-ins-modal"
      label={t("weighins.title")}
      title={t("weighins.count", { n: total })}
      titleAs="h3"
      onClose={onClose}
      closeLabel={t("weighins.close")}
      footer={(
        <Button onClick={onClose}>
          {t("weighins.done")}
        </Button>
      )}
    >
      {groups.length === 0 ? (
            <p className="balance-hint">{t("weighins.empty")}</p>
          ) : (
            <div className="bw-history-weeks">
              {groups.map((week) => (
                <section key={week.key} data-week={week.key} aria-label={t("weighins.weekOf", { date: fmt(`${week.key}T12:00:00`) })}>
                  <div className="bw-week-head">
                    <span className="bw-week-title">{t("weighins.weekOf", { date: fmt(`${week.key}T12:00:00`) })}</span>
                    <span className="bw-week-average">{t("weighins.average", { v: week.avg, u: unit })}</span>
                    {week.delta !== null && (
                      <span className="bw-week-delta" style={{ color: deltaColor(week.delta) }}>
                        {week.delta > 0 ? "+" : ""}{week.delta} {unit}
                      </span>
                    )}
                  </div>
                  <ul className="bw-history-list">
                    {week.entries.map((w) => (
                      <li key={w.id} className="bw-history-row">
                        <span className="bw-history-date">{fmt(w.loggedAt)}</span>
                        <span className="bw-history-value">{w.weight} {w.unit}</span>
                        <Button
                          variant="ghost"
                          size="detail-small"
                          tone="danger"
                          onClick={() => onDeleteWeighIn(w.id)}
                          disabled={deletingId === w.id}
                          aria-label={t("weighins.deleteAria", { date: fmt(w.loggedAt) })}
                        >
                          {deletingId === w.id ? t("weighins.deleting") : t("weighins.delete")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
    </ModalShell>
  )
}
