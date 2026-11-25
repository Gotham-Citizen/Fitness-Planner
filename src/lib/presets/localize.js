// Shared localization for curated preset content. Preset names/descriptions
// are inline multilingual objects ({ en, zh, es }); this resolves them with
// the same fallback chain everywhere (index, body parts, generated coverage).
import { normalizeLang } from "../../utils/locale.js"

export const localizedText = (value, lang) => {
  const l = normalizeLang(lang)
  return value?.[l] || value?.en || value?.zh || ""
}
