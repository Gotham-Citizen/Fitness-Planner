/**
 * Segmented option toggle (`.unit-toggle` group). `options` are either plain
 * values (label defaults to the value, uppercased with `uppercase`) or
 * `{ value, label }` objects.
 */
export const SegmentedToggle = ({
  options,
  value,
  disabled = false,
  disableSelected = true,
  onPick,
  ariaLabel,
  uppercase = false,
}) => {
  return (
    <div className="unit-toggle" role="group" aria-label={ariaLabel}>
      {(options || []).map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value
        const label = typeof opt === "string" ? (uppercase ? opt.toUpperCase() : opt) : opt.label
        const selected = value === v
        return (
          <button
            key={v}
            type="button"
            className={`unit-toggle-button ${selected ? "is-selected" : ""}`}
            onClick={() => onPick?.(v)}
            disabled={disabled || (disableSelected && selected)}
            aria-pressed={selected}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
