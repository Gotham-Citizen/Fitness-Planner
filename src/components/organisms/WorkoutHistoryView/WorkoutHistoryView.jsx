import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { resolveShowEffort } from "../../../lib/effort.js"
import { exerciseName, mediaUrl } from "../../../lib/muscles.js"
import { formatDateTime as formatDate } from "../../../utils/format.js"
import { localeFromI18n, normalizeLang } from "../../../utils/locale.js"

import "./WorkoutHistoryView.css"

import { Button } from "../../atoms/index.js"
import { SetTags } from "../../molecules/index.js"

export const WorkoutHistoryView = ({ list, sessions, onBack, onOpenSummary, onDeleteSession, onClearAll }) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const [expanded, setExpanded] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [clearing, setClearing] = useState(false)

  const toggle = (id) => setExpanded(expanded === id ? null : id)

  // Current list config by exercise id (see resolveShowEffort for the
  // flag-unknown fallback to the logged data itself).
  const exerciseMetaById = useMemo(
    () => new Map((list?.exercises || []).map((ex) => [ex.id, ex])),
    [list],
  )

  const handleDelete = async (id) => {
    if (!onDeleteSession) return
    if (!window.confirm(t("history.confirmDelete"))) return
    try {
      setDeletingId(id)
      await onDeleteSession(id)
      if (expanded === id) setExpanded(null)
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    if (!onClearAll || sessions.length === 0) return
    if (!window.confirm(t("history.confirmClear", { count: sessions.length, name: list.name }))) return
    try {
      setClearing(true)
      await onClearAll()
      setExpanded(null)
    } finally {
      setClearing(false)
    }
  }

  return (
    <section className="history-view">
      <div className="history-header">
        <Button variant="ghost" onClick={onBack}>
          {t("history.back")}
        </Button>
        <h2 className="history-title">{t("history.title", { name: list.name })}</h2>
        {sessions.length > 0 && onClearAll && (
          <Button
            variant="ghost"
            tone="danger"
            onClick={handleClearAll}
            disabled={clearing}
          >
            {clearing ? t("history.clearing") : t("history.clearAll")}
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="history-empty">
          <p>{t("history.empty")}</p>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session) => {
            const isExpanded = expanded === session.id
            const setsByExercise = {}
            for (const s of session.sets) {
              if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = []
              setsByExercise[s.exercise_id].push(s)
            }
            const totalSets = session.sets.length
            const exercisesLogged = Object.keys(setsByExercise).length

            return (
              <div key={session.id} className="history-card">
                <div className="history-card-header">
                  <button
                    type="button"
                    className="history-card-main"
                    onClick={() => onOpenSummary?.(session)}
                    aria-label={t("history.openSummary", { date: formatDate(session.startedAt, locale) })}
                  >
                    <div className="history-card-info">
                      <span className="history-card-date">{formatDate(session.startedAt, locale)}</span>
                      <span className="history-card-summary">
                        {t("history.exerciseCount", { count: exercisesLogged })} &middot; {t("history.setCount", { count: totalSets })}
                        {session.completedAt ? ` &middot; ${t("history.doneAt", { date: formatDate(session.completedAt, locale) })}` : ` ${t("history.incomplete")}`}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`history-expand-icon ${isExpanded ? "is-open" : ""}`}
                    onClick={() => toggle(session.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? t("history.hideDetail") : t("history.showDetail")}
                  >
                    &#9662;
                  </button>
                  {onDeleteSession && (
                    <Button
                      variant="icon"
                      tone="danger"
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      aria-label={t("history.deleteSession", { date: formatDate(session.startedAt, locale) })}
                      title={t("history.deleteTitle")}
                    >
                      {deletingId === session.id ? "…" : "✕"}
                    </Button>
                  )}
                </div>
                {isExpanded && (
                  <div className="history-card-detail">
                    {list.exercises.map((ex) => {
                      const exSets = setsByExercise[ex.id]
                      if (!exSets || exSets.length === 0) return null
                      const showEffort = resolveShowEffort(exerciseMetaById.get(ex.id), exSets)
                      return (
                        <div key={ex.id} className="history-exercise">
                          <div className="history-exercise-header">
                            {mediaUrl(ex.image) ? (
                              <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                            ) : (
                              <span className="history-exercise-placeholder" aria-hidden="true">💪</span>
                            )}
                            <span className="history-exercise-name">{exerciseName(ex, normalizeLang(i18n.language))}</span>
                          </div>
                          <div className="history-sets">
                            <SetTags
                              sets={exSets}
                              showEffort={showEffort}
                              formatSet={(s, i) => t("history.setTag", { i: i + 1, reps: s.reps ?? "?", weight: s.weight ?? "?", unit: s.weight_unit })}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
