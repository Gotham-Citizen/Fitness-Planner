import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import {
  equipmentName,
  goalName,
  PRESET_EQUIPMENT,
  PRESET_GOALS,
  QUESTIONNAIRE_DAYS,
  QUESTIONNAIRE_SESSION_MINUTES,
} from "../../../lib/presets/index.js"

import "./QuestionnaireView.css"

import { Button } from "../../atoms/index.js"

const EXPERIENCE_OPTIONS = [
  { id: "beginner", icon: "🌱" },
  { id: "intermediate", icon: "⚡" },
  { id: "advanced", icon: "🔥" },
]

const STEP_COUNT = 6

/**
 * Training-goals survey retake (opened from Account → Goals).
 * Uses the same tap-to-select option cards as the signup wizard
 * for visual consistency.
 */
export const QuestionnaireView = ({
  initialAnswers = null,
  saving = false,
  error = null,
  onSave,
  onBack,
}) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState(() => ({
    goal: initialAnswers?.goal || null,
    experience: initialAnswers?.experience || null,
    daysPerWeek: initialAnswers?.daysPerWeek || null,
    equipment: initialAnswers?.equipment || null,
    sessionMinutes: initialAnswers?.sessionMinutes || null,
    generatePlan: false,
  }))

  const stepLabels = useMemo(() => t("questionnaire.steps", { returnObjects: true }), [t])

  const select = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  const stepAnswersComplete = () => {
    if (step === 1) return Boolean(answers.goal)
    if (step === 2) return Boolean(answers.experience)
    if (step === 3) return Boolean(answers.daysPerWeek)
    if (step === 4) return Boolean(answers.equipment)
    if (step === 5) return Boolean(answers.sessionMinutes !== undefined)
    return false
  }

  const handleNext = () => {
    if (step < STEP_COUNT && stepAnswersComplete()) {
      setStep(step + 1)
    }
  }

const handleSave = async () => {
  const { goal, experience, daysPerWeek, equipment, sessionMinutes, generatePlan } = answers
  if (!goal || !experience || !daysPerWeek || !equipment) return
  try {
    await onSave?.({ goal, experience, daysPerWeek: Number(daysPerWeek), equipment, sessionMinutes, generatePlan })
  } catch {
    // 错误已由 handleUpdateQuestionnaire 的 showError 显示
  }
}

  // Tap-to-select option card — mirrors the signup wizard's auth-option
  const optionButton = ({ key: optionKey, selected, onClick, children, className = "" }) => (
    <button
      key={optionKey}
      type="button"
      className={`auth-option${selected ? " is-selected" : ""} ${className}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {children}
    </button>
  )

  // Field label above a group of option cards
  const optionField = (labelText, children) => (
    <div className="auth-field">
      <span className="auth-field-label">{labelText}</span>
      {children}
    </div>
  )

  return (
    <section className="questionnaire">
      <header className="questionnaire-header">
        <h2 className="questionnaire-title">{t("questionnaire.title")}</h2>
        <p className="questionnaire-subtitle">{t("questionnaire.subtitleEdit")}</p>
      </header>

      <ol className="questionnaire-tracker" aria-label={t("questionnaire.stepOf", { n: step, total: STEP_COUNT })}>
        {stepLabels.map((label, index) => (
          <li
            key={label}
            className={`questionnaire-step${index + 1 === step ? " is-active" : ""}${index + 1 < step ? " is-done" : ""}`}
          >
            <span className="questionnaire-step-num" aria-hidden="true">
              {index + 1 < step ? "✓" : index + 1}
            </span>
            <span className="questionnaire-step-label">{label}</span>
          </li>
        ))}
      </ol>

      <div className="questionnaire-panel">
        {step === 1 && (
          <>
            {optionField(t("questionnaire.goalLabel"), (
              <div className="auth-options">
                {PRESET_GOALS.map((goalOption) => optionButton({
                  key: goalOption.id,
                  selected: answers.goal === goalOption.id,
                  onClick: () => select("goal", goalOption.id),
                  children: (
                    <span className="auth-option-inner">
                      <span className="auth-option-icon" aria-hidden="true">{goalOption.icon}</span>
                      <span>
                        <strong>{goalName(goalOption.id, lang)}</strong>
                        <small>{lang === "zh" ? goalOption.tagline.zh : goalOption.tagline.en}</small>
                      </span>
                    </span>
                  ),
                }))}
              </div>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            {optionField(t("questionnaire.experienceLabel"), (
              <div className="auth-options">
                {EXPERIENCE_OPTIONS.map((option) => optionButton({
                  key: option.id,
                  selected: answers.experience === option.id,
                  onClick: () => select("experience", option.id),
                  children: (
                    <span className="auth-option-inner">
                      <span className="auth-option-icon" aria-hidden="true">{option.icon}</span>
                      <span>
                        <strong>{t(`questionnaire.experience.${option.id}`)}</strong>
                        <small>{t(`questionnaire.experience.${option.id}Desc`)}</small>
                      </span>
                    </span>
                  ),
                }))}
              </div>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            {optionField(t("questionnaire.daysLabel"), (
              <div className="auth-options auth-options-row">
                {QUESTIONNAIRE_DAYS.map((days) => optionButton({
                  key: days,
                  selected: answers.daysPerWeek === days,
                  onClick: () => select("daysPerWeek", days),
                  children: (
                    <span className="auth-option-inner auth-option-plain">
                      <strong>{t("questionnaire.daysOption", { count: days })}</strong>
                    </span>
                  ),
                }))}
              </div>
            ))}
          </>
        )}

        {step === 4 && (
          <>
            {optionField(t("questionnaire.equipmentLabel"), (
              <div className="auth-options">
                {PRESET_EQUIPMENT.map((equipmentOption) => optionButton({
                  key: equipmentOption.id,
                  selected: answers.equipment === equipmentOption.id,
                  onClick: () => select("equipment", equipmentOption.id),
                  children: (
                    <span className="auth-option-inner">
                      <span>
                        <strong>{equipmentName(equipmentOption.id, lang)}</strong>
                        <small>{t(`questionnaire.equipment.${equipmentOption.id}`)}</small>
                      </span>
                    </span>
                  ),
                }))}
              </div>
            ))}
          </>
        )}

        {step === 5 && (
          <>
            {optionField(t("questionnaire.sessionLabel"), (
              <div className="auth-options auth-options-row">
                {optionButton({
                  key: "session-no-preference",
                  selected: answers.sessionMinutes === null,
                  onClick: () => select("sessionMinutes", null),
                  children: (
                    <span className="auth-option-inner auth-option-plain">
                      <strong>{t("questionnaire.noPreference")}</strong>
                    </span>
                  ),
                })}
                {QUESTIONNAIRE_SESSION_MINUTES.map((minutes) => optionButton({
                  key: minutes,
                  selected: answers.sessionMinutes === minutes,
                  onClick: () => select("sessionMinutes", minutes),
                  children: (
                    <span className="auth-option-inner auth-option-plain">
                      <strong>{t("questionnaire.sessionOption", { count: minutes })}</strong>
                    </span>
                  ),
                }))}
              </div>
            ))}
          </>
        )}

        {step === 6 && (
          <div className="questionnaire-generate">
            <div className="auth-options">
              {optionButton({
                key: "generate-yes",
                selected: answers.generatePlan,
                onClick: () => setAnswers((prev) => ({ ...prev, generatePlan: true })),
                children: (
                  <span className="auth-option-inner">
                    <span>
                      <strong>{t("questionnaire.generateYes")}</strong>
                      <small>{t("questionnaire.generateYesDesc", { count: answers.daysPerWeek || 3 })}</small>
                    </span>
                  </span>
                ),
              })}
              {optionButton({
                key: "generate-no",
                selected: answers.generatePlan === false,
                onClick: () => setAnswers((prev) => ({ ...prev, generatePlan: false })),
                children: (
                  <span className="auth-option-inner">
                    <span>
                      <strong>{t("questionnaire.generateNo")}</strong>
                      <small>{t("questionnaire.generateNoDesc")}</small>
                    </span>
                  </span>
                ),
              })}
            </div>
            <p className="questionnaire-note">{t("questionnaire.planNote")}</p>
            {error && <div className="questionnaire-error">{error}</div>}
          </div>
        )}

      </div>

      <div className="questionnaire-nav">
        {step > 1 && (
          <Button variant="ghost" className="auth-step-back" onClick={() => setStep((s) => Math.max(1, s - 1))}>
            {t("auth.back")}
          </Button>
        )}
        {onBack && step === 1 && (
          <Button variant="ghost" className="auth-step-back" onClick={onBack}>
            {t("questionnaire.backToAccount")}
          </Button>
        )}
        {step < STEP_COUNT && (
          <Button
            type="button"
            className="auth-submit auth-step-next"
            disabled={!stepAnswersComplete()}
            onClick={handleNext}
          >
            {t("auth.next")}
          </Button>
        )}
        {step === STEP_COUNT && (
          <Button
            type="button"
            className="auth-submit auth-step-next"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? t("questionnaire.saving") : t("questionnaire.save")}
          </Button>
        )}
      </div>
    </section>
  )
}