import { BackToTop } from "../../atoms/index.js"

/**
 * Workouts layout (template): banner + main content + recovery sidebar.
 * Slots only — no data fetching.
 */
export const WorkoutsTemplate = ({ banner, main, sidebar }) => {
  return (
    <div className={sidebar ? "app-body has-panel" : "app-body"}>
      <main className="app-main" id="main-content">
        {banner}
        {main}
      </main>
      {sidebar}
      <BackToTop />
    </div>
  )
}
