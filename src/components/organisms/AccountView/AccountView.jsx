import { useState } from "react"

import { useTranslation } from "react-i18next"

import { equipmentName, goalName } from "../../../lib/presets/index.js"
import { formatLongDate } from "../../../utils/format.js"
import { persistLanguage } from "../../../utils/i18n.js"
import { localeFromI18n } from "../../../utils/locale.js"
import { normalizeTheme, THEMES } from "../../../utils/themes.js"
import { isValidEmail } from "../../../utils/validation.js"

import "./AccountView.css"

import { Button, FieldError, TextInput } from "../../atoms/index.js"
import { OptionPickerSheet, SaveCancelRow } from "../../molecules/index.js"


const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
]

const normalizeLanguageCode = (raw) => {
  const v = String(raw || "").toLowerCase()
  if (v.startsWith("zh")) return "zh"
  if (v.startsWith("es")) return "es"
  return "en"
}


export const AccountView = ({ user, theme, onPickTheme, onUpdateProfile, onLogout, onDeleteAccount, onOpenTimerAlerts, onOpenQuestionnaire, onOpenPlanSchedule }) => {
  const { t, i18n } = useTranslation()
  const locale = localeFromI18n(i18n)
  const [editing, setEditing] = useState(null)
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "")
  const [genderDraft, setGenderDraft] = useState(user?.gender ?? "")
  const [bwDraft, setBwDraft] = useState(user?.bodyweight != null ? String(user.bodyweight) : "")
  const [bwUnitDraft, setBwUnitDraft] = useState(user?.bodyweightUnit || "kg")
  const [savingField, setSavingField] = useState(null)
  const [fieldError, setFieldError] = useState(null)
  const [effortError, setEffortError] = useState(null)
  const [generalUnitError, setGeneralUnitError] = useState(null)
  const [languageError, setLanguageError] = useState(null)
  const [picker, setPicker] = useState(null) // "generalUnit" | "effort" | "theme" | "language" | null
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteDraft, setDeleteDraft] = useState("")
  const [deleteError, setDeleteError] = useState(null)

  if (!user) {
    return (
      <section className="loading">
        <span className="spinner" aria-hidden="true"></span> {t("account.loading")}
      </section>
    )
  }

  const formatDate = (value) => formatLongDate(value, locale)

  const genderLabel = (gender) => {
    if (gender === "male") return t("auth.male")
    if (gender === "female") return t("auth.female")
    if (gender === "other") return t("auth.other")
    return t("account.genderNotSet")
  }

  const displayName = user.name?.trim() || "user"
  const initial = displayName.charAt(0).toUpperCase() || "?"

  const currentGeneralUnit = user?.unit === "lbs" ? "lbs" : "kg"
  const currentEffort = user?.effortScale === "rpe" ? "rpe" : "rir"
  const currentThemeId = normalizeTheme(theme)
  const currentThemeLabel = (() => {
    const th = THEMES.find((x) => x.id === currentThemeId)
    return th ? t(`account.${th.nameKey}`) : currentThemeId
  })()

  const startEdit = (field) => {
    setFieldError(null)
    if (field === "email") setEmailDraft(user.email ?? "")
    if (field === "gender") setGenderDraft(user.gender ?? "")
    if (field === "bodyweight") {
      setBwDraft(user.bodyweight != null ? String(user.bodyweight) : "")
      setBwUnitDraft(user.bodyweightUnit || "kg")
    }
    setEditing(field)
  }

  const cancelEdit = () => {
    setEditing(null)
    setFieldError(null)
    setEffortError(null)
    setGeneralUnitError(null)
    setLanguageError(null)
    setSavingField(null)
  }

  const saveEmail = async () => {
    const cleaned = String(emailDraft || "").trim()
    if (!isValidEmail(cleaned)) {
      setFieldError(t("account.validEmailError"))
      return
    }
    if (cleaned.toLowerCase() === String(user.email || "").toLowerCase()) {
      setEditing(null)
      setFieldError(null)
      return
    }
    try {
      setSavingField("email")
      setFieldError(null)
      await onUpdateProfile({ email: cleaned })
      setEditing(null)
    } catch (err) {
      setFieldError(err?.status === 409 ? t("account.emailTaken") : (err?.message || t("account.failedEmail")))
    } finally {
      setSavingField(null)
    }
  }

  const saveGender = async () => {
    const next = genderDraft || null
    if ((next ?? "") === (user.gender ?? "")) {
      setEditing(null)
      setFieldError(null)
      return
    }
    try {
      setSavingField("gender")
      setFieldError(null)
      await onUpdateProfile({ gender: next })
      setEditing(null)
    } catch (err) {
      setFieldError(err?.message || t("account.failedGender"))
    } finally {
      setSavingField(null)
    }
  }

  const saveBodyweight = async () => {
    const trimmed = String(bwDraft || "").trim()
    if (trimmed === "") {
      try {
        setSavingField("bodyweight")
        setFieldError(null)
        await onUpdateProfile({ bodyweight: null, bodyweightUnit: bwUnitDraft })
        setEditing(null)
      } catch (err) {
        setFieldError(err?.message || t("account.failedBodyweight"))
      } finally {
        setSavingField(null)
      }
      return
    }
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n <= 0 || n >= 1500) {
      setFieldError(t("account.bodyweightError"))
      return
    }
    try {
      setSavingField("bodyweight")
      setFieldError(null)
      await onUpdateProfile({ bodyweight: n, bodyweightUnit: bwUnitDraft })
      setEditing(null)
    } catch (err) {
      setFieldError(err?.message || t("account.failedBodyweight"))
    } finally {
      setSavingField(null)
    }
  }

  const pickGeneralUnit = async (next) => {
    const normalized = next === "lbs" ? "lbs" : "kg"
    if (normalized === currentGeneralUnit || savingField !== null) return
    try {
      setSavingField("generalUnit")
      setGeneralUnitError(null)
      await onUpdateProfile({ unit: normalized })
    } catch (err) {
      setGeneralUnitError(err?.message || t("account.failedWeightUnit"))
    } finally {
      setSavingField(null)
    }
  }

  const pickEffort = async (picked) => {
    const next = picked === "rpe" ? "rpe" : "rir"
    if (next === currentEffort || savingField !== null) return
    try {
      setSavingField("effort")
      setEffortError(null)
      setFieldError(null)
      await onUpdateProfile({ effortScale: next })
    } catch (err) {
      setEffortError(err?.message || t("account.failedEffort"))
    } finally {
      setSavingField(null)
    }
  }

  const currentLanguage = normalizeLanguageCode(i18n.language || user?.language)
  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === currentLanguage)?.label || "English"

  const pickLanguage = async (picked) => {
    const next = normalizeLanguageCode(picked)
    if (next === currentLanguage || savingField !== null) return
    try {
      setSavingField("language")
      setLanguageError(null)
      setFieldError(null)
      await i18n.changeLanguage(next)
      persistLanguage(next)
      await onUpdateProfile({ language: next })
    } catch (err) {
      await i18n.changeLanguage(currentLanguage)
      persistLanguage(currentLanguage)
      setLanguageError(err?.message || t("account.failedLanguage"))
    } finally {
      setSavingField(null)
    }
  }

  const currentTimerSummary = (() => {
    const playOn = user?.timerPlaySound === undefined || user?.timerPlaySound === null
      ? String(user?.timerSound ?? "").toLowerCase() !== "off"
      : Boolean(user.timerPlaySound)
    const parts = []
    if (playOn) {
      const s = String(user?.timerSound ?? "beep").toLowerCase()
      parts.push(t(`timer.${s === "off" ? "beep" : s}`))
    }
    if ((user?.timerVibrate ?? 1)) parts.push(t("timer.vibrate"))
    if ((user?.timerFlash ?? 0)) parts.push(t("timer.flash"))
    return parts.length > 0 ? parts.join(" · ") : t("common.off")
  })()

  const planScheduleSummary = (() => {
    const s = user?.schedule
    if (!s || typeof s !== "object") return t("common.notSet")
    if (s.mode === "rotation") {
      return t("account.planRotationSummary", { count: (Array.isArray(s.rotation) ? s.rotation : []).length })
    }
    const days = Object.values(s.fixed || {}).filter(Boolean).length
    return t("account.planFixedSummary", { count: days })
  })()

  // Theme picker options — each row is painted in the theme's own colors.
  // We try explicit colors on the THEMES entry first, then fall back to
  // `data-theme` (CSS-variable based theming).
  const themePickerOptions = THEMES.map((th) => {
    const bg = th.bg || th.preview?.bg || th.colors?.bg || th.previewBg
    const fg = th.fg || th.text || th.preview?.text || th.colors?.text || th.previewText
    return {
      value: th.id,
      label: t(`account.${th.nameKey}`),
      dataTheme: th.id,
      style: bg && fg ? { background: bg, color: fg, borderColor: fg } : undefined,
    }
  })

  const startDelete = () => {
    setDeleteDraft("")
    setDeleteError(null)
    setConfirmingDelete(true)
  }

  const cancelDelete = () => {
    if (deleting) return
    setConfirmingDelete(false)
    setDeleteDraft("")
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (deleting) return
    if (String(deleteDraft || "").trim().toLowerCase() !== String(user?.email || "").trim().toLowerCase()) {
      setDeleteError(t("account.emailMismatch"))
      return
    }
    try {
      setDeleting(true)
      setDeleteError(null)
      await onDeleteAccount()
      // Success unmounts this view via logout -> main page; do not reset state.
    } catch (err) {
      setDeleteError(err?.message || t("account.failedDelete"))
      setDeleting(false)
    }
  }

  const rowDisabled = editing !== null || savingField !== null

  return (
    <section className="account-view">
      <div className="account-header">
        <div className="account-avatar" aria-hidden="true">{initial}</div>
        <div className="account-header-text">
          <h2 className="workouts-title account-title">{displayName}</h2>
        </div>
      </div>

      <div className="account-card">
        <h3 className="account-section-title">{t("account.personalInfo")}</h3>

        <div className={`account-row ${editing === "email" ? "is-editing" : ""}`}>
          <span className="account-label">{t("account.email")}</span>
          {editing === "email" ? (
            <div className="account-edit">
              <TextInput
                type="email"
                value={emailDraft}
                onChange={(e) => { setEmailDraft(e.target.value); setFieldError(null) }}
                placeholder={t("auth.emailPh")}
                aria-label={t("account.emailAddr")}
                autoFocus
              />
              <SaveCancelRow
                saving={savingField === "email"}
                saveDisabled={!isValidEmail(emailDraft)}
                onSave={saveEmail}
                onCancel={cancelEdit}
                savingLabel={t("account.saving")}
                saveLabel={t("account.save")}
                cancelLabel={t("account.cancel")}
              />
              <FieldError error={fieldError} />
            </div>
          ) : (
            <>
              <span className="account-value">{user.email || "—"}</span>
              <button type="button" className="account-row-edit-btn" onClick={() => startEdit("email")} disabled={editing !== null}>
                {t("common.edit")}
              </button>
            </>
          )}
        </div>

        <div className={`account-row ${editing === "gender" ? "is-editing" : ""}`}>
          <span className="account-label">{t("account.gender")}</span>
          {editing === "gender" ? (
            <div className="account-edit">
              <select
                className="text-input"
                value={genderDraft}
                onChange={(e) => { setGenderDraft(e.target.value); setFieldError(null) }}
                aria-label={t("auth.genderLabel")}
                autoFocus
              >
                <option value="">{t("auth.preferNot")}</option>
                <option value="male">{t("auth.male")}</option>
                <option value="female">{t("auth.female")}</option>
                <option value="other">{t("account.genderOtherRanks")}</option>
              </select>
              <p className="account-hint">{t("account.genderHint")}</p>
              <SaveCancelRow
                saving={savingField === "gender"}
                onSave={saveGender}
                onCancel={cancelEdit}
                savingLabel={t("account.saving")}
                saveLabel={t("account.save")}
                cancelLabel={t("account.cancel")}
              />
              <FieldError error={fieldError} />
            </div>
          ) : (
            <>
              <span className="account-value">{genderLabel(user.gender)}</span>
              <button type="button" className="account-row-edit-btn" onClick={() => startEdit("gender")} disabled={editing !== null}>
                {t("common.edit")}
              </button>
            </>
          )}
        </div>

        <div className="account-row">
          <span className="account-label">{t("account.memberSinceRow")}</span>
          <span className="account-value">{formatDate(user.createdAt)}</span>
        </div>
        <div className={`account-row ${editing === "bodyweight" ? "is-editing" : ""}`}>
          <span className="account-label">{t("account.bodyweight")}</span>
          {editing === "bodyweight" ? (
            <div className="account-edit">
              <div className="account-edit-row">
                <TextInput
                  type="number"
                  min="20"
                  max="1500"
                  step="0.1"
                  value={bwDraft}
                  onChange={(e) => { setBwDraft(e.target.value); setFieldError(null) }}
                  placeholder={t("account.bodyweightPh")}
                  aria-label={t("account.bodyweight")}
                  autoFocus
                />
                <select
                  className="text-input"
                  value={bwUnitDraft}
                  onChange={(e) => { setBwUnitDraft(e.target.value); setFieldError(null) }}
                  aria-label={t("account.bodyweightUnit")}
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
              <p className="account-hint">{t("account.bodyweightHint")}</p>
              <SaveCancelRow
                saving={savingField === "bodyweight"}
                onSave={saveBodyweight}
                onCancel={cancelEdit}
                savingLabel={t("account.saving")}
                saveLabel={t("account.save")}
                cancelLabel={t("account.cancel")}
              />
              <FieldError error={fieldError} />
            </div>
          ) : (
            <>
              <span className="account-value">{user.bodyweight != null ? `${user.bodyweight} ${user.bodyweightUnit || "kg"}` : t("common.notSet")}</span>
              <button type="button" className="account-row-edit-btn" onClick={() => startEdit("bodyweight")} disabled={editing !== null}>
                {t("common.edit")}
              </button>
            </>
          )}
        </div>
        <div className="account-row">
          <span className="account-label">{t("account.userId")}</span>
          <span className="account-value account-mono">{user.id || "—"}</span>
        </div>
      </div>

      <div className="account-card">
        <h3 className="account-section-title">{t("account.goalsTitle")}</h3>
        {user?.questionnaire ? (
          <>
            <div className="account-row">
              <span className="account-label">{t("questionnaire.q1")}</span>
              <span className="account-value">{goalName(user.questionnaire.goal, currentLanguage)}</span>
            </div>
            <div className="account-row">
              <span className="account-label">{t("questionnaire.experienceLabel")}</span>
              <span className="account-value">{t(`questionnaire.experience.${user.questionnaire.experience}`)}</span>
            </div>
            <div className="account-row">
              <span className="account-label">{t("questionnaire.q3")}</span>
              <span className="account-value">{t("questionnaire.daysOption", { count: user.questionnaire.daysPerWeek })}</span>
            </div>
            <div className="account-row">
              <span className="account-label">{t("questionnaire.q4")}</span>
              <span className="account-value">{equipmentName(user.questionnaire.equipment, currentLanguage)}</span>
            </div>
            {user.questionnaire.sessionMinutes ? (
              <div className="account-row">
                <span className="account-label">{t("questionnaire.q5")}</span>
                <span className="account-value">{t("questionnaire.sessionOption", { count: user.questionnaire.sessionMinutes })}</span>
              </div>
            ) : null}
            <div className="account-row">
              <span className="account-label">{t("account.goalsUpdated")}</span>
              <span className="account-value">{user.questionnaireUpdatedAt ? formatDate(user.questionnaireUpdatedAt) : "—"}</span>
            </div>
            <div className="account-goals-actions">
              <Button variant="secondary" onClick={onOpenQuestionnaire}>
                {t("account.goalsRetake")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="account-goals-empty">{t("account.goalsEmpty")}</p>
            <div className="account-goals-actions">
              <Button variant="secondary" onClick={onOpenQuestionnaire}>
                {t("account.goalsFill")}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="account-card">
        <h3 className="account-section-title">{t("account.prefs")}</h3>

        {/* General weight unit — default for exercise/set weights */}
        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => setPicker("generalUnit")}
            disabled={rowDisabled}
            aria-label={t("account.weightUnit")}
          >
            <span className="account-label">{t("account.weightUnit")}</span>
            <span className="account-value">{currentGeneralUnit}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
        <p className="account-hint" role="status" aria-live="polite">
          {savingField === "generalUnit" ? t("account.saving") : t("account.weightUnitHint")}
        </p>
        {generalUnitError && <p className="account-inline-error">{generalUnitError}</p>}

        {/* Effort — opens a RIR/RPE bottom picker */}
        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => setPicker("effort")}
            disabled={rowDisabled}
            aria-label={t("account.effortPerSet")}
          >
            <span className="account-label">{t("account.effortPerSet")}</span>
            <span className="account-value">{currentEffort.toUpperCase()}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
        <p className="account-hint" role="status" aria-live="polite">
          {savingField === "effort" ? t("account.saving") : t("account.effortHint")}
        </p>
        {effortError && <p className="account-inline-error">{effortError}</p>}

        {/* Language — expand row + bottom picker, matching Theme/Unit/Effort */}
        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => setPicker("language")}
            disabled={rowDisabled}
            aria-label={t("account.language")}
          >
            <span className="account-label">{t("account.language")}</span>
            <span className="account-value">{currentLanguageLabel}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
        {savingField === "language" && (
          <p className="account-hint" role="status" aria-live="polite">{t("account.saving")}</p>
        )}
        {languageError && <p className="account-inline-error">{languageError}</p>}

        {/* Theme — opens a bottom picker where each row is painted in that theme's colors */}
        <div className="account-row account-row--theme">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => setPicker("theme")}
            disabled={rowDisabled}
            aria-label={t("account.theme")}
          >
            <span className="account-label">{t("account.theme")}</span>
            <span className="account-value">{currentThemeLabel}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>

        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => onOpenTimerAlerts?.()}
            aria-label={t("account.timerAlertsAria", { summary: currentTimerSummary })}
          >
            <span className="account-label">{t("account.timerAlerts")}</span>
            <span className="account-value">{currentTimerSummary}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>

        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => onOpenPlanSchedule?.()}
            aria-label={t("account.planScheduleAria", { summary: planScheduleSummary })}
          >
            <span className="account-label">{t("account.planSchedule")}</span>
            <span className="account-value">{planScheduleSummary}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </div>

      <div className="account-card">
        <h3 className="account-section-title">{t("account.session")}</h3>
        <div className="account-actions">
          <Button variant="ghost" onClick={onLogout}>
            {t("account.logout")}
          </Button>
          {!confirmingDelete && (
            <Button variant="ghost" tone="danger" onClick={startDelete}>
              {t("account.deleteAccount")}
            </Button>
          )}
        </div>
        {confirmingDelete && (
          <div className="account-edit">
            <p className="account-hint">{t("account.deleteHint")}</p>
            <label className="auth-label">
              {t("account.typeEmailConfirm", { email: user.email || "" })}
              <TextInput
                type="email"
                value={deleteDraft}
                onChange={(e) => { setDeleteDraft(e.target.value); setDeleteError(null) }}
                placeholder={user.email || t("auth.emailPh")}
                aria-label={t("auth.email")}
                autoFocus
              />
            </label>
            {deleteError && <p className="account-inline-error">{deleteError}</p>}
            <div className="account-edit-row">
              <Button variant="ghost" tone="danger" size="detail-small" onClick={confirmDelete} disabled={deleting}>
                {deleting ? t("account.deleting") : t("account.confirmDelete")}
              </Button>
              <Button variant="ghost" size="detail-small" onClick={cancelDelete} disabled={deleting}>
                {t("account.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom pickers */}
      {picker === "generalUnit" && (
        <OptionPickerSheet
          title={t("account.weightUnit")}
          options={[
            { value: "kg", label: "kg" },
            { value: "lbs", label: "lbs" },
          ]}
          value={currentGeneralUnit}
          onPick={pickGeneralUnit}
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "effort" && (
        <OptionPickerSheet
          title={t("account.effortPerSet")}
          options={[
            { value: "rir", label: "RIR" },
            { value: "rpe", label: "RPE" },
          ]}
          value={currentEffort}
          onPick={pickEffort}
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "theme" && (
        <OptionPickerSheet
          title={t("account.theme")}
          options={themePickerOptions}
          value={currentThemeId}
          onPick={(v) => onPickTheme?.(normalizeTheme(v))}
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "language" && (
        <OptionPickerSheet
          title={t("account.language")}
          options={LANGUAGE_OPTIONS}
          value={currentLanguage}
          onPick={pickLanguage}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  )
}