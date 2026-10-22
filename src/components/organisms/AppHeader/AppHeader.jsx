import { useTranslation } from "react-i18next"

import "./AppHeader.css"

import { BrandLogo, Button, ThemeToggle } from "../../atoms/index.js"



/**
 * Top app header (organism). Pure navigation shell — no data fetching.
 * `view` is the App view id; `onNavigate(view)` switches views.
 */
export const AppHeader = ({
  view,
  historyReturnView,
  authenticated,
  userName,
  theme,
  onGoHome,
  onNavigate,
  onLogin,
  onOpenAccount,
  onToggleTheme,
}) => {
  const { t } = useTranslation()
  const isJournalActive = view === "journal" || (view === "history-summary" && historyReturnView === "journal")
  const isBalanceActive = view === "balance" || view === "structural-balance"
  const isAccountActive = view === "account" || view === "timer-alerts"

  return (
    <header className="app-header">
      <button type="button" className="brand" onClick={onGoHome}>
        <span className="brand-mark" aria-hidden="true"><BrandLogo /></span> Fitness Planner
      </button>
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
          <Button
            variant="nav"
            className="nav-button--account"
            active={isAccountActive}
            onClick={(e) => { onOpenAccount(); if (e.detail !== 0) e.currentTarget.blur() }}
            title={userName}
          >
            <span className="header-user">{t("nav.hi", { name: userName })}</span>
          </Button>
        ) : (
          <Button className="nav-login" onClick={onLogin}>
            {t("nav.getStarted")}
          </Button>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
