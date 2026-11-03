import { BottomSheet } from "../BottomSheet/BottomSheet.jsx"

/**
 * Generic bottom-sheet option picker: one tappable row per `{ value, label }`
 * option, checkmark on the active row. Rows reuse the shared RIR/sound sheet
 * styles. Title/subtitle/labels arrive pre-localized from the caller (see
 * CustomExerciseForm for body part / muscle / equipment picks).
 */
export const OptionPickerSheet = ({ title, subtitle, options, value, onPick, onClose }) => {
  const pick = (v) => {
    if (v !== value) onPick?.(v)
    onClose?.()
  }

  return (
    <BottomSheet label={title} onClose={onClose}>
      <h3 className="rir-sheet-title" style={{ marginBottom: "2px" }}>{title}</h3>
      {subtitle ? (
        <div className="muted small" style={{ marginBottom: "10px" }}>{subtitle}</div>
      ) : null}
      <div className="list menu-list effpick">
        {(options || []).map((opt) => {
          const active = value === opt.value
          return (
            <div
              key={opt.value}
              className={`item menu-item${active ? " is-active" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={opt.label}
              onClick={() => pick(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  pick(opt.value)
                }
              }}
            >
              <div className="grow"><div className="tt">{opt.label}</div></div>
              <span className="menu-on" aria-hidden={!active}>
                <svg className="icn" data-icon="check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m4.8 12.6 4.8 4.8L19.2 6.8"></path>
                </svg>
              </span>
            </div>
          )
        })}
        <div style={{ height: "4px" }}></div>
      </div>
    </BottomSheet>
  )
}
