import { useState } from "react"

import { useTranslation } from "react-i18next"

import { login, signup } from "../../../lib/api.js"
import { normalizeLang } from "../../../utils/locale.js"
import { isValidEmail } from "../../../utils/validation.js"

import "./AuthView.css"

import { BrandLogo, Button, TextInput } from "../../atoms/index.js"



const isValidName = (value) => {
  const trimmed = String(value || "").trim()
  return trimmed.length >= 2 && trimmed.length <= 30
}

const SignupTracker = ({ step }) => {
  const { t } = useTranslation()
  const steps = t("auth.steps", { returnObjects: true })
  return (
    <ol className="auth-tracker" aria-label={t("auth.stepOf", { n: step })}>
      {steps.map((label, i) => {
        const n = i + 1
        const state = n === step ? "is-active" : n < step ? "is-done" : ""
        return (
          <li key={label} className={`auth-tracker-step ${state}`}>
            <span className="auth-tracker-num" aria-hidden="true">
              {n < step ? "✓" : n}
            </span>
            <span className="auth-tracker-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export const AuthView = ({ onAuth, initialMode = "login", onBack }) => {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState(initialMode)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [gender, setGender] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    if (next === "signup") setStep(1)
  }

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!isValidName(name)) {
        setError(t("auth.errName"))
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
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
      onAuth(token, user)
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
      const { token, user } = await signup(email.trim(), password, gender || null, name.trim(), normalizeLang(i18n.language))
      onAuth(token, user)
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
    if (step < 3) {
      handleNext()
      return
    }
    await handleSignup()
  }

  const isSignup = mode === "signup"
  const title = isSignup ? t("auth.titleSignup") : t("auth.titleLogin")
  const subtitle = !isSignup
    ? t("auth.subLogin")
    : step === 1
      ? t("auth.subName")
      : step === 2
        ? t("auth.subGender")
        : t("auth.subSecure")

  return (
    <div className="auth-page">
      <div className="auth-page-inner">
        <header className="auth-page-header">
          <div className="auth-page-brand">
            <span className="brand-mark" aria-hidden="true"><BrandLogo /></span> Fitness Planner
          </div>
          <div className="auth-page-header-actions">
            {onBack && (
              <Button variant="ghost" className="auth-page-back" onClick={onBack}>
                {t("auth.backToBrowsing")}
              </Button>
            )}
          </div>
        </header>

        <section className="auth-hero">
          <h1 className="auth-hero-title">{title}</h1>
          <p className="auth-hero-subtitle">{subtitle}</p>
        </section>

        {isSignup && <SignupTracker step={step} />}

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
              <label className="auth-label">
                {t("auth.genderLabel")}
                <select
                  className="text-input auth-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  autoFocus
                >
                  <option value="">{t("auth.preferNot")}</option>
                  <option value="male">{t("auth.male")}</option>
                  <option value="female">{t("auth.female")}</option>
                  <option value="other">{t("auth.other")}</option>
                </select>
              </label>
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
              </>
            )}

            {error && <div className="auth-error">{error}</div>}

            {!isSignup ? (
              <Button type="submit" className="auth-submit" disabled={loading}>
                {loading ? t("auth.wait") : t("auth.login")}
              </Button>
            ) : step < 3 ? (
              <div className="auth-step-row">
                {step > 1 && (
                  <Button variant="ghost" className="auth-step-back" onClick={handleBackStep}>
                    {t("auth.back")}
                  </Button>
                )}
                <Button
                  type="submit"
                  className="auth-submit auth-step-next"
                  disabled={step === 1 && !isValidName(name)}
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

        <footer className="auth-page-footer">
          <Button
            variant="ghost"
            className="auth-page-switch"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? t("auth.toLogin") : t("auth.toSignup")}
          </Button>
        </footer>
      </div>
    </div>
  )
}
