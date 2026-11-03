export const THEMES = [
  { id: "dark", nameKey: "themeAzure", scheme: "dark" },
  { id: "light", nameKey: "themeEmber", scheme: "light" },
  { id: "forest", nameKey: "themeForest", scheme: "dark" },
  { id: "violet", nameKey: "themeViolet", scheme: "light" },
  { id: "rose", nameKey: "themeRose", scheme: "dark" },
]

export const DEFAULT_THEME = "dark"

export const THEME_STORAGE_KEY = "fitness-planner-theme"

export const isValidTheme = (id) => THEMES.some((theme) => theme.id === id)

export const normalizeTheme = (id) => (isValidTheme(id) ? id : DEFAULT_THEME)

export const themeScheme = (id) => THEMES.find((theme) => theme.id === id)?.scheme ?? "dark"

// 读：没有/非法都回默认，不做任何迁移
export const loadStoredTheme = () =>
  normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))

// 写：顺手 normalize，防止脏值落库
export const persistTheme = (id) =>
  localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(id))