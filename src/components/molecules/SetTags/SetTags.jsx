import { effortTagForSet } from "../../../lib/effort.js"

/**
 * Logged set tags (`1: 8 reps × 80 kg · RIR 2`). `showEffort` comes from
 * `resolveShowEffort`; `formatSet(set, index)` renders the leading text.
 */
export const SetTags = ({ sets, showEffort, formatSet }) => {
  return (
    <>
      {(sets || []).map((s, i) => {
        const tag = showEffort ? effortTagForSet(s) : null
        return (
          <span key={s.id || i} className="history-set-tag">
            {formatSet(s, i)}
            {tag ? ` · ${tag}` : ""}
          </span>
        )
      })}
    </>
  )
}
