import { useTranslation } from "react-i18next"

import { usePanelDrawer } from "../../../hooks/usePanelDrawer.js"

import { localizedCategory, localizedTarget } from "../../../lib/muscles.js"
import { formatLastTrained } from "../../../lib/recovery.js"

import "./RecoveryPanel.css"

export const RecoveryPanel = ({ recovery, loading, onSelectMuscle }) => {
  const { t, i18n } = useTranslation()
  const { panelOpen, drawerOpen, isSmall, open, close, onTouchStart, onTouchEnd } = usePanelDrawer()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const rows = [...(recovery || [])].sort((a, b) =>
    a.percent !== b.percent ? a.percent - b.percent : a.label.localeCompare(b.label),
  )
  const recoveredCount = rows.filter((r) => r.state === "recovered").length
  const clickable = typeof onSelectMuscle === "function"
  const ago = (iso) => formatLastTrained(iso, lang)

  const handleSelect = (category, name) => {
    onSelectMuscle(category, name)
    if (isSmall) close()
  }

  const drawerClass = [
    "recovery-panel",
    isSmall ? "is-drawer" : "",
    (isSmall && drawerOpen) || (!isSmall && panelOpen) ? "is-drawer-open" : "",
  ].filter(Boolean).join(" ")

  return (
    <>
      {!panelOpen && (
        <button
          type="button"
          className="library-fab"
          onClick={open}
          aria-expanded={panelOpen}
          aria-controls="recovery-panel-drawer"
          aria-label={t("recovery.openMenu")}
          title={t("recovery.title")}
        >
          <span aria-hidden="true" className="library-fab-icon">☰</span>
          <span className="library-fab-label">{t("recovery.title")}</span>
        </button>
      )}
      {panelOpen && (
        <div className="library-backdrop" onClick={close} aria-hidden="true" />
      )}
      <aside
        id="recovery-panel-drawer"
        className={drawerClass}
        aria-label={t("recovery.title")}
        aria-hidden={isSmall && !drawerOpen ? true : undefined}
        role={isSmall ? "dialog" : undefined}
        aria-modal={isSmall && drawerOpen ? true : undefined}
        onTouchStart={isSmall && drawerOpen ? onTouchStart : undefined}
        onTouchEnd={isSmall && drawerOpen ? onTouchEnd : undefined}
      >
        <div className="panel-title-row">
          <h2 className="panel-title">{t("recovery.title")}</h2>
          <button
            type="button"
            className="library-drawer-close"
            onClick={close}
            aria-label={t("recovery.closeMenu")}
          >
            ✕
          </button>
        </div>
        <p className="panel-subtitle">
          {loading
            ? t("recovery.loading")
            : rows.length === 0
              ? t("recovery.none")
              : t("recovery.recoveredOf", { a: recoveredCount, b: rows.length })}
        </p>
        {loading ? (
          <section className="loading">
            <span className="spinner" aria-hidden="true"></span> {t("recovery.loadingShort")}
          </section>
        ) : rows.length === 0 ? (
          <div className="workouts-empty">
            <p>{t("recovery.empty")}</p>
          </div>
        ) : (
          <ul className="recovery-list">
            {rows.map((r) => (
              <li
                key={r.key}
                className={`recovery-row is-${r.state}${clickable ? " is-clickable" : ""}`}
                {...(clickable
                  ? {
                      role: "button",
                      tabIndex: 0,
                      onClick: () => handleSelect(r.category, r.name),
                      onKeyDown: (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleSelect(r.category, r.name)
                        }
                      },
                      "aria-label": t("recovery.viewMovements", { name: localizedTarget(r.name) }),
                    }
                  : {})}
              >
                <div className="recovery-row-head">
                  <div className="recovery-row-info">
                    <span className="recovery-label">{localizedTarget(r.name)}</span>
                    <span className="recovery-sub">
                      {localizedCategory(r.category)} · {r.lastTrainedAt ? t("recovery.trained", { ago: ago(r.lastTrainedAt) }) : t("recovery.notTrained")}
                    </span>
                  </div>
                  <span className={`recovery-badge is-${r.state}`}>
                    {r.state === "recovered" ? t("recovery.recovered") : r.state === "recovering" ? t("recovery.recovering") : t("recovery.fatigued")}
                  </span>
                </div>
                <div
                  className="recovery-bar"
                  role="progressbar"
                  aria-valuenow={r.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${localizedTarget(r.name)} ${r.percent}%`}
                >
                  <div className="recovery-bar-fill" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="recovery-percent">{r.percent}%</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  )
}
