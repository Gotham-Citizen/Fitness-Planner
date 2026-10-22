import { useEffect, useMemo } from "react"

import { useTranslation } from "react-i18next"

import { SearchBar } from "../../components/molecules/index.js"
import { AllExercisesView, CategoryMovementList, ExerciseLibrary, MovementList, SearchResults } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

import { alphaCompare, localizedCategory, localizedTarget, searchExercises } from "../../lib/muscles.js"

/**
 * Planner page: exercise browser main + library sidebar.
 * Thin composition — data and handlers come from App.
 */
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
  onRequestRecent,
  sortAlpha,
  sortByDifficulty,
  onToggleSortAlpha,
  onToggleSortByDifficulty,
}) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"

  const hasQuery = Boolean(searchQuery?.trim())

  // 切换肌肉部位时自动清空搜索词
  const scopeKey = selectedTarget?.name || selectedCategory?.name || ""
  useEffect(() => {
    if (searchQuery?.trim()) onQueryChange("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  // 当前范围下的 exercise 池（target > category > all）
  const scopedPool = useMemo(() => {
    if (!exercises) return []
    if (selectedTarget?.name) return exercises.filter((ex) => ex.target === selectedTarget.name)
    if (selectedCategory?.name) return exercises.filter((ex) => ex.category === selectedCategory.name)
    return exercises
  }, [exercises, selectedTarget, selectedCategory])

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
    if (!scopedPool) return []
    if (!sortAlpha && !sortByDifficulty) return scopedPool
    const sorted = [...scopedPool]
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
  }, [scopedPool, sortAlpha, sortByDifficulty, lang])

  const scopeLabel = useMemo(() => {
    if (selectedTarget?.name) return localizedTarget(selectedTarget.name)
    if (selectedCategory?.name) return localizedCategory(selectedCategory.name)
    return t("movement.scopeAll")
  }, [selectedTarget, selectedCategory, t])

  let main
  if (hasQuery && exercises) {
    main = (
      <SearchResults
        query={searchQuery}
        results={scopedResults}
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

  const content = (
    <>
      {exercises && (
        <>
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
          <div className="sort-toggles">
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
          </div>
        </>
      )}
      {main}
    </>
  )

  const sidebar = exercises ? (
    <ExerciseLibrary
      hierarchy={hierarchy}
      exercises={exercises}
      selectedCategory={selected?.category || null}
      selectedTarget={selected?.target || null}
      onSelectCategory={onSelectCategory}
      onSelectTarget={onSelectTarget}
      onSelectExercise={onSelectExercise}
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