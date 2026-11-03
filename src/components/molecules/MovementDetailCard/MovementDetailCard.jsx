import { useTranslation } from "react-i18next"

import { exerciseName, mediaUrl, movementInstructions } from "../../../lib/muscles.js"

import "./MovementDetailCard.css"

/**
 * One movement, shown at full size during a session: title, the target
 * prescription, the movement GIF, and the full instructions — in that exact
 * order — followed by whatever set-logging UI the session slots in below.
 *
 * This is the same presentation MovementDetail gives the library, deliberately
 * reusing its class names (movement-detail-title / -gif-wrap /
 * -instructions) so a movement looks identical whether you browse it or perform
 * it. The instruction fallback chain also lives in one place now, in
 * lib/muscles.js `movementInstructions`, rather than being re-derived per view.
 *
 * `children` is thrown in after the instructions: the set table, the rest timer,
 * and the Add set / duplicate / Finish set row all come from the session view,
 * so this molecule stays a layout shell rather than a second session engine.
 */
export const MovementDetailCard = ({ exercise, children }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const name = exerciseName(exercise, lang)
  const { steps, prose } = movementInstructions(exercise, lang)
  const hasRx = exercise.prescribedSets != null || Boolean(exercise.prescribedReps)
  // gif_url goes through mediaUrl so sub-path deployments (VITE_BASE) resolve
  // correctly; the worker's /api/gif-cover endpoint needs the absolute path.
  const gifUrl = exercise.gif_url ? mediaUrl(exercise.gif_url) : null
  const imgSrc = gifUrl
    ? `/api/gif-cover?url=${encodeURIComponent(gifUrl)}`
    : null

  return (
    <article className="movement-detail-card">
      <div className="movement-detail-title">{name}</div>
      {hasRx && (
        <span className="session-exercise-rx">
          {t("session.targetRx", {
            sets: exercise.prescribedSets ?? "–",
            reps: exercise.prescribedReps ?? "",
          })}
        </span>
      )}
      <div className="movement-detail-gif-wrap">
        {imgSrc ? (
          <img
            className="movement-detail-gif"
            src={imgSrc}
            alt={name}
            loading="lazy"
            onError={(e) => {
              // If the worker cannot decode a cover, fall back to the raw GIF.
              if (e.currentTarget.dataset.fallback) {
                e.currentTarget.style.display = "none"
                return
              }
              e.currentTarget.dataset.fallback = "1"
              e.currentTarget.src = gifUrl
            }}
          />
        ) : (
          <span className="movement-detail-placeholder" aria-hidden="true">💪</span>
        )}
      </div>
      <div className="movement-detail-instructions">
        <div className="detail-section-head">
          <h3>{t("movement.howTo")}</h3>
        </div>
        {steps.length > 0 ? (
          <ol className="instruction-steps">
            {steps.map((step, i) => (
              <li key={i} className="instruction-step">
                <span className="instruction-step-num">{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        ) : prose ? (
          <p>{prose}</p>
        ) : (
          <p className="movement-detail-empty">{t("movement.noInstr")}</p>
        )}
      </div>
      {children}
    </article>
  )
}