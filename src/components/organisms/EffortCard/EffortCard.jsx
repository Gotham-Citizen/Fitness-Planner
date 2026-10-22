import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { effortHistogram, effortSummary, effortWeeks, HARD_RIR, HARD_RPE, hasEffort, normalizeEffortScale, rirToRpe } from "../../../lib/effort.js"
import { localeFromI18n } from "../../../utils/locale.js"

import "./EffortCard.css"

import { LineChart } from "../../atoms/index.js"
import { ChartPanel, RangeTabs } from "../../molecules/index.js"


const RANGES = [
  { id: 30, key: "bw.range1M" },
  { id: 90, key: "bw.range3M" },
  { id: 365, key: "bw.range1Y" },
  { id: 0, key: "bw.rangeAll" },
]

const fmtEffort = (v) => {
  return (Math.round(v * 10) / 10).toFixed(1)
}

export const EffortCard = ({ sessions, effortScale }) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const [range, setRange] = useState(90)
  const scale = normalizeEffortScale(effortScale)
  const isRpe = scale === "rpe"
  const unit = isRpe ? "RPE" : "RIR"
  const anyEffort = useMemo(() => hasEffort(sessions), [sessions])
  const summary = useMemo(() => effortSummary(sessions, range), [sessions, range])
  const weeks = useMemo(() => effortWeeks(sessions, range), [sessions, range])
  const histogram = useMemo(() => effortHistogram(sessions, range), [sessions, range])
  const points = useMemo(
    () => weeks.map((w) => ({
      t: w.t,
      y: isRpe ? rirToRpe(w.rir) : w.rir,
      note: `${w.sets} set${w.sets === 1 ? "" : "s"}`,
    })),
    [weeks, isRpe],
  )
  const maxBin = useMemo(() => Math.max(1, ...histogram.map((b) => b.n)), [histogram])
  const avgDisplay = useMemo(
    () => (summary.avg == null ? null : (isRpe ? rirToRpe(summary.avg) : summary.avg)),
    [summary.avg, isRpe],
  )

  if (!anyEffort) return null

  const hardLabel = isRpe ? fmtEffort(HARD_RPE) : fmtEffort(HARD_RIR)

  return (
    <section className="balance-card metric-card" aria-label={t("effort.title")}>
      <div className="metric-card-head">
        <div>
          <h3>{t("effort.title")} <span className="metric-delta" style={{ textTransform: "none", letterSpacing: 0 }}>{t("effort.subtitle")}</span></h3>
        </div>
      </div>

      <RangeTabs
        options={RANGES}
        value={range}
        onChange={setRange}
        ariaLabel={t("effort.range")}
        renderLabel={(r) => t(r.key)}
      />
      {summary.rated === 0 ? (
        <p className="balance-hint">{t("effort.noRated")}</p>
      ) : (
        <>
          <div className="metric-stats">
            <div>
              <div className="metric-stat-v">{avgDisplay == null ? "–" : `${fmtEffort(avgDisplay)} ${unit}`}</div>
              <div className="metric-stat-label">{t("effort.avg")}</div>
            </div>
            <div style={{ textAlign: "end" }}>
              <div className="metric-stat-v" style={{ color: "var(--yellow, var(--accent))" }}>{summary.hardPct == null ? "–" : `${Math.round(summary.hardPct * 100)}%`}</div>
              <div className="metric-stat-label">{t("effort.hardOf", { v: hardLabel, u: unit })}</div>
            </div>
          </div>
          <div className="metric-coverage">{t("effort.coverage", { rated: summary.rated, done: summary.done })}</div>
          {points.length > 1 && (
            <>
              <h4 className="metric-sec">{t("effort.weekByWeek")}</h4>
              <ChartPanel ariaLabel={t("effort.chartAria", { u: unit, n: points.length })}>
                <LineChart points={points} h={140} unit={unit} color="var(--yellow, var(--accent))" invert={!isRpe} locale={locale} />
              </ChartPanel>
            </>
          )}
          <h4 className="metric-sec">{t("effort.whereLand")}</h4>
          {histogram.map((b) => {
            const label = isRpe
              ? (b.tail ? `${unit} 6-` : `${unit} ${10 - b.rir}`)
              : (b.tail ? `${unit} ${b.rir}+` : `${unit} ${b.rir}`)
            return (
              <div key={b.tail ? "tail" : b.rir} className="mrow">
                <span className="nm">{label}</span>
                <span className="bar">
                  <i
                    style={{
                      width: `${Math.round((b.n / maxBin) * 100)}%`,
                      background: b.rir <= HARD_RIR ? "var(--yellow, var(--accent))" : "var(--text-muted)",
                    }}
                  />
                </span>
                <span className="v">{b.n ? `${b.n} · ${Math.round(b.pct * 100)}%` : "–"}</span>
              </div>
            )
          })}
          <div className="metric-coverage">
            {t("effort.footnote")}
          </div>
        </>
      )}
    </section>
  )
}
