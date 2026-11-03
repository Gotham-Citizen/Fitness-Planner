import { useScrollMemory } from "../../hooks/index.js"

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
  showGoalsPrompt,
  onOpenQuestionnaire,
  onOpenPresets,
}) => {
  // Opening a movement detail from a workout card unmounts this page;
  // restore the ".app-main" scroll offset on return (see useScrollMemory).
  useScrollMemory("workouts")

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
          showGoalsPrompt={showGoalsPrompt}
          onOpenQuestionnaire={onOpenQuestionnaire}
          onOpenPresets={onOpenPresets}
        />
      )}
      sidebar={(
        <RecoveryPanel recovery={recovery} loading={recoveryLoading} onSelectMuscle={onSelectMuscle} />
      )}
    />
  )
}
