import { PlanScheduleView } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Plan & schedule settings page. Thin composition.
 */
export const PlanSchedulePage = ({ banner, user, workoutLists, onUpdateProfile, onBack }) => {
  return (
    <AuthTemplate banner={banner}>
      <PlanScheduleView
        user={user}
        workoutLists={workoutLists}
        onUpdateProfile={onUpdateProfile}
        onBack={onBack}
      />
    </AuthTemplate>
  )
}
