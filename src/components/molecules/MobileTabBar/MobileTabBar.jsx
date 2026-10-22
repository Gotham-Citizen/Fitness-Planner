import { useTranslation } from "react-i18next"

import "./MobileTabBar.css"

const TABS = [
  { id: "home", key: "tabs.home", icon: "home" },
  { id: "planner", key: "tabs.build", icon: "build" },
  { id: "workouts", key: "tabs.workouts", icon: "workouts" },
  { id: "journal", key: "tabs.journal", icon: "journal" },
  { id: "balance", key: "tabs.stats", icon: "stats" },
]

// Outline stroke icons (24x24, stroke=currentColor) matching the
// TileIcon aesthetic in WorkoutJournalView.jsx.
const TAB_ICONS = {
  home: (
    <>
      <path d="M4.5 11 12 4l7.5 7" />
      <path d="M6.2 9.6V20h11.6V9.6" />
      <path d="M10 20v-5.2h4V20" />
    </>
  ),
  build: (
    <>
      <path d="M12 3 3.5 8 12 13l8.5-5L12 3Z" />
      <path d="M3.5 12.5 12 17.5l8.5-5" />
      <path d="M3.5 16.5 12 21.5l8.5-5" />
    </>
  ),
  workouts: (
    <>
      <rect x="5.9" y="7.9" width="3.2" height="8.2" rx="1.3" />
      <rect x="14.9" y="7.9" width="3.2" height="8.2" rx="1.3" />
      <path d="M9.1 12h5.8M3.6 9.9v4.2M20.4 9.9v4.2" />
    </>
  ),
  journal: (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="2.5" />
      <path d="M9.2 3.5v17" />
      <path d="M12.4 8.5h3.2M12.4 12h3.2M12.4 15.5h3.2" />
    </>
  ),
  stats: (
    <>
      <path d="M4 4v15.5h16" />
      <path d="M8.5 15.5v-4M12.5 15.5V8M16.5 15.5v-6.5" />
    </>
  ),
}

const TabIcon = ({ name }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TAB_ICONS[name]}
    </svg>
  )
}

/**
 * Bottom tab bar for small screens (≤1024px). Rendered always; CSS hides it
 * on larger viewports. `active` is one of the tab ids; `onNavigate` receives
 * the tab id and maps to the App's existing view navigation.
 */
export const MobileTabBar = ({ active, onNavigate }) => {
  const { t } = useTranslation()
  return (
    <nav className="mobile-tabbar" aria-label={t("common.primary")}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tabbar-button${active === tab.id ? " is-active" : ""}`}
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="tabbar-icon" aria-hidden="true"><TabIcon name={tab.icon} /></span>
          <span className="tabbar-label">{t(tab.key)}</span>
        </button>
      ))}
    </nav>
  )
}
