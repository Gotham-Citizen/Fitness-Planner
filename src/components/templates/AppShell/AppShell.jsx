import "./geometric.css"
import "./AppShell.css"

/**
 * Root page shell (template). Layout only — no route data fetching.
 * Slots: header, body (a *Template output incl. .app-body),
 * tabBar, overlays (modals), error (toast text).
 */
export const AppShell = ({ header, body, tabBar, overlays, error, onDismissError }) => {
  return (
    <div className="app">
      {header}
      {body}
      {tabBar}
      {overlays}
      {error && (
        <div className="error-toast" onClick={onDismissError}>
          <span className="error-toast-icon">⚠</span>
          {error}
        </div>
      )}
    </div>
  )
}
