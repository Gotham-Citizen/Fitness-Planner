import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { resolveShowEffort } from "../../../lib/effort.js"
import { exerciseName } from "../../../lib/muscles.js"
import { isMaleGender, previousBestsByExercise, rankForWeight } from "../../../lib/ranks.js"
import { formatDuration, summarizeSession } from "../../../lib/summary.js"
import { formatDateTime } from "../../../utils/format.js"
import { localeFromI18n, normalizeLang } from "../../../utils/locale.js"

import "./WorkoutSummaryView.css"

import { Button, SegmentedToggle } from "../../atoms/index.js"
import { SetTags } from "../../molecules/index.js"

const formatDate = (iso, locale) => {
  if (!iso) return ""
  return formatDateTime(iso, locale)
}

const formatNum = (n, locale) => {
  return Number.isFinite(n) ? n.toLocaleString(locale) : "—"
}

const formatWeight = (kg, inLbs) => {
  if (!Number.isFinite(kg)) return "—"
  return inLbs ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
}

const tierClass = (tier) => {
  return `rank-badge is-${String(tier || "unranked").toLowerCase().replace(/[^a-z]+/g, "")}`
}

const RankBadge = ({ rank, inLbs, prefix }) => {
  const { t } = useTranslation()
  if (!rank || rank.tier === "Unranked") return null
  const displayNext = rank.nextAt !== null && rank.nextAt !== undefined
    ? formatWeight(rank.nextAt, inLbs)
    : null
  return (
    <span className="rank-dual">
      {prefix && <span className="rank-gender-tag">{prefix}</span>}
      <span className={tierClass(rank.tier)} title={t("summary.rankTitle", { gender: rank.gender === "male" ? t("summary.male") : t("summary.female"), table: rank.tableLabel })}>
        {rank.tier}
      </span>
      {displayNext !== null && (
        <span className="rank-progress-label">
          {t("summary.toNext", { pct: Math.round(rank.progress * 100), v: displayNext, u: inLbs ? "lbs" : "kg" })}
        </span>
      )}
    </span>
  )
}

// mode="finish" (post-workout: Done + View sessions) or
// mode="history" (from a sessions card: single Back button).
// gender: 'male' | 'female' | 'other' | null (null = unspecified -> show both).
export const WorkoutSummaryView = ({ list, session, mode = "finish", heroTitle, onDone, onHistory, onBack, previousSessions, gender }) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const lang = normalizeLang(i18n.language)
  const [unit, setUnit] = useState("kg")
  const [previewGender, setPreviewGender] = useState(null)
  const summary = summarizeSession(session, list, {
    kg: t("summary.cmpKg", { returnObjects: true }),
    lbs: t("summary.cmpLbs", { returnObjects: true }),
  })
  const inLbs = unit === "lbs"
  const totalVolume = inLbs ? summary.totalVolumeLbs : summary.totalVolumeKg
  const comparison = inLbs ? summary.comparisonLbs : summary.comparison

  const exerciseMeta = useMemo(() => new Map((list?.exercises || []).map((ex) => [ex.id, ex])), [list])

  // Logged effort shows only on exercises with effort logging enabled
  // (see resolveShowEffort for the flag-unknown fallback).
  const showEffortFor = (exerciseId, exSets) => {
    return resolveShowEffort(exerciseMeta.get(exerciseId), exSets)
  }

  const prevBests = useMemo(
    () => previousBestsByExercise(previousSessions, session?.id),
    [previousSessions, session?.id],
  )

  const specified = gender === "male" || gender === "female" || gender === "other"
  const resolvedUserGender = specified ? (isMaleGender(gender) ? "male" : "female") : null
  // When gender is set, allow flipping to preview the other table (view-only).
  const displayGender = specified ? (previewGender ?? resolvedUserGender) : null
  const otherGender = displayGender === "male" ? "female" : "male"

  return (
    <section className="summary-view">
      {mode === "history" && (
        <Button variant="ghost" className="summary-back" onClick={onBack}>
          {t("summary.backToSessions")}
        </Button>
      )}
      <div className="summary-hero">
        <h2 className="summary-title">{heroTitle || t("summary.complete")}</h2>
        <p className="summary-subtitle">
          {list.name} &middot; {formatDate(summary.completedAt, locale)}
        </p>
        {Number(session?.removedEmptySets) > 0 && (
          <p className="summary-removed-note" role="status">
            {t("summary.removed", { count: session.removedEmptySets })}
          </p>
        )}
        <SegmentedToggle
          options={["kg", "lbs"]}
          value={unit}
          disableSelected={false}
          onPick={setUnit}
          ariaLabel={t("summary.volumeUnit")}
        />
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-value">{formatDuration(summary.durationMs, lang)}</span>
          <span className="summary-stat-label">{t("summary.duration")}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{summary.exerciseCount}</span>
          <span className="summary-stat-label">{t("summary.exercises")}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{summary.setCount}</span>
          <span className="summary-stat-label">{t("summary.sets")}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{formatNum(totalVolume, locale)} {unit}</span>
          <span className="summary-stat-label">{t("summary.volume")}</span>
        </div>
      </div>

      {comparison && totalVolume > 0 && (
        <div className="summary-fun" role="status">
          {t("summary.funLead", { v: formatNum(totalVolume, locale), u: unit })}{" "}
          {comparison.times > 1 ? `${comparison.times}× ` : ""}{comparison.label}!
        </div>
      )}

      {specified && (
        <div className="rank-flip-row">
          <span>{t("summary.standards", { g: displayGender === "male" ? t("summary.male") : t("summary.female") })}</span>
          <Button
            variant="ghost"
            size="rest-small"
            onClick={() => setPreviewGender((p) => (p ?? resolvedUserGender) === "male" ? "female" : "male")}
          >
            {t("summary.viewOther", { g: otherGender === "male" ? t("summary.male") : t("summary.female") })}
          </Button>
          {previewGender && (
            <Button
              variant="ghost"
              size="rest-small"
              onClick={() => setPreviewGender(null)}
            >
              {t("summary.reset")}
            </Button>
          )}
        </div>
      )}

      <div className="summary-exercises">
        {summary.perExercise.map((ex) => {
          const max = inLbs ? ex.maxLbs : ex.maxKg
          const meta = exerciseMeta.get(ex.exerciseId) || { name: ex.name }
          const prevMax = prevBests.get(ex.exerciseId)
          const isNewBest = prevMax !== undefined && ex.maxKg !== null && ex.maxKg > prevMax

          if (!specified) {
            const rankM = rankForWeight(ex.maxKg, meta, "male")
            const rankF = rankForWeight(ex.maxKg, meta, "female")
            return (
              <div key={ex.exerciseId} className="summary-exercise-card">
                <div className="summary-exercise-header">
                  <span className="summary-exercise-name">{exerciseName({ name: ex.name, nameZh: meta.nameZh }, lang)}</span>
                  <span className="summary-exercise-meta">
                    {t("summary.setCount", { count: ex.setCount })}
                    {max !== null ? ` · ${t("summary.max", { v: max, u: unit })}` : ""}
                  </span>
                </div>
                {rankM.tier !== "Unranked" && (
                  <div className="rank-row">
                    <RankBadge rank={rankM} inLbs={inLbs} prefix={`♂ ${t("summary.male")}`} />
                    <RankBadge rank={rankF} inLbs={inLbs} prefix={`♀ ${t("summary.female")}`} />
                    {prevMax !== undefined && (
                      <span className="rank-prev-best">
                        {t("summary.best", { v: formatWeight(prevMax, inLbs), u: unit })}
                      </span>
                    )}
                  </div>
                )}
                <div className="history-sets">
                  <SetTags
                    sets={ex.sets}
                    showEffort={showEffortFor(ex.exerciseId, ex.sets)}
                    formatSet={(s, i) => t("summary.setTag", { i: i + 1, reps: s.reps ?? "?", weight: s.weight ?? "?", unit: s.weight_unit })}
                  />
                </div>
              </div>
            )
          }

          const rank = rankForWeight(ex.maxKg, meta, displayGender)
          const prevRank = prevMax !== undefined ? rankForWeight(prevMax, meta, displayGender) : null
          const rankedUp = isNewBest && prevRank && rank.tierIndex > prevRank.tierIndex
          return (
            <div key={ex.exerciseId} className="summary-exercise-card">
              <div className="summary-exercise-header">
                <span className="summary-exercise-name">{exerciseName({ name: ex.name, nameZh: meta.nameZh }, lang)}</span>
                <span className="summary-exercise-meta">
                  {t("summary.setCount", { count: ex.setCount })}
                  {max !== null ? ` · ${t("summary.max", { v: max, u: unit })}` : ""}
                </span>
              </div>
              {rank.tier !== "Unranked" ? (
                <div className="rank-row">
                  <RankBadge rank={rank} inLbs={inLbs} prefix={displayGender === "male" ? `♂ ${t("summary.male")}` : `♀ ${t("summary.female")}`} />
                  {rankedUp && (
                    <span className="rank-up" role="status">
                      {t("summary.rankUp", { a: prevRank.tier, b: rank.tier })}
                    </span>
                  )}
                  {!rankedUp && isNewBest && (
                    <span className="rank-new-best" role="status">
                      {t("summary.newBest")}
                    </span>
                  )}
                  {!isNewBest && prevMax !== undefined && (
                    <span className="rank-prev-best">
                      {t("summary.best", { v: formatWeight(prevMax, inLbs), u: unit })}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="history-sets">
                <SetTags
                  sets={ex.sets}
                  showEffort={showEffortFor(ex.exerciseId, ex.sets)}
                  formatSet={(s, i) => t("summary.setTag", { i: i + 1, reps: s.reps ?? "?", weight: s.weight ?? "?", unit: s.weight_unit })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="summary-actions">
        {mode === "history" ? (
          <Button onClick={onBack}>
            {t("summary.back")}
          </Button>
        ) : (
          <>
            <Button onClick={onDone}>
              {t("summary.done")}
            </Button>
            <Button variant="ghost" onClick={onHistory}>
              {t("summary.viewSessions")}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
