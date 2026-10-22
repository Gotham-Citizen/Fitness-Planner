import { useTranslation } from "react-i18next"

import { normalizeTimerSound, playTimerSound,TIMER_SOUNDS } from "../../../lib/timerAlert.js"

import { BottomSheet } from "../BottomSheet/BottomSheet.jsx"

// Bottom-sheet sound picker (openGym-style): tapping a sound plays it
// immediately as a preview, then saves it via onSelect.
export const SoundPickerSheet = ({ value, onSelect, onClose }) => {
  const { t } = useTranslation()
  const current = normalizeTimerSound(value)
  const label = (s) => t(`timer.${s}`)
  const blurb = (s) => t(`timer.${s}Blurb`)

  const pick = (s) => {
    playTimerSound(s)
    if (s !== current) onSelect?.(s)
    onClose?.()
  }

  return (
    <BottomSheet label={t("timer.chooseSound")} onClose={onClose}>
      <h3 className="rir-sheet-title" style={{ marginBottom: "2px" }}>{t("timer.sheetTitle")}</h3>
        <div className="muted small" style={{ marginBottom: "10px" }}>{t("timer.tapToHear")}</div>
        <div className="list menu-list effpick">
          {TIMER_SOUNDS.map((s) => {
            const active = current === s
            return (
              <div
                key={s}
                className={`item menu-item${active ? " is-active" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={t("timer.soundItem", { name: label(s) })}
                onClick={() => pick(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    pick(s)
                  }
                }}
              >
                <span className="lrow-i effpick-n effpick-n-sm">{label(s)}</span>
                <div className="grow"><div className="tt">{blurb(s)}</div></div>
                <span className="menu-on" aria-hidden={!active}>
                  <svg className="icn" data-icon="check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m4.8 12.6 4.8 4.8L19.2 6.8"></path>
                  </svg>
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ height: "4px" }}></div>
    </BottomSheet>
  )
}
