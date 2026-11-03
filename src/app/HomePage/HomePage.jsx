import { useTranslation } from "react-i18next"

import { useScrollMemory } from "../../hooks/index.js"

import { SearchBar } from "../../components/molecules/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

import { todayEntry, weekdayName } from "../../lib/schedule.js"

import "./HomePage.css"

/**
 * Home / welcome page. "Today" plan card (when a schedule is set) + search
 * entry — thin composition, no data fetching. (Preset workouts moved to the
 * planner's Programs tab.)
 */
export const HomePage = ({
  banner,
  searchQuery,
  searching,
  onSearchChange,
  onClearSearch,
  schedule,
  workoutLists,
  startingSession,
  onStartSession,
}) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  useScrollMemory("home")

  // Resolve today's planned entry; a routine that was deleted after
  // scheduling falls back to the rest state.
  const entry = todayEntry(schedule)
  const plannedList = entry?.type === "workout"
    ? (workoutLists || []).find((l) => l.id === entry.listId) ?? null
    : null
  const showToday = Boolean(schedule)
  const isWorkoutDay = Boolean(plannedList)

  return (
    <AuthTemplate banner={banner}>
      <section className="welcome">
        {showToday && (
          <section className={`home-today${isWorkoutDay ? " has-workout" : ""}`} aria-label={t("home.todayAria")}>
            <p className="home-today-label">{t("home.today", { day: weekdayName(new Date().getDay(), lang) })}</p>
            {isWorkoutDay ? (
              <>
                <h3 className="home-today-name">{plannedList.name}</h3>
                <p className="home-today-meta">{t("lists.exerciseCount", { count: plannedList.exercises?.length ?? 0 })}</p>
                <button
                  type="button"
                  className="home-today-start"
                  onClick={() => onStartSession?.(plannedList)}
                  disabled={startingSession}
                >
                  {startingSession ? t("lists.starting") : t("home.startToday")}
                </button>
              </>
            ) : (
              <>
                <h3 className="home-today-name">{t("home.restDay")}</h3>
                <p className="home-today-meta">{t("home.restHint")}</p>
              </>
            )}
          </section>
        )}
        <h2>{t("home.title")}</h2>
        <p>
          {t("home.browseLead")} <strong>{t("home.exerciseCount")}</strong> {t("home.browseRest")}
        </p>
        <p>{t("home.saveHint")}</p>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t("home.searchPh")}
          ariaLabel={t("home.searchLabel")}
          onClear={onClearSearch}
          clearLabel={t("home.clear")}
          showClear={searching}
          barClassName="planner-search-welcome"
        />
      </section>
    </AuthTemplate>
  )
}
