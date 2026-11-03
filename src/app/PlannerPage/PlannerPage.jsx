import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { useScrollMemory } from "../../hooks/index.js"

import { SearchBar } from "../../components/molecules/index.js"
import { AllExercisesView, CategoryMovementList, EquipmentMovementList, ExerciseLibrary, MovementList, ProgramsView, SearchResults } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

import { canonicalEquipment } from "../../lib/equipmentGroups.js"
import { alphaCompare, localizedCategory, localizedEquipment, localizedTarget, searchExercises, titleCase } from "../../lib/muscles.js"

import "./PlannerPage.css"

/**
 * Planner page: exercise browser main + library sidebar.
 * Thin composition — data and handlers come from App.
 */

// Sub-muscle chip filter persists across movement-detail round-trips
// (the planner unmounts, which would otherwise reset it). Stored as
// { scope, target } so a stale value for another scope derives to null.
const TARGET_FILTER_KEY = "planner-target-filter"

const loadTargetFilter = () => {
  try {
    const raw = sessionStorage.getItem(TARGET_FILTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.scope !== "string" || typeof parsed.target !== "string") return null
    return { scope: parsed.scope, target: parsed.target }
  } catch {
    return null
  }
}

export const PlannerPage = ({
  banner,
  exercises,
  searchQuery,
  selectedTarget,
  selectedCategory,
  pendingAddList,
  pendingAddExerciseIds,
  hierarchy,
  selected,
  recentRows,
  recentLoading,
  onSelectExercise,
  onSaveExercise,
  onClearSearch,
  onQueryChange,
  onSelectCategory,
  onSelectTarget,
  onSelectEquipment,
  onRequestRecent,
  sortAlpha,
  sortByDifficulty,
  onToggleSortAlpha,
  onToggleSortByDifficulty,
  questionnaire,
  onAddPreset,
  autoFocusSearch = false,             
  onAutoFocusSearchHandled,
}) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"

  const hasQuery = Boolean(searchQuery?.trim())

  // Planner tabs: "exercises" (browser) / "programs" (preset workouts).
  const [activeTab, setActiveTab] = useState("exercises")

const scopeKey =
  selectedTarget?.name || selectedCategory?.name || selected?.equipment || ""

// 跟踪上一次的 scope，避免首次挂载 / 重挂载时误清空搜索。
// 只有用户主动切换范围（点分类、点器械）才清空。
const prevScopeKeyRef = useRef(scopeKey)
useEffect(() => {
  if (prevScopeKeyRef.current === scopeKey) return
  prevScopeKeyRef.current = scopeKey
  if (searchQuery?.trim()) onQueryChange("")
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [scopeKey])

  // Sub-muscle chip filter, keyed to the current scope: switching scope
  // (part/target/equipment) derives the filter back to null.
  const [targetFilterByScope, setTargetFilterByScope] = useState(loadTargetFilter)
  const targetFilter = targetFilterByScope?.scope === scopeKey ? targetFilterByScope.target : null

  // Keep the chip filter alive across remounts (movement-detail round-trips).
  useEffect(() => {
    try {
      sessionStorage.setItem(TARGET_FILTER_KEY, JSON.stringify(targetFilterByScope))
    } catch {
      // ignore (storage unavailable)
    }
  }, [targetFilterByScope])

  const selectTargetFilter = useCallback(
    (target) => {
      setTargetFilterByScope(target ? { scope: scopeKey, target } : null)
    },
    [scopeKey],
  )

  // Restore the remembered ".app-main" scroll offset (see useScrollMemory).
  useScrollMemory("planner")

    // 从首页搜索跳转过来时，把焦点放回搜索框（等 SearchBar 渲染完）。
  // 由 App 通过 autoFocusSearch 一次性触发，消费后立刻清掉标记，
  // 这样从详情返回（PlannerPage 重挂载）不会再次抢占焦点。
  useEffect(() => {
    if (!autoFocusSearch) return
    if (!exercises) return
    const el = document.querySelector(".planner-search-input")
    if (!el) return
    el.focus()
    const len = el.value?.length ?? 0
    try {
      el.setSelectionRange(len, len)
    } catch {
      // 某些浏览器/输入类型不支持，忽略
    }
    onAutoFocusSearchHandled?.()
  }, [autoFocusSearch, exercises, onAutoFocusSearchHandled])

  // 当前范围下的 exercise 池（target > category > equipment > all）
  const scopedPool = useMemo(() => {
    if (!exercises) return []
    if (selectedTarget?.name) return exercises.filter((ex) => ex.target === selectedTarget.name)
    if (selectedCategory?.name) return exercises.filter((ex) => ex.category === selectedCategory.name)
    if (selected?.equipment) return exercises.filter((ex) => canonicalEquipment(ex.equipment) === selected.equipment)
    return exercises
  }, [exercises, selectedTarget, selectedCategory, selected])

  // 子肌肉筛选：chip 选中时只保留该 target 的动作
  const filteredPool = useMemo(() => {
    if (!targetFilter) return scopedPool
    return scopedPool.filter((ex) => ex.target === targetFilter)
  }, [scopedPool, targetFilter])

  // Sub-muscle chips: distinct targets in the current scope, A to Z by label.
  const poolTargets = useMemo(() => {
    const seen = new Set()
    const names = []
    for (const ex of scopedPool || []) {
      if (!seen.has(ex.target)) {
        seen.add(ex.target)
        names.push(ex.target)
      }
    }
    return names
      .map((name) => ({ name, label: localizedTarget(name) }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === "zh" ? "zh" : "en"))
  }, [scopedPool, lang])

  // 在当前范围里搜索
  const scopedResults = useMemo(() => {
    const q = searchQuery?.trim()
    if (!q) return []
    let results = searchExercises(scopedPool, q, lang)
    if (sortAlpha && !sortByDifficulty) {
      results = results.slice().sort((a, b) => alphaCompare(a, b, lang))
    } else if (sortByDifficulty) {
      results = results.slice().sort((a, b) => {
        const diffA = a.difficulty ?? 1
        const diffB = b.difficulty ?? 1
        if (diffA !== diffB) return diffA - diffB
        return alphaCompare(a, b, lang)
      })
    }
    return results
  }, [scopedPool, searchQuery, lang, sortAlpha, sortByDifficulty])

  // Alphabetical or difficulty sort helper
  const sortedPool = useMemo(() => {
    if (!filteredPool) return []
    if (!sortAlpha && !sortByDifficulty) return filteredPool
    const sorted = [...filteredPool]
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
  }, [filteredPool, sortAlpha, sortByDifficulty, lang])

  const scopeLabel = useMemo(() => {
    if (selectedTarget?.name) return localizedTarget(selectedTarget.name)
    if (selectedCategory?.name) return localizedCategory(selectedCategory.name)
    if (selected?.equipment) return titleCase(localizedEquipment(selected.equipment))
    return t("movement.scopeAll")
  }, [selectedTarget, selectedCategory, selected, t])

  // Chips show on part/equipment pages whose pool spans multiple sub muscles.
  const chipScope = !hasQuery && poolTargets.length > 1 && Boolean(selectedCategory?.name || selected?.equipment)

  // Clear the whole scope (part/target/equipment) back to all exercises.
  const handleClearScope = useCallback(() => {
    onSelectCategory?.(null)
  }, [onSelectCategory])

  // Toolbar rendered below the view header: clear-scope, sort toggles,
  // sub-muscle chips.
  const toolbar = useMemo(() => {
    if (!exercises) return null
    const scopeActive = Boolean(selectedTarget?.name || selectedCategory?.name || selected?.equipment)
    return (
      <div className="sort-toggles list-toolbar">
        {scopeActive && (
          <button type="button" className="clear-scope-toggle" onClick={handleClearScope}>
            ✕ {t("movement.clearScope")}
          </button>
        )}
        <button
          className="sort-alpha-toggle"
          onClick={onToggleSortAlpha}
          aria-pressed={sortAlpha}
          title={sortAlpha ? t("library.sortAlphaOff") : t("library.sortAlphaOn")}
        >
          {sortAlpha ? t("library.sortAlphaOff") : t("library.sortAlphaOn")}
        </button>
        <button
          className="sort-difficulty-toggle"
          onClick={onToggleSortByDifficulty}
          aria-pressed={sortByDifficulty}
          title={sortByDifficulty ? t("library.sortDifficultyOff") : t("library.sortDifficultyOn")}
        >
          {sortByDifficulty ? t("library.sortDifficultyOff") : t("library.sortDifficultyOn")}
        </button>
        {chipScope &&
          poolTargets.map((tg) => (
            <button
              key={tg.name}
              type="button"
              className="target-chip"
              onClick={() => selectTargetFilter(targetFilter === tg.name ? null : tg.name)}
              aria-pressed={targetFilter === tg.name}
            >
              {tg.label}
            </button>
          ))}
      </div>
    )
  }, [
    exercises,
    selectedTarget,
    selectedCategory,
    selected,
    handleClearScope,
    onToggleSortAlpha,
    onToggleSortByDifficulty,
    sortAlpha,
    sortByDifficulty,
    chipScope,
    poolTargets,
    targetFilter,
    selectTargetFilter,
    t,
  ])

  let main
  if (hasQuery && exercises) {
    main = (
      <SearchResults
        query={searchQuery}
        results={scopedResults}
        toolbar={toolbar}
        onSelectExercise={onSelectExercise}
        onSaveExercise={onSaveExercise}
        quickAddListId={pendingAddList?.id ?? null}
        addedIds={pendingAddExerciseIds}
        onClear={onClearSearch}
        scopeLabel={scopeLabel}
      />
    )
  } else if (selectedTarget) {
    main = (
      <MovementList
        target={selectedTarget}
        toolbar={toolbar}
        categoryLabel={selectedTarget.categoryLabel}
        exercises={sortedPool}
        onSelectExercise={onSelectExercise}
        onSaveExercise={onSaveExercise}
        quickAddListId={pendingAddList?.id ?? null}
        addedIds={pendingAddExerciseIds}
      />
    )
  } else if (selectedCategory) {
    main = (
      <CategoryMovementList
        category={selectedCategory}
        toolbar={toolbar}
        exercises={sortedPool}
        onSelectExercise={onSelectExercise}
        onSaveExercise={onSaveExercise}
        quickAddListId={pendingAddList?.id ?? null}
        addedIds={pendingAddExerciseIds}
      />
    )
  } else if (selected?.equipment) {
    main = (
      <EquipmentMovementList
        equipment={selected.equipment}
        toolbar={toolbar}
        exercises={sortedPool}
        onSelectExercise={onSelectExercise}
        onSaveExercise={onSaveExercise}
        quickAddListId={pendingAddList?.id ?? null}
        addedIds={pendingAddExerciseIds}
      />
    )
  } else if (exercises) {
    main = (
      <AllExercisesView
        exercises={sortedPool}
        toolbar={toolbar}
        onSelectExercise={onSelectExercise}
        onSaveExercise={onSaveExercise}
        quickAddListId={pendingAddList?.id ?? null}
        addedIds={pendingAddExerciseIds}
      />
    )
  } else {
    main = (
      <section className="loading">
        <span className="spinner" aria-hidden="true"></span> {t("common.loadingExercises")}
      </section>
    )
  }

  // Planner mode tabs (openGym-style segmented control). `--n` = segment
  // count, `--i` = active index; `.seg-sel` slides under the active button.
  const activeIndex = activeTab === "exercises" ? 0 : 1
  const tabbar = (
    <div
      className="seg plan-views planner-mode-tabs"
      role="tablist"
      aria-label={t("planner.tabsAria")}
      style={{ "--n": 2, "--i": activeIndex }}
    >
      <span className="seg-sel" aria-hidden="true"></span>
      <button
        type="button"
        role="tab"
        className={activeTab === "exercises" ? "on" : ""}
        aria-pressed={activeTab === "exercises"}
        onClick={() => setActiveTab("exercises")}
      >
        <span>{t("planner.tabExercises")}</span>
      </button>
      <button
        type="button"
        role="tab"
        className={activeTab === "programs" ? "on" : ""}
        aria-pressed={activeTab === "programs"}
        onClick={() => setActiveTab("programs")}
      >
        <span>{t("planner.tabPrograms")}</span>
      </button>
    </div>
  )

  const content = (
    <>
      {tabbar}
      {activeTab === "programs" ? (
        <ProgramsView
          exercises={exercises}
          questionnaire={questionnaire}
          onAddPreset={onAddPreset}
          onOpenExercise={onSelectExercise}
        />
      ) : (
        <>
          {exercises && (
            <SearchBar
              value={searchQuery}
              onChange={onQueryChange}
              placeholder={t("movement.searchPh")}
              ariaLabel={t("movement.searchLabel")}
              onClear={onClearSearch}
              clearLabel={t("movement.clear")}
              showClear={hasQuery}
              barClassName="search-results-bar"
            />
          )}
          {main}
        </>
      )}
    </>
  )

  // Programs tab renders full width — the exercise library sidebar is
  // exercises-only and would leave a dead column next to the carousels.
  const sidebar = activeTab !== "programs" && exercises ? (
    <ExerciseLibrary
      hierarchy={hierarchy}
      exercises={exercises}
      selectedCategory={selected?.category || null}
      selectedTarget={selected?.target || null}
      onSelectCategory={onSelectCategory}
      onSelectTarget={onSelectTarget}
      onSelectEquipment={onSelectEquipment}
      recentTouched={recentRows.touched}
      recentUnexplored={recentRows.unexplored}
      recentLoading={recentLoading}
      onRequestRecent={onRequestRecent}
      sortByAlpha={sortAlpha}
      sortByDifficulty={sortByDifficulty}
    />
  ) : null

  return <PlannerTemplate banner={banner} main={content} sidebar={sidebar} />
}