/**
 * StatCard — square stat tile: accent-tinted icon badge, bold value,
 * uppercase label. Purely presentational; pass the icon as any ReactNode
 * (badge, glyph, and text scale with the viewport via CSS custom
 * properties; glyphs inherit the badge color).
 */
import "./StatCard.css"

export const StatCard = ({ icon, value, label, className = "" }) => {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <span className="stat-card-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
    </div>
  )
}
