import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en/translation.js"
import es from "./locales/es/translation.js"
import zh from "./locales/zh/translation.js"

export const LANG_KEY = "fitplan-lang"
export const SUPPORTED_LANGUAGES = ["en", "zh", "es"]

// Maps any BCP-47 tag (es-ES, es-MX, zh-Hant-TW, en-GB, ...) to one of
// our supported UI languages. Anything unknown falls back to English.
export const normalizeLanguage = (raw) => {
  const v = String(raw || "").toLowerCase()
  if (v.startsWith("zh")) return "zh"
  if (v.startsWith("es")) return "es"
  return "en"
}

// Sets <html lang> to a correct BCP-47 tag for the chosen UI language.
const htmlLangFor = (lng) => {
  switch (lng) {
    case "zh":
      return "zh-CN"
    case "es":
      return "es"
    default:
      return "en"
  }
}

export const storedLanguage = () => {
  try {
    const v = String(localStorage.getItem(LANG_KEY) || "").toLowerCase()
    if (v) return normalizeLanguage(v)
  } catch {
    // ignore
  }
  // No stored choice — follow the browser / OS language.
  try {
    const nav =
      navigator.language ||
      (navigator.languages && navigator.languages[0]) ||
      ""
    return normalizeLanguage(nav)
  } catch {
    return "en"
  }
}

export const persistLanguage = (lng) => {
  try {
    const v = normalizeLanguage(lng)
    localStorage.setItem(LANG_KEY, v)
    try {
      document.documentElement.lang = htmlLangFor(v)
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

// Clears the cached language (logout) so guests fall back to the browser.
export const clearStoredLanguage = () => {
  try {
    localStorage.removeItem(LANG_KEY)
  } catch {
    // ignore
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
  },
  lng: storedLanguage(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
})

try {
  document.documentElement.lang = htmlLangFor(storedLanguage())
  if (typeof i18n.on === "function") {
    i18n.on("languageChanged", (lng) => {
      try {
        document.documentElement.lang = htmlLangFor(normalizeLanguage(lng))
      } catch {
        // ignore
      }
    })
  }
} catch {
  // ignore (non-DOM env)
}

export default i18n