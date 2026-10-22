import { useTranslation } from "react-i18next"

export const ThemeToggle = ({ theme, onToggle }) => {
  const { t } = useTranslation()
  const isLight = theme === "light"
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      title={isLight ? t("theme.toDark") : t("theme.toLight")}
      aria-label={isLight ? t("theme.toDarkFull") : t("theme.toLightFull")}
    >
      <span aria-hidden="true">{isLight ? "🌙" : "☀️"}</span>
    </button>
  )
}
