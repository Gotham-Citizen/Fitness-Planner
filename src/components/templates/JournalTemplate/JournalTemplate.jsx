import "./JournalTemplate.css"
/**
 * Journal layout (template): banner + journal view + stat cards, no sidebar.
 * Slots only — no data fetching.
 */
export const JournalTemplate = ({ banner, journal, cards }) => {
  return (
    <div className="app-body">
      <main className="app-main">
        {banner}
        {journal}
        {cards}
      </main>
    </div>
  )
}
