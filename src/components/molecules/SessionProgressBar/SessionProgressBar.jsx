import { useTranslation } from "react-i18next"

import "./SessionProgressBar.css"

/**
 * Movement progress for an active session, in the same visual language as the
 * signup wizard's `SignupProgress`: one slim segment per movement, already
 * completed ones filled with the accent, the current one outlined.
 *
 * Unlike the wizard's bar these segments are also buttons, because the session
 * lets you move freely between movements — the progress readout doubles as the
 * nav. Keyboard users get the same reachability through the segments' own
 * buttons, and the `progressbar` role carries the "movement N of M" summary.
 */
export const SessionProgressBar = ({ current, total, onSelect }) => {
  const { t } = useTranslation()
  if (total <= 0) return null
  return (
    <div
      className="session-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.min(Math.max(current + 1, 1), total)}
      aria-label={t("session.movementOf", { n: current + 1, total })}
    >
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`session-progress-segment${i < current ? " is-reached" : ""}${i === current ? " is-active" : ""}`}
          onClick={() => onSelect?.(i)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && onSelect) {
              e.preventDefault()
              onSelect(i)
            }
          }}
          aria-label={t("session.goToMovement", { n: i + 1 })}
          aria-current={i === current ? "step" : undefined}
        />
      ))}
    </div>
  )
}
