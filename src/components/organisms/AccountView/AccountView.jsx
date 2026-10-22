import { useState } from "react"

import { useTranslation } from "react-i18next"

import { formatLongDate } from "../../../utils/format.js"
import { persistLanguage } from "../../../utils/i18n.js"
import { localeFromI18n } from "../../../utils/locale.js"
import { isValidEmail } from "../../../utils/validation.js"

import "./AccountView.css"

import { Button, FieldError, SegmentedToggle, TextInput } from "../../atoms/index.js"
import { SaveCancelRow } from "../../molecules/index.js"

export const AccountView = ({ user, onUpdateProfile, onLogout, onDeleteAccount, onOpenTimerAlerts }) => {
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
  const [languageError, setLanguageError] = useState(null)
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

  const pickEffort = async (picked) => {
    const next = picked === "rpe" ? "rpe" : "rir"
    const current = user?.effortScale === "rpe" ? "rpe" : "rir"
    if (next === current || savingField !== null) return
    try {
      setSavingField("effort")
      setEffortError(null)
      await onUpdateProfile({ effortScale: next })
    } catch (err) {
      setEffortError(err?.message || t("account.failedEffort"))
    } finally {
      setSavingField(null)
    }
  }

  const currentLanguage = String(user?.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const pickLanguage = async (picked) => {
    const next = picked === "zh" ? "zh" : "en"
    if (next === currentLanguage || savingField !== null) return
    try {
      setSavingField("language")
      setLanguageError(null)
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
        <h3 className="account-section-title">{t("account.prefs")}</h3>
        <div className="account-row">
          <span className="account-label">{t("account.effortPerSet")}</span>
          <SegmentedToggle
            options={["rir", "rpe"]}
            value={user?.effortScale === "rpe" ? "rpe" : "rir"}
            disabled={savingField !== null || editing !== null}
            onPick={pickEffort}
            ariaLabel={t("account.effortPerSet")}
            uppercase
          />
        </div>
        <p className="account-hint" role="status" aria-live="polite">
          {savingField === "effort" ? t("account.saving") : t("account.effortHint")}
        </p>
        {effortError && <p className="account-inline-error">{effortError}</p>}

        <div className="account-row">
          <span className="account-label">{t("account.language")}</span>
          <SegmentedToggle
            options={[{ value: "en", label: "English" }, { value: "zh", label: "中文" }]}
            value={currentLanguage}
            disabled={savingField !== null || editing !== null}
            onPick={pickLanguage}
            ariaLabel={t("account.language")}
          />
        </div>
        {languageError && <p className="account-inline-error">{languageError}</p>}

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
      </div>

      <div className="account-card">
        <h3 className="account-section-title">{t("account.session")}</h3>
        <div className="account-actions">
          <Button variant="ghost" onClick={onLogout}>
            {t("account.logout")}
          </Button>
          {!confirmingDelete && (
            <Button
              variant="ghost"
              tone="danger"
              onClick={startDelete}
            >
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
              <Button
                variant="ghost"
                tone="danger"
                size="detail-small"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? t("account.deleting") : t("account.confirmDelete")}
              </Button>
              <Button
                variant="ghost"
                size="detail-small"
                onClick={cancelDelete}
                disabled={deleting}
              >
                {t("account.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
