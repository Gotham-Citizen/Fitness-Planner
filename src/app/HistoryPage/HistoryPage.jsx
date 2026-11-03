import { WorkoutHistoryView } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

/**
 * Per-workout session history page. Thin composition.
 */
export const HistoryPage = ({
  banner,
  list,
  sessions,
  onBack,
  onOpenSummary,
  onDeleteSession,
  onClearAll,
}) => {
  return (
    <PlannerTemplate
      banner={banner}
      main={(
        <WorkoutHistoryView
          list={list}
          sessions={sessions}
          onBack={onBack}
          onOpenSummary={onOpenSummary}
          onDeleteSession={onDeleteSession}
          onClearAll={onClearAll}
        />
      )}
    />
  )
}
