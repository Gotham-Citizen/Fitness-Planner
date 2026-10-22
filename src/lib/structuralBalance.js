// Structural-balance engine, adapted from openGym's structuralBalance.js (AGPL-3.0).
// Local shapes: sessions = [{ completedAt, bodyweight, bodyweightUnit, sets: [{ exercise_id, reps, weight, weight_unit }]}]
//               exercises = [{ id, equipment }]
// S = { sessions, exercises, bodyweightKg, gender }

import { isBodyweightExercise } from "./muscleMap.js"
import { DEFAULT_FORMULA,estimate1RM, FORMULAS, loadAtReps } from "./onerm.js"
import { BALANCE_STATUSES, BORDERLINE_BAND_PCT, EVALUATION_MODES } from "./structuralBalanceTemplates.js"
import { LBS_TO_KG } from "./units.js"

const kgOf = (n, unit) => Number(n) * (/^lb/i.test(String(unit || "")) ? LBS_TO_KG : 1)

const byExercise = (exercises) => new Map((exercises || []).map((ex) => [ex.id, ex]))

// What one completed set actually moved, in kg. On a bodyweight exercise `weight` holds
// only *added* load, so the lifter's mass is added back (stamped session BW, else profile).
const setLoadKg = (session, ex, set, bodyweightKg) => {
  const logged = kgOf(set?.weight || 0, set?.weight_unit ?? set?.weightUnit ?? "kg")
  if (!isBodyweightExercise(ex)) return logged
  const stamped = Number(session?.bodyweight) > 0
    ? kgOf(session.bodyweight, session?.bodyweightUnit || "kg")
    : null
  const body = stamped ?? (bodyweightKg > 0 ? bodyweightKg : null)
  return body > 0 ? body + logged : null
}

const unrounded1RM = (loadKg, reps) => {
  if (estimate1RM(loadKg, reps) === null) return null
  const w = Number(loadKg)
  const r = Number(reps)
  if (r === 1) return w
  return FORMULAS[DEFAULT_FORMULA](w, Math.round(r))
}

/** Best reading across a whitelist of exercise ids: estimated 1RM, or load-for-reps. */
export const resolveCurrent = (sessions, exercises, exerciseIds, bodyweightKg, reps = null) => {
  const map = byExercise(exercises)
  const key = reps > 1 ? "repsKg" : "estKg"
  let best = null
  for (const exId of exerciseIds) {
    const ex = map.get(exId)
    for (const session of sessions || []) {
      if (!session?.completedAt) continue
      for (const set of session.sets || []) {
        if ((set?.exercise_id || set?.exerciseId) !== exId) continue
        const r = Math.round(Number(set?.reps))
        if (!(r >= 1)) continue
        const loadKg = setLoadKg(session, ex || { id: exId }, set, bodyweightKg)
        if (loadKg === null || !(loadKg > 0)) continue
        const kg = reps > 1 ? loadAtReps(loadKg, r, reps) : unrounded1RM(loadKg, r)
        if (kg === null) continue
        if (!best || kg > best[key]) {
          best = { [key]: kg, w: Number(set?.weight) || 0, r, d: session.completedAt, exId }
        }
      }
    }
  }
  return best
}

/** Best completed-set rep count across a whitelist, ignoring load. */
export const resolveCurrentReps = (sessions, exerciseIds) => {
  let best = null
  for (const exId of exerciseIds) {
    for (const session of sessions || []) {
      if (!session?.completedAt) continue
      for (const set of session.sets || []) {
        if ((set?.exercise_id || set?.exerciseId) !== exId) continue
        const r = Math.round(Number(set?.reps))
        if (!isFinite(r) || r < 1) continue
        if (!best || r > best.r) best = { r, w: Number(set?.weight) || 0, d: session.completedAt, exId }
      }
    }
  }
  return best
}

export const targetFor = (role, gender) => {
  const female = String(gender || "").toLowerCase() === "female"
  if (role.evaluationMode === EVALUATION_MODES.REP_COUNT) {
    return female && role.repsTargetFemale != null ? role.repsTargetFemale : role.repsTarget
  }
  return female && role.targetPctFemale != null ? role.targetPctFemale : role.targetPct
}

export const ratioFor = (role, current, ctx) => {
  if (role.evaluationMode === EVALUATION_MODES.LOAD_RATIO) {
    if (!ctx.anchorCurrent || !(ctx.anchorCurrent.estKg > 0)) return null
    return (current.estKg / ctx.anchorCurrent.estKg) * 100
  }
  if (role.evaluationMode === EVALUATION_MODES.BODYWEIGHT_RATIO) {
    if (!(ctx.bodyweightKg > 0)) return null
    const kg = role.reps > 1 ? current.repsKg : current.estKg
    return kg > 0 ? (kg / ctx.bodyweightKg) * 100 : null
  }
  return (current.r / ctx.targetPct) * 100
}

const EDGE_TOLERANCE_PCT = 1e-9

export const classify = (actualPct, targetPct) => {
  if (actualPct === null || actualPct === undefined || !isFinite(actualPct)) return BALANCE_STATUSES.NO_DATA
  if (actualPct >= targetPct - EDGE_TOLERANCE_PCT) return BALANCE_STATUSES.BALANCED
  if (actualPct >= targetPct - BORDERLINE_BAND_PCT - EDGE_TOLERANCE_PCT) return BALANCE_STATUSES.BORDERLINE
  return BALANCE_STATUSES.WEAK
}

/** Pure ratio-computation entry point. Returns one row per role. */
export const computeBalance = ({ sessions, exercises, template, bodyweightKg, gender }) => {
  const currentByRoleId = new Map(
    template.roles.map((role) => {
      const ids = role.exerciseIds
      const current = role.evaluationMode === EVALUATION_MODES.REP_COUNT
        ? resolveCurrentReps(sessions, ids)
        : resolveCurrent(sessions, exercises, ids, bodyweightKg, role.evaluationMode === EVALUATION_MODES.BODYWEIGHT_RATIO ? role.reps : null)
      return [role.id, current]
    }),
  )
  return template.roles.map((role) => {
    const current = currentByRoleId.get(role.id)
    const targetPct = targetFor(role, gender)
    const classifyTarget = role.evaluationMode === EVALUATION_MODES.REP_COUNT ? 100 : targetPct
    const configuredExerciseId = role.exerciseIds[0] || null
    const base = { roleId: role.id, configuredExerciseId, targetPct }
    if (!current) {
      return { ...base, mappedExerciseId: null, current: null, actualPct: null, status: BALANCE_STATUSES.NO_DATA, needsBodyweight: needsBodyweight(role, current, bodyweightKg), needsAnchor: false }
    }
    const anchorCurrent = role.anchorRoleId ? currentByRoleId.get(role.anchorRoleId) : current
    const actualPct = ratioFor(role, current, { anchorCurrent, bodyweightKg, targetPct })
    const needsAnchor = !!role.anchorRoleId && role.evaluationMode === EVALUATION_MODES.LOAD_RATIO && !(anchorCurrent?.estKg > 0)
    return {
      ...base,
      mappedExerciseId: current.exId,
      current,
      actualPct,
      status: classify(actualPct, classifyTarget),
      needsBodyweight: needsBodyweight(role, current, bodyweightKg),
      needsAnchor,
    }
  })
}

const needsBodyweight = (role, current, bodyweightKg) => {
  if (bodyweightKg > 0 || role.evaluationMode === EVALUATION_MODES.REP_COUNT) return false
  if (current) return role.evaluationMode === EVALUATION_MODES.BODYWEIGHT_RATIO
  return false
}
