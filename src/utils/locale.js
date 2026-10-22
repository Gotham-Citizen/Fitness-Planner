// Single source of truth for app language -> Intl locale mapping.
// English must use an explicit "en-US" (never `undefined`), otherwise
// toLocaleDateString falls back to the OS/browser locale (e.g. zh-CN)
// and dates/charts stay Chinese while the UI strings are English.
export const normalizeLang = (lng) => {
  return String(lng || "").toLowerCase().startsWith("zh") ? "zh" : "en"
}

export const appLocale = (lng) => {
  return normalizeLang(lng) === "zh" ? "zh-CN" : "en-US"
}

export const localeFromI18n = (i18n) => appLocale(i18n?.language)
