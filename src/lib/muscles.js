import i18n from "../utils/i18n.js"
import { normalizeLang } from "../utils/locale.js"

const LABEL_OVERRIDES = {
  abs: "Abs",
  pectorals: "Pectorals",
  delts: "Delts",
  lats: "Lats",
  traps: "Traps",
  quads: "Quads",
  calves: "Calves",
}

const CATEGORY_ORDER = [
  "neck",
  "shoulders",
  "chest",
  "back",
  "upper arms",
  "lower arms",
  "waist",
  "upper legs",
  "lower legs",
  "cardio",
]

const TARGET_ORDER = {
  "upper legs": ["glutes", "adductors", "abductors", "quads", "hamstrings"],
  back: ["upper back", "lats", "traps", "spine"],
  waist: ["abs"],
  "lower legs": ["calves"],
  chest: ["pectorals", "serratus anterior"],
  "upper arms": ["biceps", "triceps"],
  cardio: ["cardiovascular system"],
  shoulders: ["delts"],
  "lower arms": ["forearms"],
  neck: ["levator scapulae"],
}

export const titleCase = (value) => {
  if (LABEL_OVERRIDES[value]) return LABEL_OVERRIDES[value]
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Localized display labels for the exercise taxonomy. English falls back to
// the title-cased key; Chinese comes from utils/locales/zh (muscles.*).
const dictLookup = (section, key, fallback) => {
  if (normalizeLang(i18n.language) !== "zh") return fallback
  // Lowercase so title-cased labels ('Upper Arms') resolve like raw keys.
  const k = String(key || "").toLowerCase()
  const v = i18n.t(`muscles.${section}.${k}`, { defaultValue: "" })
  return v || fallback
}

export const localizedCategory = (name) => {
  return dictLookup("category", name, titleCase(name))
}

export const localizedTarget = (name) => {
  return dictLookup("target", name, titleCase(name))
}

export const localizedEquipment = (value) => {
  if (!value) return value
  return dictLookup("equipment", String(value).toLowerCase(), value)
}

export const localizedMuscleGroup = (value) => {
  if (!value) return value
  return dictLookup("group", String(value).toLowerCase(), titleCase(String(value)))
}

/** Exercise display name in the UI language (zh falls back to English). */
export const exerciseName = (ex, lang) => {
  const l = lang || "en"
  if (l === "zh" && ex?.nameZh) return ex.nameZh
  return ex?.name ?? ""
}

/**
 * Alphabetical compare for exercises: names starting with a digit
 * (e.g. "3/4 sit-up") sort after letter names; then locale-aware compare.
 */
export const alphaCompare = (a, b, lang) => {
  const nameA = exerciseName(a, lang)
  const nameB = exerciseName(b, lang)
  const aDigit = /^\d/.test(nameA)
  const bDigit = /^\d/.test(nameB)
  if (aDigit && !bDigit) return 1
  if (!aDigit && bDigit) return -1
  return nameA.localeCompare(nameB, lang === "zh" ? "zh" : "en")
}

export const mediaUrl = (relPath) => {
  if (!relPath) return ""
  const base = import.meta.env.BASE_URL || "/"
  return `${base}${relPath.replace(/^\.?[/\\]/, "")}`
}

export const buildHierarchy = (exercises, sortMode, lang = "en") => {
  const byCategory = new Map()

  for (const ex of exercises) {
    if (!byCategory.has(ex.category)) byCategory.set(ex.category, new Map())
    const targets = byCategory.get(ex.category)
    if (!targets.has(ex.target)) targets.set(ex.target, [])
    targets.get(ex.target).push(ex)
  }

  const orderIndex = (list, key) => {
    const i = list.indexOf(key)
    return i === -1 ? list.length : i
  }

  const sortExercises = (exs) => {
    if (sortMode === "difficulty") {
      return exs.slice().sort((a, b) => {
        const diffA = a.difficulty ?? 1
        const diffB = b.difficulty ?? 1
        if (diffA !== diffB) return diffA - diffB
        return exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang === "zh" ? "zh" : "en")
      })
    }
    return exs.slice().sort((x, y) => exerciseName(x, lang).localeCompare(exerciseName(y, lang), lang === "zh" ? "zh" : "en"))
  }

  const categories = [...byCategory.keys()].sort((a, b) => {
    const ia = orderIndex(CATEGORY_ORDER, a)
    const ib = orderIndex(CATEGORY_ORDER, b)
    return ia !== ib ? ia - ib : a.localeCompare(b)
  })

  return categories.map((category) => {
    const targetsMap = byCategory.get(category)
    const order = TARGET_ORDER[category] || []

    const targetNames = [...targetsMap.keys()].sort((a, b) => {
      const ia = orderIndex(order, a)
      const ib = orderIndex(order, b)
      return ia !== ib ? ia - ib : a.localeCompare(b)
    })

    const targets = targetNames.map((name) => {
      const exs = targetsMap.get(name)
      return {
        name,
        label: titleCase(name),
        count: exs.length,
        exercises: sortExercises(exs),
      }
    })

    return {
      name: category,
      label: titleCase(category),
      count: [...targetsMap.values()].reduce((sum, exs) => sum + exs.length, 0),
      targets,
    }
  })
}

// Pinyin matching: 全拼子串 (juanfu, fu) + 首字母前缀 (jf).
// namePinyin/nameInitials are NULL for user-created exercises and any
// library row without a curated Chinese name — those skip pinyin entirely.
const matchesPinyin = (ex, q) => {
  const py = typeof ex?.namePinyin === "string" ? ex.namePinyin.toLowerCase() : ""
  const ini = typeof ex?.nameInitials === "string" ? ex.nameInitials.toLowerCase() : ""
  if (py && py.includes(q)) return true
  if (ini && ini.startsWith(q)) return true
  return false
}

export const findExercise = (exercises, id) => {
  return exercises.find((ex) => ex.id === id)
}
export const searchExercises = (exercises, query, lang = "en") => {
  const q = typeof query === "string" ? query.trim().toLowerCase() : ""
  if (!q) return []
  const haystack = (ex) => [
    ex?.name,
    ex?.nameZh,
    localizedCategory(ex?.category),
    localizedTarget(ex?.target),
    localizedEquipment(ex?.equipment),
  ]
  return (exercises || [])
    .filter((ex) => {
      if (matchesPinyin(ex, q)) return true
      return haystack(ex).some((h) => typeof h === "string" && h.toLowerCase().includes(q))
    })
    .slice()
    .sort((a, b) => exerciseName(a, lang).localeCompare(exerciseName(b, lang), String(lang || "").toLowerCase().startsWith("zh") ? "zh" : "en"))
}