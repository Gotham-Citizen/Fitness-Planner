import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { sessionEffortBadge } from "../../../lib/effort.js"
import { buildMonthGrid, groupCompletedByDate, todayKeyLocal,trailing30dProgressedCount, trailing30dWeightDelta, weekStats } from "../../../lib/journal.js"
import { summarizeSession } from "../../../lib/summary.js"
import { localeFromI18n } from "../../../utils/locale.js"

import "./WorkoutJournalView.css"

import { Button } from "../../atoms/index.js"

const WEEKDAY_SEED_SUNDAY = new Date(2024, 0, 7, 12, 0, 0)

// Tile header icons, stroke-based 24x24 paths vendored from openGym's
// frontend/src/components/Icon.jsx (AGPL-3.0, by DuarteSantos8).
const TILE_ICONS = {
  sets: (
    <>
      <circle cx="12" cy="5.2" r="2" />
      <path d="M12 8.4v5.6M12 14 9.2 20.5M12 14l2.8 6.5M8 10.6h8M5.4 9.1v3M18.6 9.1v3" />
    </>
  ),
  workouts: (
    <>
      <rect x="5.9" y="7.9" width="3.2" height="8.2" rx="1.3" />
      <rect x="14.9" y="7.9" width="3.2" height="8.2" rx="1.3" />
      <path d="M9.1 12h5.8M3.6 9.9v4.2M20.4 9.9v4.2" />
    </>
  ),
  weight: (
    <>
      <rect x="3.4" y="4.4" width="17.2" height="16.2" rx="3.4" />
      <path d="M8.3 9.2a3.9 3.9 0 0 1 7.4 0" />
      <path d="M12 9.2v2.5M8.9 16.2h6.2" />
    </>
  ),
  progressed: (
    <path d="M3.6 20.2V4.4M3.6 20.2h16.8M6.4 16.4l3.9-4.8 3.1 2.7 5.2-6.6" />
  ),
}

const TileIcon = ({ name }) => {
  return (
    <svg
      className="icn"
      data-icon={name}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TILE_ICONS[name]}
    </svg>
  )
}

const formatTime = (iso, locale) => {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
}

const formatLong = (key, locale) => {
  if (!key) return ""
  return new Date(`${key}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export const WorkoutJournalView = ({
  sessions,
  workoutLists,
  filterListId,
  onFilterChange,
  selectedDateKey,
  onSelectDate,
  onOpenSession,
  loading,
  weighIns,
  weightUnit = "kg",
}) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const todayKey = todayKeyLocal(now)

  const listById = useMemo(() => new Map((workoutLists || []).map((l) => [l.id, l])), [workoutLists])
  const groups = useMemo(() => groupCompletedByDate(sessions), [sessions])
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])
  const week = useMemo(() => weekStats(groups), [groups])
  const delta30 = useMemo(() => trailing30dWeightDelta(weighIns, weightUnit), [weighIns, weightUnit])
  const progressed = useMemo(() => trailing30dProgressedCount(sessions), [sessions])
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(WEEKDAY_SEED_SUNDAY)
        d.setDate(WEEKDAY_SEED_SUNDAY.getDate() + i)
        return d.toLocaleDateString(locale, { weekday: "short" })
      }),
    [locale],
  )
  const daySessions = selectedDateKey ? groups.get(selectedDateKey) || [] : []

  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })

  const goMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const goToday = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
    onSelectDate?.(todayKeyLocal(t))
  }

  return (
    <section className="journal-view">
      <div className="journal-header">
        <h2 className="workouts-title journal-title">{t("journal.title")}</h2>
      </div>

      <div className="journal-tiles" role="status">
        <div className="journal-cal-card journal-tile">
          <span className="journal-tile-top"><TileIcon name="sets" /><span>{t("journal.sets")}</span></span>
          <span className="journal-tile-value">{week.setsThisWeek}</span>
          <span className="journal-tile-sub">{t("journal.setsWeek")}</span>
        </div>
        <div className="journal-cal-card journal-tile">
          <span className="journal-tile-top"><TileIcon name="workouts" /><span>{t("journal.workouts")}</span></span>
          <span className="journal-tile-value">{week.doneThisWeek}</span>
          <span className="journal-tile-sub">{t("journal.workoutsWeek")}</span>
        </div>
        <div className="journal-cal-card journal-tile">
          <span className="journal-tile-top"><TileIcon name="weight" /><span>{t("journal.bodyWeight")}</span></span>
          <span className="journal-tile-value">{delta30 === null ? "—" : `${delta30 > 0 ? "+" : ""}${delta30} ${weightUnit}`}</span>
          <span className="journal-tile-sub">{t("journal.in30d")}</span>
        </div>
        <div className="journal-cal-card journal-tile">
          <span className="journal-tile-top"><TileIcon name="progressed" /><span>{t("journal.progressed")}</span></span>
          <span className="journal-tile-value">{progressed}</span>
          <span className="journal-tile-sub">{t("journal.progressedSub")}</span>
        </div>
      </div>

      <div className="journal-cal-card">
        <div className="journal-cal-nav">
          <span className="journal-month-label">{monthLabel}</span>
          <div className="journal-cal-nav-actions">
            <Button variant="ghost" size="rest-small" onClick={() => goMonth(-1)} aria-label={t("journal.prevMonth")}>
              &larr;
            </Button>
            <label className="journal-filter">
              <span className="journal-filter-label">{t("journal.workoutFilter")}</span>
              <select
                className="rest-sound journal-filter-select"
                value={filterListId}
                onChange={(e) => onFilterChange?.(e.target.value)}
                aria-label={t("journal.workoutFilterAria")}
              >
                <option value="all">{t("journal.allWorkouts")}</option>
                {(workoutLists || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="ghost" size="rest-small" onClick={goToday}>
              {t("journal.today")}
            </Button>
            <Button variant="ghost" size="rest-small" onClick={() => goMonth(1)} aria-label={t("journal.nextMonth")}>
              &rarr;
            </Button>
          </div>
        </div>
        <div className="journal-weekdays" aria-hidden="true">
          {weekdays.map((d, i) => (
            <span key={i} className="journal-weekday">{d}</span>
          ))}
        </div>
        {loading ? (
          <div className="loading journal-loading">
            <span className="spinner" aria-hidden="true"></span> {t("journal.loading")}
          </div>
        ) : (
          <div className="journal-grid" role="grid" aria-label={t("journal.calendarFor", { month: monthLabel })}>
            {cells.map((cell) => {
              const daySessions = groups.get(cell.key) || []
              const has = daySessions.length > 0
              return (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  disabled={!has}
                  onClick={() => onSelectDate?.(cell.key)}
                  className={[
                    "journal-day",
                    cell.inMonth ? "" : "is-other-month",
                    cell.key === todayKey ? "is-today" : "",
                    cell.key === selectedDateKey ? "is-selected" : "",
                    has ? "has-workout" : "",
                  ].join(" ")}
                  aria-label={`${formatLong(cell.key, locale)}${has ? `, ${t("journal.sessionsOn", { count: daySessions.length })}` : `, ${t("journal.restDay")}`}`}
                  aria-pressed={cell.key === selectedDateKey}
                  title={has ? t("journal.sessionsOn", { count: daySessions.length }) : undefined}
                >
                  <span className="journal-day-num">{cell.date.getDate()}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="journal-cal-card journal-streak-card" role="status">
        <div className="journal-streak-main">
          <span className="journal-streak-icon" aria-hidden="true">🔥</span>
          <div>
            <div className="journal-streak-title">{t("journal.weekStreak", { count: week.weekStreak })}</div>
            <div className="journal-streak-sub">
              {t("journal.streakSub", { done: week.doneThisWeek, count: week.totalSessions })}
            </div>
          </div>
        </div>
      </div>

      <div className="journal-day-detail">
        {!selectedDateKey ? (
          <div className="journal-cal-card">
            <p className="workout-list-empty">{t("journal.pickDate")}</p>
          </div>
        ) : daySessions.length === 0 ? (
          <div className="journal-cal-card">
            <p className="workout-list-empty">{t("journal.noWorkouts", { date: formatLong(selectedDateKey, locale) })}</p>
          </div>
        ) : (
          <>
            <h3 className="journal-day-title">{formatLong(selectedDateKey, locale)}</h3>
            <ul className="journal-day-list">
              {daySessions.map((s) => {
                const list = listById.get(s.listId) || { name: s.listName || t("common.deletedWorkout"), exercises: [] }
                const summary = summarizeSession(s, list)
                const effort = sessionEffortBadge(s.sets)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="journal-session-card"
                      onClick={() => onOpenSession?.(s)}
                    >
                      <span className="journal-session-main">
                        <span className="journal-session-name">{list.name}</span>
                        <span className="journal-session-meta">
                          {formatTime(s.completedAt, locale)} · {t("history.exerciseCount", { count: summary.exerciseCount })} · {t("history.setCount", { count: summary.setCount })}
                          {summary.totalVolumeKg > 0 ? ` · ${summary.totalVolumeKg.toLocaleString(locale)} kg` : ""}
                          {effort ? ` · ${t("journal.effortAvg", { scale: effort.scale, v: effort.avg, n: effort.rated })}` : ""}
                        </span>
                      </span>
                      <span className="journal-session-open" aria-hidden="true">&rarr;</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
