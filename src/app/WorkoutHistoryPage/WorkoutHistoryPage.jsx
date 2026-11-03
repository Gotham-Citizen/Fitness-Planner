import { WorkoutHistoryView } from "../../components/organisms/index.js"
import { JournalTemplate } from "../../components/templates/index.js"

/**
 * All-sessions workout history page (opened from the Journal). Thin
 * composition: journal layout, one card per completed session across every
 * workout list, newest first, with the workout name on each card.
 */
export const WorkoutHistoryPage = ({
  banner,
  list,
  title,
  sessions,
  onBack,
  onOpenSummary,
  onDeleteSession,
}) => {
  return (
    <JournalTemplate
      banner={banner}
      journal={(
        <WorkoutHistoryView
          list={list}
          title={title}
          sessions={sessions}
          showListNames
          onBack={onBack}
          onOpenSummary={onOpenSummary}
          onDeleteSession={onDeleteSession}
        />
      )}
    />
  )
}
