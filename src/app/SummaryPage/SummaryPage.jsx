import { WorkoutSummaryView } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

/**
 * Summary page: covers both `summary` and `history-summary` modes.
 * Thin composition. `sidebar` preserves the legacy library rail
 * (hidden for journal-originated history summaries).
 */
export const SummaryPage = ({
  banner,
  sidebar,
  list,
  session,
  mode = "finish",
  heroTitle,
  previousSessions,
  gender,
  onDone,
  onHistory,
  onBack,
}) => {
  return (
    <PlannerTemplate
      banner={banner}
      main={(
        <WorkoutSummaryView
          list={list}
          session={session}
          mode={mode}
          heroTitle={heroTitle}
          onDone={onDone}
          onHistory={onHistory}
          onBack={onBack}
          previousSessions={previousSessions}
          gender={gender}
        />
      )}
      sidebar={sidebar}
    />
  )
}
