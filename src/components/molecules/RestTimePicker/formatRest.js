// Pure formatting helpers shared by RestTimePicker and RestTimeDisplay.
// Kept in their own module so the component files only export components
// (react-refresh/only-export-components).

export const formatRestSecs = (secs) => {
  const n = Number(secs)
  if (!Number.isFinite(n) || n <= 0) return "0s"
  const total = Math.round(n)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// Compact variant used by the wheel picker rows. Same output as
// formatRestSecs today; kept as a separate name so picker rows can diverge
// from the display label if needed.
export const formatRestSecsCompact = formatRestSecs