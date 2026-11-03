import { useRef } from "react"

import { useTranslation } from "react-i18next"

import "./MobileTabBar.css"

const TABS = [
  { id: "home", key: "tabs.home", icon: "home" },
  { id: "planner", key: "tabs.build", icon: "build" },
  { id: "workouts", key: "tabs.workouts", icon: "workouts" },
  { id: "journal", key: "tabs.journal", icon: "journal" },
  { id: "balance", key: "tabs.stats", icon: "stats" },
]

// 24x24 tab icons tinted via currentColor, matching the TileIcon aesthetic
// in WorkoutJournalView.jsx. Mostly outline strokes — the workouts tab is
// a filled rotated dumbbell authored in 500x500 space (scaled 24/500).
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
    <g
      fill="currentColor"
      stroke="none"
      transform="scale(0.048) rotate(-45 250 250)"
    >
      {/* Center bar / handle */}
      <rect x="163.0" y="235" width="174.0" height="30" rx="15" ry="15" />
      {/* Inner plates */}
      <rect x="163.0" y="160" width="36" height="180" rx="18" ry="18" />
      <rect x="301.0" y="160" width="36" height="180" rx="18" ry="18" />
      {/* Outer plates */}
      <rect x="118.0" y="185" width="40" height="130" rx="18" ry="18" />
      <rect x="342.0" y="185" width="40" height="130" rx="18" ry="18" />
      {/* End caps */}
      <rect x="93.0" y="225" width="20" height="50" rx="10" ry="10" />
      <rect x="387.0" y="225" width="20" height="50" rx="10" ry="10" />
    </g>
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
  const tabsRef = useRef([])

  const handleKeyDown = (e, index) => {
    let newIndex
    if (e.key === "ArrowRight") {
      newIndex = (index + 1) % TABS.length
    } else if (e.key === "ArrowLeft") {
      newIndex = (index - 1 + TABS.length) % TABS.length
    } else if (e.key === "Home") {
      newIndex = 0
    } else if (e.key === "End") {
      newIndex = TABS.length - 1
    } else {
      return
    }
    e.preventDefault()
    tabsRef.current[newIndex]?.focus()
    onNavigate(TABS[newIndex].id)
  }

  return (
    <nav className="mobile-tabbar" role="tablist" aria-label={t("common.primary")}>
      {TABS.map((tab, index) => {
        const isSelected = active === tab.id
        return (
          <button
            ref={(el) => { tabsRef.current[index] = el }}
            key={tab.id}
            type="button"
            role="tab"
            className={`tabbar-button${isSelected ? " is-active" : ""}`}
            aria-selected={isSelected}
            id={`tab-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onNavigate(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            <span className="tabbar-icon" aria-hidden="true"><TabIcon name={tab.icon} /></span>
            <span className="tabbar-label">{t(tab.key)}</span>
          </button>
        )
      })}
    </nav>
  )
}