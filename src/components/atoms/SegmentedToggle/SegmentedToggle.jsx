/**
 * Segmented option toggle. `options` are either plain values (label defaults
 * to the value, uppercased when `uppercase`) or `{ value, label }` objects.
 *
 * Purely structural — the consumer supplies the visual class names via
 * `className` / `buttonClassName`.
 */
export const SegmentedToggle = ({
  options,
  value,
  disabled = false,
  disableSelected = true,
  onPick,
  ariaLabel,
  uppercase = false,
  className = "",          // e.g. "unit-toggle"
  buttonClassName = "",    // e.g. "unit-toggle-button"
}) => {
  return (
    <div
      className={`segmented-toggle ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {(options || []).map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value
        const label =
          typeof opt === "string"
            ? uppercase
              ? opt.toUpperCase()
              : opt
            : opt.label
        const selected = value === v
        return (
          <button
            key={v}
            type="button"
            className={`segmented-toggle-button ${buttonClassName} ${
              selected ? "is-selected" : ""
            }`.trim()}
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