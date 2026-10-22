import { AuthView } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Auth gate page. Thin composition.
 */
export const AuthPage = ({ banner, authMode, onAuth, onBack }) => {
  return (
    <AuthTemplate banner={banner}>
      <AuthView key={authMode} initialMode={authMode} onAuth={onAuth} onBack={onBack} />
    </AuthTemplate>
  )
}
