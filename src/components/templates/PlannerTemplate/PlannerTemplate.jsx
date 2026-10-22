/**
 * Planner layout (template): banner + main content + library sidebar.
 * Slots only — no data fetching.
 */
export const PlannerTemplate = ({ banner, main, sidebar }) => {
  return (
    <div className={sidebar ? "app-body has-library is-planner" : "app-body"}>
      <main className="app-main">
        {banner}
        {main}
      </main>
      {sidebar}
    </div>
  )
}