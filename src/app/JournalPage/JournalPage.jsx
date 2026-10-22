import { BodyweightCard, EffortCard, WorkoutJournalView } from "../../components/organisms/index.js"
import { JournalTemplate } from "../../components/templates/index.js"

/**
 * Journal page: calendar view + bodyweight/effort cards. Thin composition.
 */
export const JournalPage = ({
  banner,
  sessions,
  workoutLists,
  filterListId,
  onFilterChange,
  selectedDateKey,
  onSelectDate,
  onOpenSession,
  loading,
  weighIns,
  weightUnit,
  user,
  weighInsLoading,
  showEffort,
  savingWeighIn,
  effortScale,
  onLogWeighIn,
  onDeleteWeighIn,
  onSetGoal,
}) => {
  return (
    <JournalTemplate
      banner={banner}
      journal={(
        <WorkoutJournalView
          sessions={sessions}
          workoutLists={workoutLists}
          filterListId={filterListId}
          onFilterChange={onFilterChange}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          onOpenSession={onOpenSession}
          loading={loading}
          weighIns={weighIns}
          weightUnit={weightUnit}
        />
      )}
      cards={(
        <div className={`journal-cards${showEffort ? "" : " is-single"}`}>
          <BodyweightCard
            user={user}
            weighIns={weighIns}
            loading={weighInsLoading}
            onLogWeighIn={onLogWeighIn}
            onDeleteWeighIn={onDeleteWeighIn}
            onSetGoal={onSetGoal}
            saving={savingWeighIn}
          />
          <EffortCard sessions={sessions} effortScale={effortScale} />
        </div>
      )}
    />
  )
}
