import "./Button.css"
/**
 * Shared button primitive (atom). Class-preserving wrapper over the
 * global button styles. Variants map to `${variant}-button`:
 * `primary` | `ghost` | `nav` | `secondary` | `icon`.
 * Component-specific buttons (`.brand`, `.tabbar-button`, `.journal-day`,
 * `.account-row-edit-btn`, …) stay in their own components.
 */
export const Button = ({
  variant = "primary",
  size = null,
  tone = null,
  active = false,
  className = "",
  type = "button",
  children,
  ...rest
}) => {
  const cls = [`${variant}-button`, size, tone, active ? "is-active" : "", className]
    .filter(Boolean)
    .join(" ")
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  )
}
