/**
 * Single-column layout (template): banner + centered content, no sidebar.
 * Used for auth, home, session, summary, history, balance, account, timer.
 * Slots only — no data fetching.
 */
export const AuthTemplate = ({ banner, children }) => {
  return (
    <div className="app-body">
      <main className="app-main">
        {banner}
        {children}
      </main>
    </div>
  )
}
