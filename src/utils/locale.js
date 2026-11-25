// Single source of truth for app language -> Intl locale mapping.
// English must use an explicit "en-US" (never `undefined`), otherwise
// toLocaleDateString falls back to the OS/browser locale (e.g. zh-CN)
// and dates/charts stay Chinese while the UI strings are English.
const LANG_BY_PREFIX = { zh: "zh", es: "es" }
const LOCALE_BY_LANG = { zh: "zh-CN", es: "es-ES", en: "en-US" }

export const normalizeLang = (lng) => {
  const v = String(lng || "").toLowerCase().slice(0, 2)
  return LANG_BY_PREFIX[v] || "en"
}

export const appLocale = (lng) => {
  return LOCALE_BY_LANG[normalizeLang(lng)]
}

export const localeFromI18n = (i18n) => appLocale(i18n?.language)
