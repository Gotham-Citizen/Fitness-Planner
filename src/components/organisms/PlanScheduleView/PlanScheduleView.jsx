import { useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { orderedWeekdays, REST_DAY_VALUE, todayEntry, weekdayName } from "../../../lib/schedule.js";

import "./PlanScheduleView.css"

import { Button, SegmentedToggle } from "../../atoms/index.js"
import { useScheduleDrafts } from "./useScheduleDrafts.js";

// Natural Sunday→Saturday order for the loop-start weekday picker.
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

const STEP_COUNT = 3
const STEP_MODE = 1
const STEP_CONFIGURE = 2
const STEP_PREVIEW = 3

/**
 * Plan & schedule editor — 3-step wizard:
 *   1) Schedule type (Fixed / Rotation)
 *   2) Configure — Week start + Fixed editor OR Loop start + Loop builder
 *   3) Preview (read-only)
 *
 * The schedule type saves instantly (like a toggle). Step 2 saves the week
 * start + fixed week (or the rotation loop) in ONE request when the user
 * presses "Next"; the wizard only advances once that save succeeded.
 */
export const PlanScheduleView = ({ user, workoutLists, onUpdateProfile, onBack }) => {
  const { t, i18n } = useTranslation()
  const locale = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en"
  const schedule = user?.schedule ?? null
  const weekStartsOn = Number.isInteger(schedule?.weekStartsOn) ? schedule.weekStartsOn : 0
  const mode = schedule?.mode === "rotation" ? "rotation" : "fixed"

  // Editor state + save handlers (fixed week / rotation loop).
  const {
    saving,
    error,
    fixedDraft,
    setFixedDraft,
    saveFixedWeek,
    rotationDraft,
    changeEntry,
    addDay,
    removeDay,
    saveRotation,
    startWeekday,
    setStartWeekday,
    pickMode,
  } = useScheduleDrafts({ schedule, weekStartsOn, onUpdateProfile, t })

  const [step, setStep] = useState(STEP_MODE)
  const [weekStartsOnDraft, setWeekStartsOnDraft] = useState(weekStartsOn)
  // Outcome of the last schedule-type save — step 1 waits for it so a failed
  // save keeps the user here instead of opening the wrong editor.
  const modeSaveRef = useRef(null)

  // Step labels for tracker (like questionnaire).
  const stepLabels = useMemo(() => [
    t("schedule.modeTitle"),
    mode === "fixed" ? t("schedule.weekStartsOn") : t("schedule.rotationTitle"),
    t("schedule.previewTitle"),
  ], [t, mode])

  if (!user) {
    return (
      <section className="loading">
        <span className="spinner" aria-hidden="true"></span> {t("account.loading")}
      </section>
    )
  }

  const routineLabel = (list) => list?.name || t("schedule.missingRoutine")

  const routineOptions = (workoutLists || []).map((list) => (
    <option key={list.id} value={list.id}>{routineLabel(list)}</option>
  ))

  const missingOption = (listId) => (
    workoutLists?.some((l) => l.id === listId) ? null : <option value={listId}>{t("schedule.missingRoutine")}</option>
  )

  // Weekday relation to today, for the loop-start note and week-start note.
  const todayWeekday = new Date().getDay()
  const loopDayNote = (day) => {
    const offset = (day - todayWeekday + 7) % 7
    return offset === 0 ? t("schedule.todayNote") : offset === 1 ? t("schedule.tomorrowNote") : null
  }
  const weekStartDayNote = (day) => {
    const offset = (day - todayWeekday + 7) % 7
    return offset === 0 ? t("schedule.todayNote") : offset === 1 ? t("schedule.tomorrowNote") : null
  }

  // Today preview from the *saved* schedule.
  const today = todayEntry(schedule)
  const todayList = today?.type === "workout" ? (workoutLists || []).find((l) => l.id === today.listId) : null

  // The wizard only moves on when the save behind the step actually landed.
  const goNext = async () => {
    if (step === STEP_MODE) {
      // The schedule type saves instantly — wait for that save, so a failure
      // keeps the user on this step with the inline error visible.
      const saved = modeSaveRef.current ? await modeSaveRef.current : true
      if (!saved) return
    } else if (step === STEP_CONFIGURE) {
      const saved = mode === "fixed"
        ? await saveFixedWeek(weekStartsOnDraft, fixedDraft)
        : await saveRotation()
      if (!saved) return
    }
    setStep((s) => Math.min(STEP_COUNT, s + 1))
  }
  const goBack = () => setStep((s) => Math.max(STEP_MODE, s - 1))

  // When mode changes, stay on step 1; user clicks "Next" to proceed.
  const handlePickMode = (nextMode) => {
    modeSaveRef.current = pickMode(nextMode)
  }

  return (
    <section className="plan-schedule">
      <Button className="back-button" onClick={onBack}>{t("schedule.back")}</Button>

      <header className="plan-schedule-header">
        <h2 className="workouts-title">{t("schedule.title")}</h2>
        <p className="plan-schedule-subtitle">{t("schedule.subtitle")}</p>
      </header>

      {/* Step tracker — like questionnaire */}
      <ol className="plan-schedule-tracker" aria-label={t("questionnaire.stepOf", { n: step, total: STEP_COUNT })}>
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={`plan-schedule-step${index + 1 === step ? " is-active" : ""}${index + 1 < step ? " is-done" : ""}`}
          >
            <span className="plan-schedule-step-num" aria-hidden="true">
              {index + 1 < step ? "✓" : index + 1}
            </span>
            <span className="plan-schedule-step-label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="plan-schedule-panel">
        {/* Step 1: Schedule type */}
        {step === STEP_MODE && (
          <div className="account-card">
            <h3 className="account-section-title">{t("schedule.modeTitle")}</h3>
            <SegmentedToggle
              options={[
                { value: "fixed", label: t("schedule.modeFixed") },
                { value: "rotation", label: t("schedule.modeRotation") },
              ]}
              value={mode}
              disabled={saving !== null}
              onPick={handlePickMode}
              ariaLabel={t("schedule.modeTitle")}
            />
            <p className="account-hint">{mode === "fixed" ? t("schedule.modeFixedHint") : t("schedule.modeRotationHint")}</p>
            {error && <p className="account-inline-error">{error}</p>}
            <div className="plan-schedule-step-actions">
              <Button variant="primary" onClick={goNext} disabled={saving !== null}>
                {t("auth.next")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Configure — Week start (fixed) OR Loop builder (rotation) */}
        {step === STEP_CONFIGURE && (
          <>
            {mode === "fixed" ? (
              <div className="account-card">
                <h3 className="account-section-title">{t("schedule.weekStartsOn")}</h3>
                <div className="plan-schedule-days">
                  {orderedWeekdays(weekStartsOnDraft).map((day) => {
                    const note = weekStartDayNote(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`plan-schedule-day${weekStartsOnDraft === day ? " is-active" : ""}`}
                        onClick={() => weekStartsOnDraft !== day && setWeekStartsOnDraft(day)}
                        disabled={saving !== null}
                        aria-pressed={weekStartsOnDraft === day}
                      >
                        {weekdayName(day, locale)}
                        {note && <span className="plan-schedule-day-note"> · {note}</span>}
                      </button>
                    )
                  })}
                </div>

                <div className="plan-schedule-editor">
                  <h4 className="plan-schedule-editor-title">{t("schedule.fixedTitle")}</h4>
                  {orderedWeekdays(weekStartsOnDraft).map((day) => (
                    <label key={day} className="plan-schedule-day-row">
                      <span className="plan-schedule-day-name">{weekdayName(day, locale)}</span>
                      <select
                        className="text-input"
                        value={fixedDraft[String(day)] ?? ""}
                        onChange={(e) => setFixedDraft((prev) => ({ ...prev, [String(day)]: e.target.value || null }))}
                        aria-label={t("schedule.dayAria", { day: weekdayName(day, locale) })}
                      >
                        <option value="">{t("schedule.restDay")}</option>
                        {fixedDraft[String(day)] && missingOption(fixedDraft[String(day)])}
                        {routineOptions}
                      </select>
                    </label>
                  ))}
                </div>
                {error && <p className="account-inline-error">{error}</p>}

                <div className="plan-schedule-step-actions">
                  <Button variant="ghost" onClick={goBack}>{t("auth.back")}</Button>
                  <Button variant="primary" onClick={goNext} disabled={saving !== null}>
                    {t("auth.next")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="account-card">
                <h3 className="account-section-title">{t("schedule.rotationTitle")}</h3>

                <div className="plan-schedule-day-row">
                  <span className="plan-schedule-day-name">{t("schedule.loopStartsOn")}</span>
                  <div className="plan-schedule-days">
                    {WEEKDAYS.map((day) => {
                      const note = loopDayNote(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`plan-schedule-day${startWeekday === day ? " is-active" : ""}`}
                          onClick={() => setStartWeekday(day)}
                          disabled={saving !== null}
                          aria-pressed={startWeekday === day}
                        >
                          {weekdayName(day, locale)}
                          {note && <span className="plan-schedule-day-note"> · {note}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <ol className="plan-schedule-loop">
                  {rotationDraft.map((entry, i) => (
                    <li key={i} className="plan-schedule-loop-row">
                      <span className="plan-schedule-loop-index" aria-hidden="true">{i + 1}</span>
                      <select
                        className="text-input"
                        value={entry.type === "workout" ? entry.listId : REST_DAY_VALUE}
                        onChange={(e) => changeEntry(i, e.target.value)}
                        aria-label={t("schedule.entryAria", { step: i + 1 })}
                      >
                        <option value={REST_DAY_VALUE}>{t("schedule.restDay")}</option>
                        {entry.type === "workout" && missingOption(entry.listId)}
                        {routineOptions}
                      </select>
                      <Button
                        variant="icon"
                        onClick={() => removeDay(i)}
                        disabled={rotationDraft.length <= 1}
                        aria-label={t("schedule.removeDayAria", { step: i + 1 })}
                      >
                        ✕
                      </Button>
                    </li>
                  ))}
                </ol>
                <Button variant="secondary" onClick={addDay} disabled={saving !== null} className="plan-schedule-add-day">
                  {t("schedule.addDay")}
                </Button>
                {error && <p className="account-inline-error">{error}</p>}

                <div className="plan-schedule-step-actions">
                  <Button variant="ghost" onClick={goBack}>{t("auth.back")}</Button>
                  <Button variant="primary" onClick={goNext} disabled={saving !== null}>
                    {t("auth.next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 3: Preview (read-only) */}
        {step === STEP_PREVIEW && (
          <div className="account-card">
            <h3 className="account-section-title">{t("schedule.previewTitle")}</h3>
            {today == null ? (
              <p className="account-hint">{t("schedule.previewEmpty")}</p>
            ) : todayList ? (
              <div className="account-row">
                <span className="account-label">{t("schedule.previewToday")}</span>
                <span className="account-value">{routineLabel(todayList)}</span>
              </div>
            ) : (
              <div className="account-row">
                <span className="account-label">{t("schedule.previewToday")}</span>
                <span className="account-value">{t("schedule.restDay")}</span>
              </div>
            )}

            <div className="plan-schedule-step-actions">
              <Button variant="ghost" onClick={goBack}>{t("auth.back")}</Button>
              <Button variant="primary" onClick={onBack}>{t("common.done")}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom step counter */}
      <div className="plan-schedule-nav">
        <span className="plan-schedule-step-of">{t("questionnaire.stepOf", { n: step, total: STEP_COUNT })}</span>
      </div>
    </section>
  )
}