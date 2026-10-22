import { AccountView } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Account page. Thin composition.
 */
export const AccountPage = ({
  banner,
  user,
  onUpdateProfile,
  onDeleteAccount,
  onLogout,
  onOpenTimerAlerts,
}) => {
  return (
    <AuthTemplate banner={banner}>
      <AccountView
        user={user}
        onUpdateProfile={onUpdateProfile}
        onDeleteAccount={onDeleteAccount}
        onLogout={onLogout}
        onOpenTimerAlerts={onOpenTimerAlerts}
      />
    </AuthTemplate>
  )
}
