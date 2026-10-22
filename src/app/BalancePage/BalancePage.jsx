import { useTranslation } from "react-i18next"

import { Button } from "../../components/atoms/index.js"
import { MuscleBalanceView, StructuralBalance } from "../../components/organisms/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

/**
 * Stats page: covers both `balance` and `structural-balance` views.
 * Thin composition.
 */
export const BalancePage = ({
  banner,
  mode = "balance",
  sessions,
  exercises,
  user,
  bodyweightKg,
  gender,
  onOpenStructural,
  onBackToBalance,
}) => {
  const { t } = useTranslation()
  return (
    <AuthTemplate banner={banner}>
      {mode === "structural" ? (
        <section className="balance-view" aria-label="Structural balance detail">
          <Button
            variant="ghost"
            size="detail-small"
            className="balance-back"
            onClick={onBackToBalance}
          >
            {t("balance.backToStats")}
          </Button>
          <StructuralBalance
            sessions={(sessions || []).filter((s) => s?.completedAt)}
            exercises={exercises || []}
            bodyweightKg={bodyweightKg}
            gender={gender}
          />
        </section>
      ) : (
        <MuscleBalanceView
          sessions={sessions}
          exercises={exercises || []}
          user={user}
          onOpenStructural={onOpenStructural}
        />
      )}
    </AuthTemplate>
  )
}
