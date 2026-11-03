import { Trans, useTranslation } from "react-i18next"

import "./AppHeader.css"

import { BrandLogo, Button } from "../../atoms/index.js"



/**
 * Top app header (organism). Pure navigation shell — no data fetching.
 * `view` is the App view id; `onNavigate(view)` switches views.
 */
export const AppHeader = ({
  view,
  historyReturnView,
  authenticated,
  userName,
  onGoHome,
  onNavigate,
  onLogin,
  onOpenAccount,
}) => {
  const { t } = useTranslation()
  const isJournalActive = view === "journal" || view === "workout-history" || (view === "history-summary" && ["journal", "workout-history"].includes(historyReturnView))
  const isBalanceActive = view === "balance" || view === "structural-balance"
  const isAccountActive = view === "account" || view === "timer-alerts"

  return (
    <header className="app-header">
      <a href="/" className="brand" onClick={(e) => { e.preventDefault(); onGoHome(); }}>
        <span className="brand-mark" aria-hidden="true"><BrandLogo /></span> Fitness Planner
      </a>
      <nav className="header-nav">
        <Button variant="nav" active={view === "home"} onClick={() => onNavigate("home")}>
          {t("nav.home")}
        </Button>
        <Button variant="nav" active={view === "planner"} onClick={() => onNavigate("planner")}>
          {t("nav.buildPlan")}
        </Button>
        <Button variant="nav" active={view === "workouts"} onClick={() => onNavigate("workouts")}>
          {t("nav.myWorkouts")}
        </Button>
        <Button variant="nav" active={isJournalActive} onClick={() => onNavigate("journal")}>
          {t("nav.journal")}
        </Button>
        <Button variant="nav" active={isBalanceActive} onClick={() => onNavigate("balance")}>
          {t("nav.stats")}
        </Button>
      </nav>
      <div className="header-actions">
        {authenticated ? (
          <button
            type="button"
            className={`header-user${isAccountActive ? " is-active" : ""}`}
            onClick={onOpenAccount}
            title={t("nav.accountSettings")}
            aria-label={t("nav.accountSettings")}
          >
            <span className="header-user-greeting">
              <Trans
                i18nKey="nav.hi"
                values={{ name: userName }}
                components={[<span className="header-user-name" />]}
              />
            </span>
          </button>
        ) : (
          <Button className="nav-login" onClick={onLogin}>
            {t("nav.getStarted")}
          </Button>
        )}
      </div>
    </header>
  )
}
