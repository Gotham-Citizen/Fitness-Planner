import { BodyweightCard, EffortCard, WorkoutJournalView } from "../../components/organisms/index.js"
import { JournalTemplate } from "../../components/templates/index.js"

/**
 * Journal page: calendar view + bodyweight/effort cards. Thin composition.
 */
export const JournalPage = ({
  banner,
  sessions,
  workoutLists,
  exercises,
  filterListId,
  onFilterChange,
  selectedDateKey,
  onSelectDate,
  onOpenSession,
  onOpenHistory,
  // 👇 new: opens the full personal-records page
  onOpenPersonalRecords,
  loading,
  weighIns,
  weightUnit,
  user,
  weighInsLoading,
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
          exercises={exercises}
          gender={user?.gender}
          filterListId={filterListId}
          onFilterChange={onFilterChange}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          onOpenSession={onOpenSession}
          onOpenHistory={onOpenHistory}
          onOpenPersonalRecords={onOpenPersonalRecords}   // 👈 pass through
          loading={loading}
          weighIns={weighIns}
          weightUnit={weightUnit}
        />
      )}
      cards={(
        <div className="journal-cards">
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