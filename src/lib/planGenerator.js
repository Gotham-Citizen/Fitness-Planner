// Questionnaire -> weekly plan generator. Maps (goal, days/week, equipment,
// experience, session length) to a sequence of preset days using ACSM
// frequency guidance: novices thrive on 2-3 full-body days, intermediates
// on 3-4 upper/lower days, advanced on 4-6 with a push/pull/legs or
// upper/lower split. When the user asks for more days than the equipment
// tier provides distinct presets for, the track cycles (e.g. Full Body A
// twice a week is a legitimate novice pattern per ACSM).
import { buildListPayload, EQUIPMENT_FALLBACK, getPreset, presetName } from "./presets/index.js"

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

// Day label used in generated list names ("Day 1 · Full Body A").
const dayPrefix = (dayNumber, lang) =>
  lang === "zh" ? `第 ${dayNumber} 天 · ` : `Day ${dayNumber} · `

// The shared lib only knows "en"/"zh"; default anything else to English.
const normalizeLangOrEn = (lang) => (String(lang || "").toLowerCase().startsWith("zh") ? "zh" : "en")

/**
 * Build the weekly plan: one list payload per training day.
 * Returns [{ preset, payload }] where payload is the POST /api/workoutlists
 * body (name, exercises with prescribed sets/reps + rest settings).
 */
export const generatePlan = (
  { goal, experience, days, equipment, sessionMinutes },
  exercises,
  lang = "en",
) => {
  const dayCount = Math.min(6, Math.max(2, Number(days) || 3))
  const ids = trackIds(goal, equipment, dayCount)
  return ids
    .map((id, index) => {
      const preset = getPreset(id)
      if (!preset) return null
      const name = `${dayPrefix(index + 1, normalizeLangOrEn(lang))}${presetName(preset, lang)}`
      const payload = buildListPayload(preset, exercises, {
        experience,
        sessionMinutes,
        name,
        lang,
      })
      if (!payload.exercises.length) return null
      return { preset, payload }
    })
    .filter(Boolean)
}
