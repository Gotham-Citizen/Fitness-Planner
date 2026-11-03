import { AccountView } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Account page. Thin composition.
 */
export const AccountPage = ({
  banner,
  user,
  theme,
  onPickTheme,
  onUpdateProfile,
  onDeleteAccount,
  onLogout,
  onOpenTimerAlerts,
  onOpenQuestionnaire,
  onOpenPlanSchedule,
}) => {
  return (
    <AuthTemplate banner={banner}>
      <AccountView
        user={user}
        theme={theme}
        onPickTheme={onPickTheme}
        onUpdateProfile={onUpdateProfile}
        onDeleteAccount={onDeleteAccount}
        onLogout={onLogout}
        onOpenTimerAlerts={onOpenTimerAlerts}
        onOpenQuestionnaire={onOpenQuestionnaire}
        onOpenPlanSchedule={onOpenPlanSchedule}
      />
    </AuthTemplate>
  )
}
