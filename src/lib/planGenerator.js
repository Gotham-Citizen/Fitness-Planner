// Questionnaire -> weekly plan generator. Maps (goal, days/week, equipment,
// experience, session length, focus areas) to a sequence of preset days using
// ACSM frequency guidance: novices thrive on 2-3 full-body days, intermediates
// on 3-4 upper/lower days, advanced on 4-6 with a push/pull/legs or
// upper/lower split. When a focus area is selected the matching preset leads;
// remaining days fill from the goal's general track. When the requested days
// exceed the available distinct presets, the track cycles.
import { normalizeLang } from "../utils/locale.js"

import {
  buildListPayload,
  EQUIPMENT_FALLBACK,
  getPreset,
  presetBodyPart,
  presetName,
  PRESETS,
} from "./presets/index.js"

// Tracks per goal+equipment. Arrays are ordered day sequences; `byDays`
// overrides with a curated split when the day count has a better fit.
const TRACKS = {
  strength: {
    gym: {
      byDays: {
        2: ["strength-fb-a", "strength-fb-b"],
        3: ["strength-fb-a", "strength-fb-b", "strength-fb-c"],
        4: ["strength-upper-a", "strength-lower-a", "strength-upper-b", "strength-lower-b"],
        5: ["strength-upper-a", "strength-lower-a", "strength-upper-b", "strength-lower-b", "strength-fb-c"],
        6: ["strength-upper-a", "strength-lower-a", "strength-upper-b", "strength-lower-b", "strength-upper-a", "strength-lower-a"],
      },
      cycle: ["strength-fb-a", "strength-fb-b", "strength-fb-c"],
    },
    dumbbell: {
      cycle: ["strength-fb-dumbbell-a", "strength-fb-dumbbell-b", "strength-fb-bodyweight-a"],
    },
    bodyweight: {
      cycle: ["strength-fb-bodyweight-a", "strength-fb-bodyweight-b"],
    },
    band: {
      cycle: ["cv-strength-full-body-band"],
    },
  },
  build: {
    gym: {
      byDays: {
        2: ["build-upper", "build-lower"],
        3: ["build-push", "build-pull", "build-legs"],
        4: ["build-upper", "build-lower", "build-push", "build-pull"],
        5: ["build-push", "build-pull", "build-legs", "build-upper", "build-lower"],
        6: ["build-push", "build-pull", "build-legs", "build-push", "build-pull", "build-legs"],
      },
      cycle: ["build-upper", "build-lower"],
    },
    dumbbell: {
      cycle: ["build-push-dumbbell", "build-pull-dumbbell", "build-legs-dumbbell"],
    },
    bodyweight: {
      cycle: ["build-upper-bodyweight", "build-lower-bodyweight", "build-core-bodyweight"],
    },
    band: {
      cycle: ["cv-build-full-body-band"],
    },
  },
  slim: {
    gym: {
      cycle: ["slim-fb-a", "slim-fb-b", "slim-fb-c"],
    },
    dumbbell: {
      cycle: ["slim-circuit-dumbbell", "slim-circuit-bodyweight"],
    },
    bodyweight: {
      cycle: ["slim-circuit-bodyweight"],
    },
    band: {
      cycle: ["cv-slim-full-body-band"],
    },
  },
  endurance: {
    gym: {
      cycle: ["end-fb-a", "end-fb-b"],
    },
    dumbbell: {
      cycle: ["end-core-bodyweight", "end-cardio-bodyweight"],
    },
    bodyweight: {
      cycle: ["end-core-bodyweight", "end-cardio-bodyweight"],
    },
    band: {
      cycle: ["cv-endurance-full-body-band"],
    },
  },
}

// Fallback chain shared with the recommendation engine (presets/index.js).

const trackIds = (goal, equipment, days) => {
  const tiers = EQUIPMENT_FALLBACK[equipment] || EQUIPMENT_FALLBACK.gym
  for (const tier of tiers) {
    const track = TRACKS[goal]?.[tier]
    if (!track) continue
    const byDays = track.byDays?.[days]
    if (byDays) return byDays
    if (track.cycle?.length) {
      const out = []
      for (let i = 0; i < days; i += 1) out.push(track.cycle[i % track.cycle.length])
      return out
    }
  }
  return []
}

// Presets for one focus area, ordered by equipment-tier priority. Every
// goal × equipment × focus cell has at least one preset in the library.
const focusPresetIds = (goal, equipment, part) => {
  const tiers = EQUIPMENT_FALLBACK[equipment] || EQUIPMENT_FALLBACK.gym
  const candidates = PRESETS.filter(
    (p) => p.goal === goal && presetBodyPart(p) === part && tiers.includes(p.equipment),
  )
  return tiers
    .flatMap((tier) => candidates.filter((p) => p.equipment === tier).map((p) => p.id))
    .filter((id, index, list) => list.indexOf(id) === index)
}

// Ordered preset IDs for the week. Focus areas lead (in selection order),
// then unused days fill from the general goal track; the general track cycles
// if more days are requested than distinct presets exist.
const selectPresetIds = ({ goal, equipment, dayCount, focus }) => {
  const generalIds = trackIds(goal, equipment, dayCount)
  const focusParts = (focus || []).filter((part) => part && part !== "full-body")
  if (!focusParts.length) return generalIds

  const used = new Set()
  const ids = []
  for (const part of focusParts) {
    if (ids.length >= dayCount) break
    const id = focusPresetIds(goal, equipment, part).find((candidate) => !used.has(candidate))
    if (!id) continue
    used.add(id)
    ids.push(id)
  }
  const fill = generalIds.filter((id) => !used.has(id))
  for (let i = 0; ids.length < dayCount; i += 1) {
    const id = fill.length ? fill[i % fill.length] : generalIds[i % generalIds.length]
    if (!id) break
    ids.push(id)
  }
  return ids.slice(0, dayCount)
}

// Day label used in generated list names ("Day 1 · Full Body A").
const DAY_PREFIX = {
  zh: (n) => `第 ${n} 天 · `,
  es: (n) => `Día ${n} · `,
  en: (n) => `Day ${n} · `,
}
const dayPrefix = (dayNumber, lang) => (DAY_PREFIX[normalizeLang(lang)] || DAY_PREFIX.en)(dayNumber)

/**
 * Build the weekly plan from questionnaire answers.
 * Returns { lists, weekdays }: each list is a POST /api/workoutlists body
 * (name, exercises with prescribed sets/reps + rest settings) and each
 * weekday is the intended 0-6 slot for that list, spread across the week.
 * A skipped day keeps its original weekday so the two arrays stay aligned.
 */
export const generatePlan = (
  { goal, experience, daysPerWeek, days, equipment, sessionMinutes, focus },
  exercises,
  lang = "en",
) => {
  const requestedDays = Number(daysPerWeek ?? days) || 3
  const dayCount = Math.min(6, Math.max(1, requestedDays))
  const ids = selectPresetIds({ goal, equipment, dayCount, focus })
  const builtDays = ids
    .map((id, index) => {
      const preset = getPreset(id)
      if (!preset) return null
      const name = `${dayPrefix(index + 1, lang)}${presetName(preset, lang)}`
      const payload = buildListPayload(preset, exercises, {
        experience,
        sessionMinutes,
        name,
        lang,
      })
      if (!payload.exercises.length) return null
      return { dayIndex: index, payload }
    })
    .filter(Boolean)
  return {
    lists: builtDays.map(({ payload }) => payload),
    weekdays: builtDays.map(({ dayIndex }) => Math.floor((dayIndex * 7) / dayCount)),
  }
}
