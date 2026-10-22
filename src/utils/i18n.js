import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en/translation.js"
import zh from "./locales/zh/translation.js"

export const LANG_KEY = "fitplan-lang"

export const storedLanguage = () => {
  try {
    const v = String(localStorage.getItem(LANG_KEY) || "").toLowerCase()
    if (v) return v.startsWith("zh") ? "zh" : "en"
  } catch {
    // ignore
  }
  // No stored choice — follow the browser language.
  try {
    const nav = String(navigator.language || "").toLowerCase()
    return nav.startsWith("zh") ? "zh" : "en"
  } catch {
    return "en"
  }
}

export const persistLanguage = (lng) => {
  try {
    const v = String(lng || "").toLowerCase().startsWith("zh") ? "zh" : "en"
    localStorage.setItem(LANG_KEY, v)
    try {
      document.documentElement.lang = v === "zh" ? "zh-CN" : "en"
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
  },
  lng: storedLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

try {
  document.documentElement.lang = storedLanguage() === "zh" ? "zh-CN" : "en"
  if (typeof i18n.on === "function") {
    i18n.on("languageChanged", (lng) => {
      try {
        document.documentElement.lang = String(lng || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en"
      } catch {
        // ignore
      }
    })
  }
} catch {
  // ignore (non-DOM env)
}

export default i18n
