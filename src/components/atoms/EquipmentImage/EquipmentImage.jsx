// EquipmentImage — photo per equipment type.
//
// Convention: `public/equipment/<slug>.png` where `<slug>` is the
// equipment key lowercased with spaces turned into dashes
// (e.g. "ez barbell" -> "ez-barbell.png"). SLUG_ALIASES covers photos
// whose name deviates from the convention. A missing PNG simply hides
// the image (onError) — no broken-image icons.

import { useMemo, useState } from "react"

import { mediaUrl } from "../../../lib/muscles.js"

// Filename aliases where the photo's name deviates from the slug convention.
const SLUG_ALIASES = {
  "body weight": "bodyweight",
}

const slugify = (equipment) => {
  const key = String(equipment || "").trim().toLowerCase()
  return SLUG_ALIASES[key] ?? key.replace(/\s+/g, "-")
}

export const EquipmentImage = ({ equipment, className }) => {
  // State — src whose photo failed to load (resets when equipment changes).
  const [failedSrc, setFailedSrc] = useState(null)

  // Values — resolved photo path.
  const src = useMemo(
    () => mediaUrl(`equipment/${slugify(equipment)}.png`),
    [equipment],
  )

  if (failedSrc === src) return null

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}
