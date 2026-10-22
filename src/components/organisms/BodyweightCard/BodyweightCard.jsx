import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { fromKg,toKg } from "../../../lib/bodyweight.js"
import {
  deltaColor,
  pointsInRange,
  toDateInputValue,
  weeklyGroups,
  weighInPoints,
} from "../../../lib/bodyweightChart.js"
import { localeFromI18n } from "../../../utils/locale.js"

import "./BodyweightCard.css"

import { Button, FieldError, LineChart, TextInput } from "../../atoms/index.js"
import { ChartPanel, RangeTabs, WeighInsModal } from "../../molecules/index.js"


const RANGES = [
  { id: 30, key: "bw.range1M" },
  { id: 90, key: "bw.range3M" },
  { id: 365, key: "bw.range1Y" },
  { id: 0, key: "bw.rangeAll" },
]

export const BodyweightCard = ({
  user,
  weighIns,
  loading,
  onLogWeighIn,
  onDeleteWeighIn,
  onSetGoal,
  saving,
}) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const [range, setRange] = useState(90)
  const [showLog, setShowLog] = useState(false)
  const [showGoal, setShowGoal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [weightDraft, setWeightDraft] = useState("")
  const [dateDraft, setDateDraft] = useState(() => toDateInputValue())
  const [goalDraft, setGoalDraft] = useState(user?.targetWeight != null ? String(user.targetWeight) : "")
  const [formError, setFormError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const unit = user?.bodyweightUnit || "kg"
  const points = useMemo(() => weighInPoints(weighIns, unit), [weighIns, unit])
  const windowed = useMemo(() => pointsInRange(points, range), [points, range])
  const current = points.length ? points[points.length - 1] : null
  const groups = useMemo(() => weeklyGroups(weighIns, unit), [weighIns, unit])
  // Week-over-week change of the current week's average (null until 2 weeks).
  const change = groups.length > 0 ? groups[0].delta : null
  // Goal is stored in the profile unit (same convention as the bodyweight field).
  const goalDisplay = user?.targetWeight != null
    ? Math.round(fromKg(toKg(user.targetWeight, user?.bodyweightUnit || "kg"), unit) * 10) / 10
    : null
  const history = groups

  const submitLog = async () => {
    const n = Number(weightDraft)
    if (!(n > 0 && n < 1500)) {
      setFormError(t("bw.positiveWeight"))
      return
    }
    try {
      setFormError(null)
      const loggedAt = dateDraft ? new Date(`${dateDraft}T12:00:00`).toISOString() : null
      await onLogWeighIn?.({ weight: n, unit, loggedAt })
      setWeightDraft("")
      setShowLog(false)
    } catch (err) {
      setFormError(err?.message || t("bw.failedLog"))
    }
  }

  const submitGoal = async () => {
    const trimmed = String(goalDraft || "").trim()
    if (trimmed === "") {
      try {
        setFormError(null)
        await onSetGoal?.(null)
        setShowGoal(false)
      } catch (err) {
        setFormError(err?.message || t("bw.failedClearGoal"))
      }
      return
    }
    const n = Number(trimmed)
    if (!(n > 0 && n < 1500)) {
      setFormError(t("bw.positiveGoal"))
      return
    }
    try {
      setFormError(null)
      await onSetGoal?.(n)
      setShowGoal(false)
    } catch (err) {
      setFormError(err?.message || t("bw.failedGoal"))
    }
  }

  const removeEntry = async (id) => {
    try {
      setDeletingId(id)
      await onDeleteWeighIn?.(id)
    } catch {
      // toast handled upstream; keep list as-is
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="balance-card metric-card" aria-label={t("bw.title")}>
      <div className="metric-card-head">
        <div>
          <h3>{t("bw.title")}</h3>
          {loading ? (
            <p className="panel-subtitle">{t("bw.loading")}</p>
          ) : current ? (
            <p className="panel-subtitle">
              <span className="metric-current">{current.y} {unit}</span>
              {change !== null && (
                <span className="metric-delta" style={{ color: deltaColor(change) }}>
                  {" "}({change > 0 ? "+" : ""}{change} {unit}{t("bw.perWeek")})
                </span>
              )}
            </p>
          ) : (
            <p className="panel-subtitle">{t("bw.empty")}</p>
          )}
        </div>
        <div className="metric-card-actions">
          <Button
            variant="ghost"
            size="detail-small"
            onClick={() => { setShowGoal((s) => !s); setShowLog(false); setFormError(null); setGoalDraft(user?.targetWeight != null ? String(user.targetWeight) : "") }}
          >
            {user?.targetWeight != null ? t("bw.goalWith", { v: user.targetWeight, u: unit }) : t("bw.goal")}
          </Button>
          {points.length > 0 && (
            <Button variant="ghost" size="detail-small" onClick={() => setShowHistoryModal(true)}>
              {t("bw.allWeighIns", { n: points.length })}
            </Button>
          )}
          <Button
            size="detail-small"
            onClick={() => { setShowLog((s) => !s); setShowGoal(false); setFormError(null) }}
          >
            {t("bw.log")}
          </Button>
        </div>
      </div>

      {showLog && (
        <div className="bw-form">
          <label className="auth-label">
            {t("bw.weight", { u: unit })}
            <TextInput
              type="number"
              min="20"
              max="1500"
              step="0.1"
              value={weightDraft}
              onChange={(e) => { setWeightDraft(e.target.value); setFormError(null) }}
              placeholder={t("bw.weightPh")}
              aria-label={t("bw.weightAria")}
              autoFocus
            />
          </label>
          <label className="auth-label">
            {t("bw.date")}
            <TextInput
              type="date"
              value={dateDraft}
              onChange={(e) => { setDateDraft(e.target.value); setFormError(null) }}
              aria-label={t("bw.dateAria")}
            />
          </label>
          <Button size="detail-small" onClick={submitLog} disabled={saving || !(Number(weightDraft) > 0)}>
            {saving ? t("bw.saving") : t("bw.saveWeighIn")}
          </Button>
          <FieldError error={formError} />
        </div>
      )}

      {showGoal && (
        <div className="bw-form">
          <label className="auth-label">
            {t("bw.goalWeight", { u: unit })}
            <TextInput
              type="number"
              min="20"
              max="1500"
              step="0.1"
              value={goalDraft}
              onChange={(e) => { setGoalDraft(e.target.value); setFormError(null) }}
              placeholder={t("bw.goalPh")}
              aria-label={t("bw.goalAria")}
              autoFocus
            />
          </label>
          <Button size="detail-small" onClick={submitGoal} disabled={saving}>
            {saving ? t("bw.saving") : t("bw.saveGoal")}
          </Button>
          <FieldError error={formError} />
        </div>
      )}

      {points.length > 0 && (
        <>
          <RangeTabs
            options={RANGES}
            value={range}
            onChange={setRange}
            ariaLabel={t("bw.range")}
            renderLabel={(r) => t(r.key)}
          />
          {windowed.length > 0 ? (
            <ChartPanel ariaLabel={t("bw.chartAria", { n: windowed.length })}>
              <LineChart points={windowed} goal={goalDisplay} unit={unit} locale={locale} />
            </ChartPanel>
          ) : (
            <p className="balance-hint">{t("bw.noInRange")}</p>
          )}
        </>
      )}

      {showHistoryModal && (
        <WeighInsModal
          groups={history}
          unit={unit}
          deletingId={deletingId}
          onDeleteWeighIn={removeEntry}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </section>
  )
}
