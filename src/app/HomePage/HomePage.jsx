import { useTranslation } from "react-i18next"

import { SearchBar } from "../../components/molecules/index.js"
import { AuthTemplate } from "../../components/templates/index.js"

import "./HomePage.css"

/**
 * Home / welcome page. Thin composition — no data fetching.
 */
export const HomePage = ({ banner, searchQuery, searching, onSearchChange, onClearSearch }) => {
  const { t } = useTranslation()
  return (
    <AuthTemplate banner={banner}>
      <section className="welcome">
        <h2>{t("home.title")}</h2>
        <p>
          {t("home.browseLead")} <strong>{t("home.exerciseCount")}</strong> {t("home.browseRest")}
        </p>
        <p>{t("home.saveHint")}</p>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t("home.searchPh")}
          ariaLabel={t("home.searchLabel")}
          onClear={onClearSearch}
          clearLabel={t("home.clear")}
          showClear={searching}
          barClassName="planner-search-welcome"
        />
      </section>
    </AuthTemplate>
  )
}
