import { useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { usePanelDrawer } from "../../../hooks/index.js"

import { alphaCompare, localizedCategory, localizedTarget, mediaUrl } from "../../../lib/muscles.js"
import { formatLastTrained } from "../../../lib/recovery.js"
import { normalizeLang } from "../../../utils/locale.js"

import "./ExerciseLibrary.css"

import { ExerciseBrowser } from "../../molecules/index.js"

const TABS = [
  { id: "parts", key: "library.tabParts" },
  { id: "equipment", key: "library.tabEquipment" },
  { id: "recent", key: "library.tabRecent" },
]
const TAB_KEY = "exercise-library-tab"

const loadTab = () => {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TABS.some((t) => t.id === v) ? v : "parts"
  } catch {
    return "parts"
  }
}

const thumbFor = (hierarchy, category, target) => {
  const part = (hierarchy || []).find((p) => p.name === category)
  const t = part?.targets.find((x) => x.name === target)
  return t?.exercises?.[0]?.image || null
}

export const ExerciseLibrary = ({
  hierarchy,
  exercises,
  selectedCategory,
  selectedTarget,
  onSelectCategory,
  onSelectTarget,
  onSelectEquipment,
  recentTouched,
  recentUnexplored,
  recentLoading,
  onRequestRecent,
  sortByAlpha,
  sortByDifficulty,
}) => {
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)
  const [tab, setTab] = useState(loadTab)
  const panelRef = useRef(null)
  const requestedRef = useRef(false)

  // Library visibility: folded (closed) by default on all viewports,
  // just like on mobile — the FAB opens it on demand.
  const {
    panelOpen: libraryOpen,
    drawerOpen,
    isSmall,
    open,
    close,
    onTouchStart,
    onTouchEnd,
  } = usePanelDrawer()

  const sortedExercises = useMemo(() => {
    if (!sortByDifficulty && !sortByAlpha) return exercises
    const sorted = [...exercises]
    if (sortByDifficulty) {
      sorted.sort((a, b) => {
        const diffA = a.difficulty ?? 1
        const diffB = b.difficulty ?? 1
        if (diffA !== diffB) return diffA - diffB
        return alphaCompare(a, b, lang)
      })
    } else {
      sorted.sort((a, b) => alphaCompare(a, b, lang))
    }
    return sorted
  }, [exercises, sortByDifficulty, sortByAlpha, lang])

  // Part cards sorted like the equipment grid: most exercises first,
  // ties A to Z by localized label.
  const partCards = useMemo(() => {
    const cards = (hierarchy || []).map((part) => ({
      name: part.name,
      label: localizedCategory(part.name),
      count: part.count,
      image: part.targets?.[0]?.exercises?.[0]?.image || null,
    }))
    cards.sort((a, b) => {
      const byCount = b.count - a.count
      if (byCount !== 0) return byCount
      return a.label.localeCompare(b.label, lang === "zh" ? "zh" : "en")
    })
    return cards
  }, [hierarchy, lang])

  // Part card: hand the scope to the main page and close the drawer;
  // clicking the active part again clears the selection.
  const handleSelectCategory = (name) => {
    const isActiveSelection = name === selectedCategory && !selectedTarget
    onSelectCategory?.(isActiveSelection ? null : name)
    close()
  }

  const handleSelectTarget = (category, target) => {
    onSelectTarget?.(category, target)
    close()
  }

  // Equipment card: hand the scope to the main page and close the drawer
  // on every viewport.
  const handleSelectEquipment = (equipment) => {
    onSelectEquipment?.(equipment)
    close()
  }

  const requestRecent = (t) => {
    if (t === "recent" && !requestedRef.current) {
      requestedRef.current = true
      onRequestRecent?.()
    }
  }

  // If the persisted tab is Recent, kick off the sessions fetch on mount.
  useEffect(() => {
    requestRecent(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectTab = (id) => {
    setTab(id)
    try {
      localStorage.setItem(TAB_KEY, id)
    } catch {
      // ignore
    }
    requestRecent(id)
  }

  const subtitle =
    tab === "equipment"
      ? t("library.subEquipment")
      : tab === "recent"
        ? t("library.subRecent")
        : t("library.subParts")

  const drawerClass = [
    "exercise-panel",
    isSmall ? "is-drawer" : "",
    (isSmall && drawerOpen) || (!isSmall && libraryOpen) ? "is-drawer-open" : "",
  ].filter(Boolean).join(" ")

  return (
    <>
      {!libraryOpen && (
        <button
          type="button"
          className="panel-fab"
          onClick={open}
          aria-expanded={libraryOpen}
          aria-controls="exercise-library-drawer"
          aria-label={t("library.openMenu")}
          title={t("library.title")}
        >
          <span aria-hidden="true" className="panel-fab-icon">☰</span>
          <span className="panel-fab-label">{t("library.title")}</span>
        </button>
      )}
      {libraryOpen && (
        <div
          className="panel-backdrop"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        id="exercise-library-drawer"
        className={drawerClass}
        aria-label={t("library.title")}
        aria-hidden={isSmall && !drawerOpen ? true : undefined}
        ref={panelRef}
        role={isSmall ? "dialog" : undefined}
        aria-modal={isSmall && drawerOpen ? true : undefined}
        onTouchStart={isSmall && drawerOpen ? onTouchStart : undefined}
        onTouchEnd={isSmall && drawerOpen ? onTouchEnd : undefined}
      >
        <div className="panel-title-row">
          <h2 className="panel-title">{t("library.title")}</h2>
          <button
            type="button"
            className="panel-drawer-close"
            onClick={close}
            aria-label={t("library.closeMenu")}
          >
            ✕
          </button>
        </div>
        <p className="panel-subtitle">{subtitle}</p>

        <div className="panel-tabs" role="tablist" aria-label={t("library.browseBy")}>
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              className={`panel-tab ${tab === tb.id ? "is-selected" : ""}`}
              onClick={() => selectTab(tb.id)}
            >
              {t(tb.key)}
            </button>
          ))}
        </div>

        {tab === "parts" && (
          <div role="tabpanel" aria-label={t("library.panelParts")} className="parts-tabpanel">
            <ul className="part-grid">
              {partCards.map((part) => (
                <li key={part.name}>
                  <button
                    type="button"
                    className={`part-card ${part.name === selectedCategory ? "is-active" : ""}`}
                    onClick={() => handleSelectCategory(part.name)}
                    aria-label={t("library.partPickAria", { name: part.label, n: part.count })}
                  >
                    <span className="part-card-thumb">
                      {part.image ? (
                        <img src={mediaUrl(part.image)} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden="true">💪</span>
                      )}
                    </span>
                    <span className="part-card-name">{part.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "equipment" && (
          <div role="tabpanel" aria-label={t("library.panelEquipment")} className="equipment-tabpanel">
            <ExerciseBrowser exercises={sortedExercises} onSelectEquipment={handleSelectEquipment} />
          </div>
        )}

        {tab === "recent" && (
          <div role="tabpanel" aria-label={t("library.panelRecent")} className="recent-tabpanel">
          <div className="recent-wrap">
            {recentLoading ? (
              <section className="loading">
                <span className="spinner" aria-hidden="true"></span> {t("library.loading")}
              </section>
            ) : recentTouched.length === 0 && recentUnexplored.length === 0 ? (
              <div className="workouts-empty">
                <p>{t("library.noMuscles")}</p>
              </div>
            ) : (
              <div className="recent-list">
                <ul className="muscle-tree">
                  {recentTouched.map((r) => {
                    const trainedFirst = r.lastTrainedAt && (!r.lastViewedAt || r.lastTrainedAt >= r.lastViewedAt)
                    return (
                      <li key={`${r.category}|||${r.target}`}>
                        <button
                          type="button"
                          className="muscle-target-row"
                          onClick={() => handleSelectTarget(r.category, r.target)}
                        >
                          <span className="muscle-thumb">
                            {mediaUrl(thumbFor(hierarchy, r.category, r.target)) ? (
                              <img src={mediaUrl(thumbFor(hierarchy, r.category, r.target))} alt="" loading="lazy" />
                            ) : (
                              <span aria-hidden="true">💪</span>
                            )}
                          </span>
                          <span className="muscle-label">
                            {localizedTarget(r.target)}
                            <span className="recent-sub">
                              {trainedFirst
                                ? t("library.trainedAgo", { ago: formatLastTrained(r.lastTrainedAt, lang) })
                                : t("library.viewedAgo", { ago: formatLastTrained(r.lastViewedAt, lang) })}
                            </span>
                          </span>
                          <span className={`recent-tag is-${trainedFirst ? "trained" : "viewed"}`}>
                            {trainedFirst ? t("library.trained") : t("library.viewed")}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {recentUnexplored.length > 0 && (
                  <>
                    <h3 className="recent-section-title">{t("library.notExplored")}</h3>
                    <ul className="muscle-tree">
                      {recentUnexplored.map((r) => (
                        <li key={`${r.category}|||${r.target}`}>
                          <button
                            type="button"
                            className="muscle-target-row"
                            onClick={() => handleSelectTarget(r.category, r.target)}
                          >
                            <span className="muscle-label">{localizedTarget(r.target)}</span>
                            <span className="muscle-count">{localizedCategory(r.category)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        )}
      </aside>
    </>
  )
}
