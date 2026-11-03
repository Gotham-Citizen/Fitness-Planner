// Summary stat tile icons (24x24), tinted via currentColor — StatCard's icon
// badge tints them with the accent color. Most are outline stroke glyphs
// matching the TabIcon aesthetic in MobileTabBar.jsx.
//
// duration: clock · exercises: flexed arm + dumbbell plate ·
// sets: repeat/cycle arrows · volume: filled rotated dumbbell (same glyph
// as MobileTabBar's workouts tab for a consistent icon language).

const STAT_ICONS = {
  duration: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 1.9" />
    </>
  ),
  // Flexed arm + dumbbell plate — plate end-on as a ring with hub dot,
  // arm rising from the shoulder at lower left, curling up under it.
  exercises: (
    <>
      <circle cx="13.4" cy="7" r="3.8" />
      <circle cx="13.4" cy="7" r="1.2" />
      <path d="M4.8 12.1C4.8 12.1 6.7 12.1 8.1 13.4L6.7 14.8C8.6 13.7 11.5 13.4 15.6 16.8L16.7 14.8L15.6 11.3C17.3 10.1 19.1 14.4 19.1 17.3C15.4 20.2 7.7 19.7 7.7 18.8L4.8 19.9Z" />
    </>
  ),
  // Repeat/cycle sign — two curved arrows closing a circle.
  sets: (
    <>
      <path d="M3.5 12a8.5 8.5 0 0 1 8.5-8.5c2.5 0 4.9 1.1 6.5 2.8l1.9 2" />
      <path d="M20.5 3.6v4.8h-4.8" />
      <path d="M20.5 12a8.5 8.5 0 0 1-8.5 8.5c-2.5 0-4.9-1.1-6.5-2.8l-1.9-2" />
      <path d="M3.5 20.4v-4.8h4.8" />
    </>
  ),
  // Filled rotated dumbbell authored in 500x500 space (scaled 24/500).
  volume: (
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
}

export const StatIcon = ({ name }) => {
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
      {STAT_ICONS[name]}
    </svg>
  )
}
