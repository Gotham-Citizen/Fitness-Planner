import { useEffect,useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { login, signup } from "../../../lib/api.js"
import {
  equipmentName,
  goalName,
  PRESET_EQUIPMENT,
  PRESET_GOALS,
  QUESTIONNAIRE_DAYS,
  QUESTIONNAIRE_SESSION_MINUTES,
} from "../../../lib/presets/index.js"
import { normalizeLang } from "../../../utils/locale.js"
import { isValidEmail } from "../../../utils/validation.js"

import "./AuthView.css"

import { BrandLogo, Button, TextInput } from "../../atoms/index.js"

const STEP_COUNT = 6

const EXPERIENCE_OPTIONS = [
  { id: "beginner", icon: "🌱" },
  { id: "intermediate", icon: "⚡" },
  { id: "advanced", icon: "🔥" },
]

const GENDER_OPTIONS = [
  { id: "", key: "preferNot" },
  { id: "male", key: "male" },
  { id: "female", key: "female" },
  { id: "other", key: "other" },
]

const isValidName = (value) => {
  const trimmed = String(value || "").trim()
  return trimmed.length >= 2 && trimmed.length <= 30
}

// Single-line signup progress — one slim segment per step, reached segments
// filled. Rendered at the top of the auth page (like most register flows).
// Segments are decorative; the progressbar role carries the step info for
// screen readers via the localized "Step N of 6" label.
const SignupProgress = ({ step }) => {
  const { t } = useTranslation()
  return (
    <div
      className="auth-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEP_COUNT}
      aria-valuenow={step}
      aria-label={t("auth.stepOf", { n: step })}
    >
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <span key={i} className={`auth-progress-segment${i < step ? " is-reached" : ""}`} aria-hidden="true" />
      ))}
    </div>
  )
}

// Signup wizard. The training-goal survey (goal, experience, days, session
// length, equipment, starter-plan choice) is collected here as tap-to-select
// option cards — same choices as the retake questionnaire, no dropdowns —
// and saved with the account at creation.
// onAuth(token, user, "signup", { answers, generatePlan }) hands the answers
// to the app so a starter plan can be generated right after signup.
export const AuthView = ({ onAuth, initialMode = "login", onBack }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [mode, setMode] = useState(initialMode)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [gender, setGender] = useState("")
  const [goal, setGoal] = useState("")
  const [experience, setExperience] = useState("")
  const [daysPerWeek, setDaysPerWeek] = useState("")
  const [sessionMinutes, setSessionMinutes] = useState("")
  const [equipment, setEquipment] = useState("")
  const [generatePlan, setGeneratePlan] = useState("yes")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const previouslyFocusedRef = useRef(null)

  // Save focused element on mount, restore on unmount
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement
    return () => {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMode("login")
        setStep(1)
        setError(null)
        setName("")
        setEmail("")
        setPassword("")
        setGender("")
        setGoal("")
        setExperience("")
        setDaysPerWeek("")
        setSessionMinutes("")
        setEquipment("")
        setGeneratePlan("yes")
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mode])

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    if (next === "signup") setStep(1)
  }

  const stepAnswersComplete = () => {
    if (step === 3) return Boolean(goal && experience)
    if (step === 4) return Boolean(daysPerWeek)
    if (step === 5) return Boolean(equipment)
    return true
  }

  const validateStep = () => {
    if (step === 1 && !isValidName(name)) {
      setError(t("auth.errName"))
      return false
    }
    if (step === 3 && !goal) {
      setError(t("auth.errGoal"))
      return false
    }
    if (step === 3 && !experience) {
      setError(t("auth.errExperience"))
      return false
    }
    if (step === 4 && !daysPerWeek) {
      setError(t("auth.errDays"))
      return false
    }
    if (step === 5 && !equipment) {
      setError(t("auth.errEquipment"))
      return false
    }
    return true
  }

  const handleNext = () => {
    setError(null)
    if (!validateStep()) return
    setStep((s) => Math.min(STEP_COUNT, s + 1))
  }

  const handleBackStep = () => {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t("auth.errEmailPass"))
      return
    }
    setLoading(true)
    try {
      const { token, user } = await login(email.trim(), password)
      onAuth(token, user, "login")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    if (!isValidName(name)) {
      setError(t("auth.errName"))
      setStep(1)
      return
    }
    if (!goal) {
      setError(t("auth.errGoal"))
      setStep(3)
      return
    }
    if (!experience) {
      setError(t("auth.errExperience"))
      setStep(3)
      return
    }
    if (!daysPerWeek) {
      setError(t("auth.errDays"))
      setStep(4)
      return
    }
    if (!equipment) {
      setError(t("auth.errEquipment"))
      setStep(5)
      return
    }
    if (!isValidEmail(email)) {
      setError(t("auth.errEmail"))
      return
    }
    if (!password || password.length < 6) {
      setError(t("auth.errPass"))
      return
    }
    setLoading(true)
    try {
      const questionnaire = {
        goal,
        experience,
        daysPerWeek: Number(daysPerWeek),
        equipment,
      }
      if (sessionMinutes) questionnaire.sessionMinutes = Number(sessionMinutes)
      const { token, user } = await signup(
        email.trim(),
        password,
        gender || null,
        name.trim(),
        normalizeLang(i18n.language),
        questionnaire,
      )
      onAuth(token, user, "signup", { answers: questionnaire, generatePlan: generatePlan !== "no" })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (mode === "login") {
      await handleLogin()
      return
    }
    if (step < STEP_COUNT) {
      handleNext()
      return
    }
    await handleSignup()
  }

  const isSignup = mode === "signup"
  const subtitleMap = {
    1: t("auth.subName"),
    2: t("auth.subGender"),
    3: t("auth.subGoal"),
    4: t("auth.subSchedule"),
    5: t("auth.subEquipment"),
    6: t("auth.subSecure"),
  }
  const title = isSignup ? t("auth.titleSignup") : t("auth.titleLogin")
  const subtitle = !isSignup ? t("auth.subLogin") : subtitleMap[step]

  // Tap-to-select option card — mirrors the retake questionnaire's
  // question-option (aria-pressed + is-selected highlight).
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

  // Field label above a group of option cards (replaces label + select).
  const optionField = (labelText, children) => (
    <div className="auth-field">
      <span className="auth-field-label">{labelText}</span>
      {children}
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-page-inner">
        <header className="auth-page-header">
          <div className="auth-page-brand">
            <span className="brand-mark" aria-hidden="true"><BrandLogo /></span> Fitness Planner
          </div>
          <div className="auth-page-header-actions">
            {onBack && (
              <Button className="auth-page-back" onClick={onBack}>
                {t("auth.backToBrowsing")}
              </Button>
            )}
          </div>
        </header>

        {isSignup && <SignupProgress step={step} />}

        <section className="auth-hero">
          <h1 className="auth-hero-title">{title}</h1>
          <p className="auth-hero-subtitle">{subtitle}</p>
        </section>

        <section className="auth-form-panel">
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isSignup ? (
              <>
                <label className="auth-label">
                  {t("auth.email")}
                  <TextInput
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPh")}
                  />
                </label>
                <label className="auth-label">
                  {t("auth.password")}
                  <TextInput
                    className="auth-input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passPh")}
                  />
                </label>
              </>
            ) : step === 1 ? (
              <label className="auth-label">
                {t("auth.yourName")}
                <TextInput
                  className="auth-input"
                  type="text"
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  placeholder={t("auth.namePh")}
                  maxLength={30}
                  autoFocus
                />
              </label>
            ) : step === 2 ? (
              optionField(t("auth.genderLabel"), (
                <div className="auth-options auth-options-row">
                  {GENDER_OPTIONS.map((option) => optionButton({
                    key: option.id,
                    selected: gender === option.id,
                    onClick: () => { setGender(option.id); setError(null) },
                    children: (
                      <span className="auth-option-inner auth-option-plain">
                        <strong>{t(`auth.${option.key}`)}</strong>
                      </span>
                    ),
                  }))}
                </div>
              ))
            ) : step === 3 ? (
              <>
                {optionField(t("auth.goalLabel"), (
                  <div className="auth-options">
                    {PRESET_GOALS.map((goalOption) => optionButton({
                      key: goalOption.id,
                      selected: goal === goalOption.id,
                      onClick: () => { setGoal(goalOption.id); setError(null) },
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
                {optionField(t("auth.experienceLabel"), (
                  <div className="auth-options">
                    {EXPERIENCE_OPTIONS.map((option) => optionButton({
                      key: option.id,
                      selected: experience === option.id,
                      onClick: () => { setExperience(option.id); setError(null) },
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
            ) : step === 4 ? (
              <>
                {optionField(t("auth.daysLabel"), (
                  <div className="auth-options auth-options-row">
                    {QUESTIONNAIRE_DAYS.map((days) => optionButton({
                      key: days,
                      selected: daysPerWeek === days,
                      onClick: () => { setDaysPerWeek(days); setError(null) },
                      children: (
                        <span className="auth-option-inner auth-option-plain">
                          <strong>{t("questionnaire.daysOption", { count: days })}</strong>
                        </span>
                      ),
                    }))}
                  </div>
                ))}
                {optionField(t("auth.sessionLabel"), (
                  <div className="auth-options auth-options-row">
                    {optionButton({
                      key: "session-no-preference",
                      selected: sessionMinutes === "",
                      onClick: () => { setSessionMinutes(""); setError(null) },
                      children: (
                        <span className="auth-option-inner auth-option-plain">
                          <strong>{t("questionnaire.noPreference")}</strong>
                        </span>
                      ),
                    })}
                    {QUESTIONNAIRE_SESSION_MINUTES.map((minutes) => optionButton({
                      key: minutes,
                      selected: sessionMinutes === minutes,
                      onClick: () => { setSessionMinutes(minutes); setError(null) },
                      children: (
                        <span className="auth-option-inner auth-option-plain">
                          <strong>{t("questionnaire.sessionOption", { count: minutes })}</strong>
                        </span>
                      ),
                    }))}
                  </div>
                ))}
              </>
            ) : step === 5 ? (
              optionField(t("auth.equipmentLabel"), (
                <div className="auth-options">
                  {PRESET_EQUIPMENT.map((equipmentOption) => optionButton({
                    key: equipmentOption.id,
                    selected: equipment === equipmentOption.id,
                    onClick: () => { setEquipment(equipmentOption.id); setError(null) },
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
              ))
            ) : (
              <>
                <label className="auth-label">
                  {t("auth.email")}
                  <TextInput
                    className="auth-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    placeholder={t("auth.emailPh")}
                    autoFocus
                  />
                </label>
                <label className="auth-label">
                  {t("auth.password")}
                  <TextInput
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    placeholder={t("auth.passPhNew")}
                  />
                </label>
                {optionField(t("auth.planLabel"), (
                  <div className="auth-options">
                    {optionButton({
                      key: "plan-yes",
                      selected: generatePlan === "yes",
                      onClick: () => { setGeneratePlan("yes"); setError(null) },
                      children: (
                        <span className="auth-option-inner">
                          <span>
                            <strong>{t("auth.planYes")}</strong>
                          </span>
                        </span>
                      ),
                    })}
                    {optionButton({
                      key: "plan-no",
                      selected: generatePlan === "no",
                      onClick: () => { setGeneratePlan("no"); setError(null) },
                      children: (
                        <span className="auth-option-inner">
                          <span>
                            <strong>{t("auth.planNo")}</strong>
                          </span>
                        </span>
                      ),
                    })}
                  </div>
                ))}
              </>
            )}

            {error && <div className="auth-error">{error}</div>}

            {!isSignup ? (
              <Button type="submit" className="auth-submit" disabled={loading}>
                {loading ? t("auth.wait") : t("auth.login")}
              </Button>
            ) : step < STEP_COUNT ? (
              <div className="auth-step-row">
                {step > 1 && (
                  <Button variant="ghost" className="auth-step-back" onClick={handleBackStep}>
                    {t("auth.back")}
                  </Button>
                )}
                <Button
                  type="submit"
                  className="auth-submit auth-step-next"
                  disabled={(step === 1 && !isValidName(name)) || !stepAnswersComplete()}
                >
                  {t("auth.next")}
                </Button>
              </div>
            ) : (
              <div className="auth-step-row">
                <Button variant="ghost" className="auth-step-back" onClick={handleBackStep}>
                  {t("auth.back")}
                </Button>
                <Button type="submit" className="auth-submit auth-step-next" disabled={loading}>
                  {loading ? t("auth.wait") : t("auth.signup")}
                </Button>
              </div>
            )}
          </form>
        </section>

        {!isSignup && (
          <footer className="auth-page-footer">
            <Button
              variant="ghost"
              className="auth-page-switch"
              onClick={() => switchMode("signup")}
            >
              {t("auth.toSignup")}
            </Button>
          </footer>
        )}
      </div>
    </div>
  )
}
