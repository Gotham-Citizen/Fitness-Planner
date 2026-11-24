import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { resolveShowEffort } from "../../../lib/effort.js"
import { exerciseName, mediaUrl } from "../../../lib/muscles.js"
import { formatDateTime as formatDate } from "../../../utils/format.js"
import { localeFromI18n, normalizeLang } from "../../../utils/locale.js"

import "./WorkoutHistoryView.css"

import { Button } from "../../atoms/index.js"
import { SetTags } from "../../molecules/index.js"

// Session 里 exercise_id 有时是补零字符串（"0585"），list/动作库里是
// 数字（585）或 "585"。两边都建多键索引，查找时按同一组变体回退。
const keyVariants = (id) => {
  if (id == null) return [String(id)]
  const s = String(id)
  const stripped = s.replace(/^0+(?=\d)/, "")
  const out = new Set([id, s, stripped])
  const n = Number(stripped)
  if (Number.isFinite(n)) out.add(n)
  return [...out]
}

const lookupMeta = (map, id) => {
  for (const k of keyVariants(id)) {
    if (map.has(k)) return map.get(k)
  }
  return undefined
}

// 只输出时分，避免与标题区的日期重复。
const formatTime = (iso, locale) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return formatDate(iso, locale)
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

export const WorkoutHistoryView = ({
  list,
  sessions,
  onBack,
  onOpenSummary,
  onDeleteSession,
  onClearAll,
  showListNames,
  title,
  exercises: exercises,
}) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const lang = normalizeLang(i18n.language)
  const [expanded, setExpanded] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [clearing, setClearing] = useState(false)

  const toggle = (id) => setExpanded(expanded === id ? null : id)

  const enrichedList = useMemo(() => {
    const library = exercises || []
    const baseList = list || null
    if (!baseList && library.length === 0) return baseList
    const byId = new Map()
    for (const ex of library) byId.set(ex.id, ex)
    for (const ex of baseList?.exercises || []) byId.set(ex.id, ex)
    return { ...(baseList || {}), exercises: Array.from(byId.values()) }
  }, [list, exercises])

  const exerciseMetaById = useMemo(() => {
    const m = new Map()
    for (const ex of enrichedList?.exercises || []) {
      for (const k of keyVariants(ex.id)) {
        if (!m.has(k)) m.set(k, ex)
      }
    }
    return m
  }, [enrichedList])

  const listOrder = useMemo(() => {
    const m = new Map()
    ;(list?.exercises || []).forEach((ex, i) => {
      for (const k of keyVariants(ex.id)) {
        if (!m.has(k)) m.set(k, i)
      }
    })
    return m
  }, [list])

  const lookupOrder = (id) => {
    for (const k of keyVariants(id)) {
      if (listOrder.has(k)) return listOrder.get(k)
    }
    return Infinity
  }

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
        <Button onClick={onBack}>
          {t("common.back")}
        </Button>
        <h2 className="history-title">{title || t("history.title", { name: list.name })}</h2>
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
            const exerciseIds = Object.keys(setsByExercise)
            const exercisesLogged = exerciseIds.length

            const orderedExerciseIds = [...exerciseIds].sort(
              (a, b) => lookupOrder(a) - lookupOrder(b),
            )

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
                      {showListNames && session.listName && (
                        <span className="history-card-title">{session.listName}</span>
                      )}
                      <span className="history-card-summary">
                        {formatDate(session.startedAt, locale)}
                        {" · "}
                        {t("history.exerciseCount", { count: exercisesLogged })}
                        {" · "}
                        {t("history.setCount", { count: totalSets })}
                        {session.completedAt
                          ? ` · ${t("history.doneAt", { date: formatTime(session.completedAt, locale) })}`
                          : ` ${t("history.incomplete")}`}
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
                    {orderedExerciseIds.map((exerciseId) => {
                      const exSets = setsByExercise[exerciseId]
                      const snapshot = exSets[0]
                      const meta = lookupMeta(exerciseMetaById, exerciseId)

                      const displayName = meta
                        ? exerciseName(meta, lang)
                        : (snapshot?.exercise_name || snapshot?.name || String(exerciseId))

                      const img =
                        (meta ? mediaUrl(meta.image) : null) ||
                        (snapshot?.image ? mediaUrl(snapshot.image) : null)

                      const showEffort = resolveShowEffort(meta, exSets)

                      return (
                        <div key={exerciseId} className="history-exercise">
                          <div className="history-exercise-header">
                            {img && <img src={img} alt="" loading="lazy" />}
                            <span className="history-exercise-name">{displayName}</span>
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