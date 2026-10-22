import { useState } from "react"

import { useTranslation } from "react-i18next"

import { normalizeTimerSound, playTimerSound, resolveAlertSound, vibrateTimerAlert } from "../../../lib/timerAlert.js"

import { Button, SegmentedToggle } from "../../atoms/index.js"
import { SoundPickerSheet } from "../../molecules/index.js"

const ToggleRow = ({ label, ariaLabel, value, disabled, onPick, t }) => {
  return (
    <div className="account-row">
      <span className="account-label">{label}</span>
      <SegmentedToggle
        options={[{ value: 1, label: t("common.on") }, { value: 0, label: t("common.off") }]}
        value={value}
        disabled={disabled}
        onPick={onPick}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}

export const TimerAlertsView = ({ user, onUpdateProfile, onBack }) => {
  const { t } = useTranslation()
  const soundLabel = (s) => t(`timer.${s}`)
  const [saving, setSaving] = useState(false)
  const [timerError, setTimerError] = useState(null)
  const [testingAlert, setTestingAlert] = useState(false)
  const [soundSheetOpen, setSoundSheetOpen] = useState(false)

  // Legacy 'off' sound without the flag means play-off.
  const currentPlaySound = user?.timerPlaySound === undefined || user?.timerPlaySound === null
    ? (String(user?.timerSound ?? "").toLowerCase() === "off" ? 0 : 1)
    : (user.timerPlaySound ? 1 : 0)
  const currentSound = normalizeTimerSound(user?.timerSound) === "off" ? "beep" : normalizeTimerSound(user?.timerSound)
  const currentVibrate = (user?.timerVibrate ?? 1) ? 1 : 0
  const currentFlash = (user?.timerFlash ?? 0) ? 1 : 0

  const pickTimer = async (field, value) => {
    const current = field === "timerSound" ? currentSound : field === "timerPlaySound" ? currentPlaySound : field === "timerVibrate" ? currentVibrate : currentFlash
    if (value === current || saving) return
    try {
      setSaving(true)
      setTimerError(null)
      await onUpdateProfile({ [field]: value })
    } catch (err) {
      setTimerError(err?.message || "Failed to update timer alert.")
    } finally {
      setSaving(false)
    }
  }

  const pickTimerSound = async (sound) => {
    playTimerSound(sound)
    await pickTimer("timerSound", sound)
  }

  const testTimerAlert = () => {
    if (testingAlert) return
    playTimerSound(resolveAlertSound(currentPlaySound, currentSound))
    if (currentVibrate) vibrateTimerAlert()
    if (currentFlash) {
      setTestingAlert(true)
      setTimeout(() => setTestingAlert(false), 1300)
    }
  }

  return (
    <section className="account-view" aria-label={t("timer.title")}>
      <Button variant="ghost" size="detail-small" className="balance-back" onClick={onBack}>
        {t("timer.backToAccount")}
      </Button>
      <div className="account-card">
        <h3 className="account-section-title">{t("timer.title")}</h3>
        <ToggleRow
          label={t("timer.playSound")}
          ariaLabel={t("timer.playSound")}
          t={t}
          value={currentPlaySound}
          disabled={saving}
          onPick={(v) => pickTimer("timerPlaySound", v)}
        />
        <div className="account-row">
          <button
            type="button"
            className="account-row-expand"
            onClick={() => setSoundSheetOpen(true)}
            aria-label={t("timer.soundAria", { sound: soundLabel(currentSound) })}
          >
            <span className="account-label">{t("timer.sound")}</span>
            <span className="account-value">{soundLabel(currentSound)}</span>
            <span className="history-expand-icon" aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
        <ToggleRow
          label={t("timer.vibrate")}
          ariaLabel={t("timer.vibrate")}
          t={t}
          value={currentVibrate}
          disabled={saving}
          onPick={(v) => pickTimer("timerVibrate", v)}
        />
        <ToggleRow
          label={t("timer.flash")}
          ariaLabel={t("timer.flash")}
          t={t}
          value={currentFlash}
          disabled={saving}
          onPick={(v) => pickTimer("timerFlash", v)}
        />
        <p className="account-hint">
          {t("timer.hint")}
        </p>
        <div className="account-edit-row">
          <Button variant="ghost" size="detail-small" onClick={testTimerAlert} disabled={testingAlert}>
            {t("timer.test")}
          </Button>
        </div>
        {timerError && <p className="account-inline-error">{timerError}</p>}
      </div>
      {testingAlert && <div className="rest-flash-overlay" aria-hidden="true" />}
      {soundSheetOpen && (
        <SoundPickerSheet
          value={currentSound}
          onSelect={(s) => pickTimerSound(s)}
          onClose={() => setSoundSheetOpen(false)}
        />
      )}
    </section>
  )
}
