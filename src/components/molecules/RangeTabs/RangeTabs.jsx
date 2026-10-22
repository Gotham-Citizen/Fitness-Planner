/**
 * Shared range/window tab row (`.balance-tabs`). Options carry `{ id }` plus
 * either a plain `label` or anything `renderLabel` understands (e.g. i18n keys).
 */
export const RangeTabs = ({ options, value, onChange, ariaLabel, renderLabel }) => {
  return (
    <div className="balance-tabs" role="tablist" aria-label={ariaLabel}>
      {(options || []).map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={`balance-tab ${value === o.id ? "is-active" : ""}`}
          onClick={() => onChange(o.id)}
        >
          {renderLabel ? renderLabel(o) : o.label}
        </button>
      ))}
    </div>
  )
}
