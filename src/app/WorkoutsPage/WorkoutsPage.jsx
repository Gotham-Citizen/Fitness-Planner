import { RecoveryPanel, WorkoutListsView } from "../../components/organisms/index.js"
import { WorkoutsTemplate } from "../../components/templates/index.js"

/**
 * My Workouts page: lists main + recovery sidebar. Thin composition.
 */
export const WorkoutsPage = ({
  banner,
  workoutLists,
  recovery,
  recoveryLoading,
  startingSession,
  onRemoveList,
  onOpenExercise,
  onCreateList,
  onRenameList,
  onEditWorkout,
  onStartSession,
  onHistory,
  onSelectMuscle,
}) => {
  return (
    <WorkoutsTemplate
      banner={banner}
      main={(
        <WorkoutListsView
          workoutLists={workoutLists}
          onRemoveList={onRemoveList}
          onOpenExercise={onOpenExercise}
          onCreateList={onCreateList}
          onRenameList={onRenameList}
          onEditWorkout={onEditWorkout}
          onStartSession={onStartSession}
          onHistory={onHistory}
          startingSession={startingSession}
        />
      )}
      sidebar={(
        <RecoveryPanel recovery={recovery} loading={recoveryLoading} onSelectMuscle={onSelectMuscle} />
      )}
    />
  )
}
