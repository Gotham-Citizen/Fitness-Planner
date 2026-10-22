import { TimerAlertsView } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Timer alerts settings page. Thin composition.
 */
export const TimerAlertsPage = ({ banner, user, onUpdateProfile, onBack }) => {
  return (
    <AuthTemplate banner={banner}>
      <TimerAlertsView user={user} onUpdateProfile={onUpdateProfile} onBack={onBack} />
    </AuthTemplate>
  )
}
