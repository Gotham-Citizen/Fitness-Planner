/**
 * Workouts layout (template): banner + main content + recovery sidebar.
 * Slots only — no data fetching.
 */
export const WorkoutsTemplate = ({ banner, main, sidebar }) => {
  return (
    <div className={sidebar ? "app-body has-library" : "app-body"}>
      <main className="app-main">
        {banner}
        {main}
      </main>
      {sidebar}
    </div>
  )
}
