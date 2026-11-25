import { useTranslation } from "react-i18next"

import "../../components/organisms/PersonalRecordsCard/PersonalRecordsCard.css"
import { Button } from "../../components/atoms/index.js"

import { exerciseName } from "../../lib/muscles.js"
import { computePersonalRecords } from "../../lib/personalRecords.js"
import { rankForWeight } from "../../lib/ranks.js"
import { KG_TO_LBS } from "../../lib/units.js"
import { normalizeLang } from "../../utils/locale.js"

import "./PersonalRecordsPage.css"

const tierClass = (tier) =>
  `rank-badge is-${String(tier || "unranked").toLowerCase().replace(/[^a-z]+/g, "")}`

const round1 = (n) => Math.round(n * 10) / 10

/**
 * Full-page personal records list. Opened from the journal view via the
 * PersonalRecordsCard "View more" button. Header intentionally mirrors
 * WorkoutHistoryView (same <Button> default, same .*-header/. *-title
 * layout) so the back affordance is consistent across the app.
 */
export const PersonalRecordsPage = ({
  sessions,
  exercises,
  gender,
  weightUnit = "kg",
  onOpenSession,
  onBack,
}) => {
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)

  const records = computePersonalRecords(sessions, { limit: 0, exercises })

  const inLbs = weightUnit === "lbs"
  const toDisplay = (kg) => (inLbs ? kg * KG_TO_LBS : kg)

  const genderArg = gender === "male" ? "male" : "female"
  const canRank = gender === "male" || gender === "female"

  const hasAny = records.length > 0
  const sessionById = new Map((sessions || []).map((s) => [s.id, s]))

  // 与 WorkoutSummaryView 一致：优先用动作库里的双语字段（meta.nameZh），
  // 没有 meta 时回退到记录本身的英文名。
  const localizedName = (rec) => {
    const fallback = rec.name || ""
    if (!rec.meta) return fallback
    return exerciseName(
      { name: fallback, nameZh: rec.meta.nameZh, nameEs: rec.meta.nameEs },
      lang,
    ) || fallback
  }

  return (
    <section className="journal-pr-page">
      <div className="journal-pr-page-header">
        <Button onClick={() => onBack?.()}>
          {t("common.back")}
        </Button>
        <h2 className="journal-pr-page-title">{t("journal.personalRecords")}</h2>
      </div>
      <p className="panel-subtitle">{t("journal.personalRecordsSub")}</p>

      {!hasAny ? (
        <p className="workout-list-empty">{t("journal.personalRecordsEmpty")}</p>
      ) : (
        <ul className="journal-pr-list">
          {records.map((rec) => {
            const rank = canRank && rec.meta
              ? rankForWeight(rec.maxWeightKg, rec.meta, genderArg)
              : null
            const session = rec.maxWeightSessionId
              ? sessionById.get(rec.maxWeightSessionId)
              : null

            const workoutName = session?.listName?.trim() || null
            // 动作名按当前语言显示；工作区名作为补充信息放在 title 里。
            const displayName = localizedName(rec)
            const titleText = workoutName
              ? `${displayName} — ${workoutName}`
              : displayName

            return (
              <li key={rec.exerciseId} className="journal-pr-row">
                <div className="journal-pr-main">
                  <div className="journal-pr-top">
                    <span className="journal-pr-name" title={titleText}>
                      {displayName}
                    </span>
                    {rank && rank.tier !== "Unranked" && (
                      <span className={tierClass(rank.tier)}>{rank.tier}</span>
                    )}
                  </div>
                  <div className="journal-pr-meta">
                    {t("journal.prRowStats", {
                      oneRm: round1(toDisplay(rec.best1RMKg)),
                      top: round1(toDisplay(rec.maxWeightKg)),
                      u: weightUnit,
                    })}
                    {rank && rank.nextAt != null && (
                      <>
                        {" · "}
                        <span className="journal-pr-progress">
                          {t("journal.prNext", {
                            pct: Math.round(rank.progress * 100),
                            v: round1(toDisplay(rank.nextAt)),
                            u: weightUnit,
                          })}
                        </span>
                      </>
                    )}
                    {workoutName && (
                      <>
                        {" · "}
                        <span className="journal-pr-workout">{workoutName}</span>
                      </>
                    )}
                  </div>
                </div>
                {session && (
                  <Button
                    variant="ghost"
                    size="rest-small"
                    onClick={() => onOpenSession?.(session)}
                  >
                    {t("journal.prViewSession")}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}