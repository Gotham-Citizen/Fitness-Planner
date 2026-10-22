import { useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { usePanelDrawer } from "../../../hooks/usePanelDrawer.js"

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
  onSelectExercise,
  recentTouched,
  recentUnexplored,
  recentLoading,
  onRequestRecent,
  sortByAlpha,
  sortByDifficulty,
}) => {
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)
  const [expanded, setExpanded] = useState(() => {
    const initial = {}
    for (const part of hierarchy) initial[part.name] = part.name === selectedCategory
    return initial
  })
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
    collapse,
    onTouchStart,
    onTouchEnd,
  } = usePanelDrawer()

  const closeDrawerIfSmall = () => {
    if (isSmall) collapse()
  }

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

  const sortedHierarchy = useMemo(() => {
    if (!sortByDifficulty && !sortByAlpha) return hierarchy
    const sorted = hierarchy.map((part) => ({
      ...part,
      targets: part.targets.map((t) => {
        const sortedExercises = [...t.exercises].sort((a, b) => {
          if (sortByDifficulty) {
            const diffA = a.difficulty ?? 1
            const diffB = b.difficulty ?? 1
            if (diffA !== diffB) return diffA - diffB
            return alphaCompare(a, b, lang)
          }
          return alphaCompare(a, b, lang)
        })
        return { ...t, exercises: sortedExercises }
      }),
    }))
    return sorted
  }, [hierarchy, sortByDifficulty, sortByAlpha, lang])

  const isExpanded = (name) => expanded[name] ?? name === selectedCategory

  const handleSelectCategory = (name) => {
    const currentlyOpen = expanded[name] ?? name === selectedCategory
    const isActiveSelection = name === selectedCategory && !selectedTarget
    if (currentlyOpen && isActiveSelection) {
      setExpanded((prev) => ({ ...prev, [name]: false }))
      onSelectCategory?.(null)
      closeDrawerIfSmall()
      return
    }
    setExpanded((prev) => ({ ...prev, [name]: true }))
    onSelectCategory?.(name)
    closeDrawerIfSmall()
  }

  // Caret-only toggle: expand/collapse in place without navigating,
  // changing selection, or closing the mobile drawer.
  const toggleExpandOnly = (name, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setExpanded((prev) => {
      const open = prev[name] ?? name === selectedCategory
      return { ...prev, [name]: !open }
    })
  }

  const handleSelectTarget = (category, target) => {
    setExpanded((prev) => (prev[category] ? prev : { ...prev, [category]: true }))
    onSelectTarget?.(category, target)
    closeDrawerIfSmall()
  }

  const handleSelectExercise = (ex) => {
    onSelectExercise?.(ex)
    closeDrawerIfSmall()
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
    "exercise-library",
    isSmall ? "is-drawer" : "",
    (isSmall && drawerOpen) || (!isSmall && libraryOpen) ? "is-drawer-open" : "",
  ].filter(Boolean).join(" ")

  return (
    <>
      {!libraryOpen && (
        <button
          type="button"
          className="library-fab"
          onClick={open}
          aria-expanded={libraryOpen}
          aria-controls="exercise-library-drawer"
          aria-label={t("library.openMenu")}
          title={t("library.title")}
        >
          <span aria-hidden="true" className="library-fab-icon">☰</span>
          <span className="library-fab-label">{t("library.title")}</span>
        </button>
      )}
      {libraryOpen && (
        <div
          className="library-backdrop"
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
            className="library-drawer-close"
            onClick={close}
            aria-label={t("library.closeMenu")}
          >
            ✕
          </button>
        </div>
        <p className="panel-subtitle">{subtitle}</p>

        <div className="library-tabs" role="tablist" aria-label={t("library.browseBy")}>
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              className={`library-tab ${tab === tb.id ? "is-selected" : ""}`}
              onClick={() => selectTab(tb.id)}
            >
              {t(tb.key)}
            </button>
          ))}
        </div>

        {tab === "parts" && (
          <div role="tabpanel" aria-label={t("library.panelParts")} className="parts-tabpanel">
          <div className="parts-list">
            <ul className="muscle-tree">
              {sortedHierarchy.map((part) => (
                <li key={part.name} className={`muscle-part ${part.name === selectedCategory ? "is-active" : ""}`}>
                  <div
                    className={`muscle-part-row ${part.name === selectedCategory && !selectedTarget ? "is-selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="muscle-caret-btn"
                      onClick={(e) => toggleExpandOnly(part.name, e)}
                      aria-expanded={isExpanded(part.name)}
                      aria-label={isExpanded(part.name) ? t("library.collapsePart", { name: localizedCategory(part.name) }) : t("library.expandPart", { name: localizedCategory(part.name) })}
                      title={isExpanded(part.name) ? t("library.collapsePart", { name: localizedCategory(part.name) }) : t("library.expandPart", { name: localizedCategory(part.name) })}
                    >
                      <span className="muscle-caret" aria-hidden="true">{isExpanded(part.name) ? "▾" : "▸"}</span>
                    </button>
                    <button
                      type="button"
                      className="muscle-part-select"
                      onClick={() => handleSelectCategory(part.name)}
                      aria-label={localizedCategory(part.name)}
                    >
                      <span className="muscle-label">{localizedCategory(part.name)}</span>
                      <span className="muscle-count">{part.count}</span>
                    </button>
                  </div>
                  {isExpanded(part.name) && (
                    <ul className="muscle-targets">
                      {part.targets.map((t) => {
                        const isSel = part.name === selectedCategory && t.name === selectedTarget
                        return (
                          <li key={t.name}>
                            <button
                              type="button"
                              className={`muscle-target-row ${isSel ? "is-selected" : ""}`}
                              onClick={() => handleSelectTarget(part.name, t.name)}
                            >
                              <span className="muscle-thumb">
                                <img src={mediaUrl(t.exercises[0].image)} alt="" loading="lazy" />
                              </span>
                              <span className="muscle-label">{localizedTarget(t.name)}</span>
                              <span className="muscle-count">{t.count}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
          </div>
        )}

        {tab === "equipment" && (
          <div role="tabpanel" aria-label={t("library.panelEquipment")} className="equipment-tabpanel">
            <ExerciseBrowser exercises={sortedExercises} onSelectExercise={handleSelectExercise} />
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
                            {mediaUrl(thumbFor(sortedHierarchy, r.category, r.target)) ? (
                              <img src={mediaUrl(thumbFor(sortedHierarchy, r.category, r.target))} alt="" loading="lazy" />
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
