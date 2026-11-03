import { BackToTop } from "../../atoms/index.js"

/**
 * Planner layout (template): banner + main content + library sidebar.
 * Slots only — no data fetching.
 */
export const PlannerTemplate = ({ banner, main, sidebar }) => {
  return (
    <div className={sidebar ? "app-body has-panel is-planner" : "app-body"}>
      <main className="app-main" id="main-content">
        {banner}
        {main}
      </main>
      {sidebar}
      <BackToTop />
    </div>
  )
}