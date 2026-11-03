import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"
import { pinyin } from "pinyin-pro"

import {
  bodyPartName,
  equipmentName,
  focusLabel,
  getPreset,
  goalName,
  groupPresetsByBodyPart,
  POPULAR_PRESET_IDS,
  presetBodyPart,
  presetDesc,
  presetName,
  PRESETS,
  recommendPresets,
  resolvePreset,
} from "../../../lib/presets/index.js"

import "./ProgramsView.css"

import { PresetCard, SearchBar } from "../../molecules/index.js"

/**
 * Programs tab of the planner (organism): the preset-workout library moved
 * off the home page. Sectioned carousel rows — popular first, then the
 * questionnaire-based recommendation, goal groups (build / strength / fat
 * loss), full-body programs, and finally per-body-part groups. A local
 * search switches the view to a flat results grid.
 */

// Pinyin matching for Chinese preset names (mirrors exercise search).
// Compute pinyin on the fly since presets don't have precomputed fields.
const getPinyinFields = (nameZh) => {
  if (!nameZh) return { full: "", initials: "" }
  const full = pinyin(nameZh, { toneType: "none", type: "array", v: true }).join("").toLowerCase()
  const initials = pinyin(nameZh, { pattern: "first", toneType: "none", type: "array", v: true }).join("").toLowerCase()
  return { full, initials }
}

const matchesPinyin = (preset, q) => {
  const nameZh = preset?.name?.zh || ""
  if (!nameZh) return false
  const { full, initials } = getPinyinFields(nameZh)
  if (full && full.includes(q)) return true
  if (initials && initials.startsWith(q)) return true
  return false
}

// Searchable text of one preset: bilingual name + description + localized
// focus labels + goal + body part + equipment + split. Lowercased once per filter pass.
const programHaystack = (preset, lang) => [
  presetName(preset, "en"),
  presetName(preset, "zh"),
  presetDesc(preset, "en"),
  presetDesc(preset, "zh"),
  goalName(preset.goal, "en"),
  goalName(preset.goal, "zh"),
  bodyPartName(presetBodyPart(preset), "en"),
  bodyPartName(presetBodyPart(preset), "zh"),
  equipmentName(preset.equipment, "en"),
  equipmentName(preset.equipment, "zh"),
  preset.split, // "full-body", "upper", "lower", "push", "pull"
  ...(preset.focus || []).map((f) => focusLabel(f, lang)),
].join(" ").toLowerCase()

export const ProgramsView = ({ exercises, questionnaire, onAddPreset, onOpenExercise }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [query, setQuery] = useState("")
  const [addingId, setAddingId] = useState(null)

  const resolveAll = useMemo(
    () => (list) => list.map((preset) => resolvePreset(preset, exercises || [], lang)),
    [exercises, lang],
  )

  // Section pools. Goal groups / body-part groups / full-body overlap by
  // design — the same curated program can show under both its goal and its
  // split, matching how the sections are titled.
  const popular = useMemo(
    () => resolveAll(POPULAR_PRESET_IDS.map(getPreset).filter(Boolean)),
    [resolveAll],
  )

  const recommended = useMemo(
    () => resolveAll(recommendPresets(questionnaire)),
    [resolveAll, questionnaire],
  )

  const buildPresets = useMemo(
    () => resolveAll(PRESETS.filter((p) => p.goal === "build")),
    [resolveAll],
  )

  const strengthPresets = useMemo(
    () => resolveAll(PRESETS.filter((p) => p.goal === "strength")),
    [resolveAll],
  )

  const slimPresets = useMemo(
    () => resolveAll(PRESETS.filter((p) => p.goal === "slim")),
    [resolveAll],
  )

  const fullBodyPresets = useMemo(
    () => resolveAll(PRESETS.filter((p) => presetBodyPart(p) === "full-body")),
    [resolveAll],
  )

  const partGroups = useMemo(
    () => groupPresetsByBodyPart(PRESETS).map((g) => ({ ...g, presets: resolveAll(g.presets) })),
    [resolveAll],
  )

  const handleAdd = async (preset) => {
    setAddingId(preset.id)
    try {
      return await onAddPreset?.(preset)
    } finally {
      setAddingId(null)
    }
  }

  const hasQuery = Boolean(query.trim())

  const results = useMemo(
    () => hasQuery
      ? resolveAll(
          PRESETS.filter((p) => {
            const q = query.trim().toLowerCase()
            return programHaystack(p, lang).includes(q) || matchesPinyin(p, q)
          })
        )
      : [],
    [hasQuery, query, resolveAll, lang],
  )

  const renderRow = (key, title, presets) => (
    presets.length === 0 ? null : (
      <section key={key} className="programs-row-section">
        <h3 className="programs-row-title">{title}</h3>
        <div className="programs-row">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              adding={addingId === preset.id}
              onAdd={handleAdd}
              onOpenExercise={onOpenExercise}
            />
          ))}
        </div>
      </section>
    )
  )

  const resultsGrid = hasQuery ? (
    <section className="programs-results">
      <h3 className="programs-row-title">
        {t("presets.resultsCount", { count: results.length })}
      </h3>
      {results.length === 0 ? (
        <p className="programs-empty">{t("presets.searchEmpty", { query })}</p>
      ) : (
        <div className="programs-results-grid">
          {results.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              adding={addingId === preset.id}
              onAdd={handleAdd}
              onOpenExercise={onOpenExercise}
            />
          ))}
        </div>
      )}
    </section>
  ) : null

  const rows = hasQuery ? null : (
    <>
      {renderRow("popular", t("presets.popularTitle"), popular)}
      {renderRow("recommended", t("presets.recommendedTitle"), recommended)}
      {renderRow("build", t("presets.sectionBuild"), buildPresets)}
      {renderRow("strength", t("presets.sectionStrength"), strengthPresets)}
      {renderRow("slim", t("presets.sectionSlim"), slimPresets)}
      {renderRow("full-body", t("presets.sectionFullBody"), fullBodyPresets)}
      {partGroups.map((group) =>
        renderRow(group.part, bodyPartName(group.part, lang), group.presets),
      )}
    </>
  )

  return (
    <section className="programs-view">
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={t("presets.searchPh")}
        ariaLabel={t("presets.searchAria")}
        onClear={() => setQuery("")}
        clearLabel={t("movement.clear")}
        showClear={hasQuery}
        barClassName="programs-search-bar"
      />
      {resultsGrid}
      {rows}
    </section>
  )
}
