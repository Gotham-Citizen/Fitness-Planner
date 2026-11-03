import { useCallback, useState } from "react"

import "./RestTimeDisplay.css"

import { formatRestSecs, formatRestSecsCompact } from "../RestTimePicker/formatRest.js"
import { RestTimePicker } from "../RestTimePicker/RestTimePicker.jsx"

/**
 * Label + trigger in one element.
 * - rest off  -> shows the "off" label; clicking turns rest on and opens the picker
 * - rest on   -> shows the current rest time; clicking opens the picker
 */
export const RestTimeDisplay = ({
  enabled,
  secs,
  onToggleAndOpen,
  onChange,
  offLabel = "Rest off",
  ariaLabel,
  min = 30,
  max = 180,
  step = 15,
  formatValue = formatRestSecs,
  showValue = "inside", // "inside" | "outside" | "none"
}) => {
  const [open, setOpen] = useState(false)
  // Anchor as state, not a ref: the picker's positioning effect needs the
  // element during render, and React 19 forbids reading ref.current there.
  const [anchorEl, setAnchorEl] = useState(null)

  const handleClick = useCallback(() => {
    if (!enabled) {
      onToggleAndOpen?.()
      setOpen(true)
      return
    }
    setOpen((prev) => !prev)
  }, [enabled, onToggleAndOpen])

  const handleSelect = useCallback(
    (next) => {
      setOpen(false)
      onChange?.(next)
    },
    [onChange],
  )

  const handleClose = useCallback(() => setOpen(false), [])

  const formatted = formatValue(secs)
  const displayValue = enabled ? formatted : offLabel

  return (
    <span className="rest-time-display-wrap">
      <button
        ref={setAnchorEl}
        type="button"
        className={`rest-time-display${enabled ? " is-on" : " is-off"}`}
        onClick={handleClick}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {enabled && typeof formatted === "object" ? (
          <>
            <span className="rest-time-display-value" aria-hidden="true">
              {formatted.value}
            </span>
          </>
        ) : showValue === "inside" ? (
          displayValue
        ) : (
          <>
            {enabled && <span aria-hidden="true">⏱</span>}
            {!enabled && offLabel}
          </>
        )}
      </button>
      {enabled && typeof formatted === "object" && (
        <span className="rest-time-display-unit" aria-hidden="true">
          {formatted.unit}
        </span>
      )}
      {showValue === "outside" && !enabled && (
        <span className="rest-time-display-value" aria-hidden="true">
          {offLabel}
        </span>
      )}
      {open && (
        <RestTimePicker
          anchorEl={anchorEl}
          value={secs}
          onSelect={handleSelect}
          onClose={handleClose}
          min={min}
          max={max}
          step={step}
          formatValue={formatRestSecsCompact}
          ariaLabel={ariaLabel}
        />
      )}
    </span>
  )
}