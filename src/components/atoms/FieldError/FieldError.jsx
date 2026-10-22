/** Inline form error line (`.account-inline-error`). Renders nothing when empty. */
export const FieldError = ({ error }) => {
  if (!error) return null
  return <p className="account-inline-error">{error}</p>
}
