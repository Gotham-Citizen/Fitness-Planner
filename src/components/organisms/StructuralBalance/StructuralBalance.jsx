import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { exerciseName as localizedExName } from "../../../lib/muscles.js"
import { computeBalance } from "../../../lib/structuralBalance.js"
import { BALANCE_STATUSES,DEFAULT_TEMPLATE_ID, EVALUATION_MODES, TEMPLATE_LIST } from "../../../lib/structuralBalanceTemplates.js"

import "./StructuralBalance.css"

import { RangeTabs } from "../../molecules/index.js"

const exerciseName = (exercises, id, lang) => {
  const ex = (exercises || []).find((e) => e.id === id)
  return ex ? localizedExName(ex, lang) : id
}

export const StructuralBalance = ({ sessions, exercises, bodyweightKg, gender }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID)
  const statusLabel = (s) => {
    if (s === BALANCE_STATUSES.BALANCED) return t("structural.balanced")
    if (s === BALANCE_STATUSES.BORDERLINE) return t("structural.borderline")
    if (s === BALANCE_STATUSES.WEAK) return t("structural.weak")
    return t("structural.noData")
  }
  const template = useMemo(
    () => TEMPLATE_LIST.find((t) => t.id === templateId) || TEMPLATE_LIST[0],
    [templateId],
  )
  const rows = useMemo(
    () => computeBalance({ sessions, exercises, template, bodyweightKg, gender }),
    [sessions, exercises, template, bodyweightKg, gender],
  )
  const balanced = rows.filter((r) => r.status === BALANCE_STATUSES.BALANCED).length

  return (
    <section className="balance-section" aria-label={t("structural.title")}>
      <div className="balance-section-head">
        <h3>{t("structural.title")}</h3>
        <p className="panel-subtitle">
          {t("structural.balancedOf", { a: balanced, b: rows.length })}
        </p>
      </div>
      <RangeTabs
        options={TEMPLATE_LIST}
        value={template.id}
        onChange={setTemplateId}
        ariaLabel={t("structural.template")}
        renderLabel={(tpl) => tpl.label}
      />
      {!(bodyweightKg > 0) && template.roles.some((r) => r.evaluationMode === EVALUATION_MODES.BODYWEIGHT_RATIO) && (
        <p className="balance-hint">{t("structural.needBwHint")}</p>
      )}
      <ul className="balance-ratio-list">
        {rows.map((row) => {
          const role = template.roles.find((r) => r.id === row.roleId)
          const isReps = role.evaluationMode === EVALUATION_MODES.REP_COUNT
          // In zh the role label is English-only: show the Chinese exercise
          // name in the label and keep the English name in the sub line.
          const displayId = row.mappedExerciseId ?? row.configuredExerciseId
          const subName = (id) => exerciseName(exercises, id, lang === "zh" ? "en" : lang)
          return (
            <li key={row.roleId} className={`balance-ratio is-${row.status}`}>
              <div className="balance-ratio-head">
                <div>
                  <span className="balance-ratio-label">{lang === "zh" ? exerciseName(exercises, displayId, "zh") : role.label}</span>
                  <span className="recovery-sub">
                    {" "}{t("structural.target", { v: row.targetPct, u: isReps ? t("structural.repsUnit") : t("structural.pctUnit") })}
                    {row.actualPct != null && isFinite(row.actualPct) ? t("structural.youAt", { v: Math.round(row.actualPct) }) : ""}
                    {row.needsAnchor ? t("structural.needAnchor") : ""}
                    {row.needsBodyweight ? t("structural.needBw") : ""}
                  </span>
                </div>
                <span className={`recovery-badge is-${row.status === "no-data" ? "recovering" : row.status === "balanced" ? "recovered" : row.status === "borderline" ? "recovering" : "fatigued"}`}>
                  {statusLabel(row.status)}
                </span>
              </div>
              <div className="balance-ratio-meta">
                <span className="recovery-sub">
                  {row.current
                    ? isReps
                      ? t("structural.currentReps", { r: row.current.r, name: subName(row.mappedExerciseId) })
                      : t("structural.currentBest", { v: row.current.estKg != null ? t("structural.estRm", { v: row.current.estKg.toFixed(1) }) : t("structural.atReps", { v: row.current.repsKg?.toFixed(1), r: role.reps }), name: subName(row.mappedExerciseId) })
                    : t("structural.noDataFor", { name: subName(row.configuredExerciseId) })}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
