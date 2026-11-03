import "./JournalTemplate.css"

import { BackToTop } from "../../atoms/index.js"
/**
 * Journal layout (template): banner + journal view + stat cards, no sidebar.
 * Slots only — no data fetching.
 */
export const JournalTemplate = ({ banner, journal, cards }) => {
  return (
    <div className="app-body">
      <main className="app-main" id="main-content">
        {banner}
        {journal}
        {cards}
      </main>
      <BackToTop />
    </div>
  )
}
