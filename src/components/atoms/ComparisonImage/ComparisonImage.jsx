// ComparisonImage — picture for the fun volume-comparison rung.
//
// Convention: `public/comparisons/<slug>.<ext>` where <ext> is tried in
// order (png → jpg → jpeg → webp → gif), so any common picture format
// works without renaming. When every candidate fails to load the image
// simply hides itself — no broken-image icons, the text stands alone.
// (Mirrors EquipmentImage's hide-on-error approach.)

import { useState } from "react"

import { mediaUrl } from "../../../lib/muscles.js"

// Tried in order; the first that loads wins.
const EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"]

export const ComparisonImage = ({ slug, className }) => {
  // State — how many extension candidates have failed for this slug.
  // Keyed by slug so switching rungs restarts from the first candidate.
  const [failed, setFailed] = useState({ slug: null, count: 0 })
  const count = failed.slug === slug ? failed.count : 0

  // Values — resolved candidate path (null once every candidate failed).
  const src = slug && count < EXTENSIONS.length
    ? mediaUrl(`comparisons/${slug}.${EXTENSIONS[count]}`)
    : null

  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      onError={() => setFailed({ slug, count: count + 1 })}
    />
  )
}
