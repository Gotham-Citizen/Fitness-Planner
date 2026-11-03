import { useEffect, useRef, useState } from "react"

import { nextOccurrenceISO, REST_DAY_VALUE, weekdayFromISODate } from "../../../lib/schedule.js";

/**
 * Editor state and save handlers for the plan & schedule page. Owns the
 * fixed-week and rotation drafts plus the instant-save actions (week start,
 * schedule type); the editors keep their own drafts and save them through the
 * step actions.
 *
 * Drafts are initialized once — the page remounts when the user changes (App
 * keys account sub-pages), so no user-change effect is needed.
 *
 * The loop start is picked as a weekday in the UI and converted to the next
 * occurrence of that weekday (on or after today) at save time, so the stored
 * shape stays the server-normalized `rotationStartedAt: 'YYYY-MM-DD'`.
 */
export const useScheduleDrafts = ({ schedule, weekStartsOn, onUpdateProfile, t }) => {
  // State
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const [fixedDraft, setFixedDraft] = useState(() => ({ ...(schedule?.fixed || {}) }))
  const [rotationDraft, setRotationDraft] = useState(() =>
    Array.isArray(schedule?.rotation) && schedule.rotation.length > 0
      ? schedule.rotation.map((e) => ({ ...e }))
      : [{ type: "rest" }],
  )
  const [startWeekday, setStartWeekday] = useState(() => {
    const saved = weekdayFromISODate(schedule?.rotationStartedAt)
    return saved == null ? new Date().getDay() : saved
  })

  // Latest known schedule:
  //   persistedRef — the last server-confirmed schedule.
  //   latestRef    — that truth plus optimistic merges, so a save issued right
  //                  after another one never builds on a stale render-time prop.
  const persistedRef = useRef(schedule)
  const latestRef = useRef(schedule)

  // The prop carries the server truth (it changes once a save lands), so it
  // re-bases the tracked schedule whenever it changes.
  useEffect(() => {
    persistedRef.current = schedule
    latestRef.current = schedule
  }, [schedule])

  // Values — the saved rotation as it will be normalized, for dirty checks.
  const savedRotation = Array.isArray(schedule?.rotation) && schedule.rotation.length > 0
    ? schedule.rotation.map((e) => ({ ...e }))
    : [{ type: "rest" }]
  const savedStartWeekday = weekdayFromISODate(schedule?.rotationStartedAt)
  const fixedDirty = JSON.stringify(fixedDraft) !== JSON.stringify(schedule?.fixed || {})
  const rotationDirty =
    JSON.stringify(rotationDraft) !== JSON.stringify(savedRotation) || startWeekday !== savedStartWeekday

  // Actions
  const clearError = () => setError(null)

  // Every save sends the whole schedule object; the base guarantees a valid
  // mode and week start so a first-time pick alone still normalizes. Returns
  // true when the server accepted the save, false when it failed.
  const saveSchedule = async (patch, key) => {
    const merged = { ...(latestRef.current ?? {}), ...patch }
    if (!Number.isInteger(merged.weekStartsOn)) merged.weekStartsOn = weekStartsOn
    // Optimistic merge so the next save composes on top of this one.
    latestRef.current = merged
    try {
      setSaving(key)
      setError(null)
      const updated = await onUpdateProfile({ schedule: merged })
      const serverSchedule = updated?.schedule
      if (serverSchedule) {
        persistedRef.current = serverSchedule
        latestRef.current = serverSchedule
      }
      return true
    } catch (err) {
      // Drop the optimistic merge — the tracked value stays on the last
      // server-confirmed schedule so a retry does not send half-applied data.
      latestRef.current = persistedRef.current
      setError(err?.message || t("schedule.failed"))
      return false
    } finally {
      setSaving(null)
    }
  }

  // --- Fixed week ---
  // Week start + fixed days go out in ONE request, so the two never race and
  // the week start can not be reverted by a follow-up save.
  const saveFixedWeek = (day, draft) =>
    saveSchedule(
      {
        mode: "fixed",
        weekStartsOn: day,
        fixed: Object.fromEntries(Object.entries(draft || {}).filter(([, v]) => v)),
      },
      "fixed",
    )
  const resetFixed = () => {
    setFixedDraft({ ...(persistedRef.current?.fixed || {}) })
    setError(null)
  }

  // --- Rotation loop ---
  const changeEntry = (i, value) =>
    setRotationDraft((prev) => prev.map((e, idx) => (idx === i
      ? (value === REST_DAY_VALUE ? { type: "rest" } : { type: "workout", listId: value })
      : e)))
  const addDay = () => setRotationDraft((prev) => [...prev, { type: "rest" }])
  const removeDay = (i) => setRotationDraft((prev) => prev.filter((_, idx) => idx !== i))
  const saveRotation = () => {
    if (rotationDraft.length === 0) {
      setError(t("schedule.rotationEmpty"))
      return Promise.resolve(false)
    }
    return saveSchedule(
      { mode: "rotation", rotation: rotationDraft, rotationStartedAt: nextOccurrenceISO(startWeekday) },
      "rotation",
    )
  }
  const resetRotation = () => {
    setRotationDraft(savedRotation)
    setStartWeekday(savedStartWeekday == null ? new Date().getDay() : savedStartWeekday)
    setError(null)
  }

  // --- Schedule type ---
  // Switching saves instantly. Rotation needs at least one entry plus a start
  // date, so seed them from the latest known schedule or the draft instead of
  // failing the server validation.
  const pickMode = (next) => {
    if (saving !== null) return Promise.resolve(true)
    const latest = latestRef.current ?? {}
    if (latest.mode === next) return Promise.resolve(true)
    if (next !== "rotation") {
      return saveSchedule({ mode: next }, "mode")
    }
    const latestRotation = Array.isArray(latest.rotation) && latest.rotation.length > 0
      ? latest.rotation.map((e) => ({ ...e }))
      : null
    const rotation = latestRotation ?? (rotationDraft.length > 0 ? rotationDraft.map((e) => ({ ...e })) : [{ type: "rest" }])
    const latestStart = weekdayFromISODate(latest.rotationStartedAt)
    // Keep a saved start date verbatim; otherwise resolve the picked weekday.
    const weekday = latestRotation && latestStart != null ? latestStart : startWeekday
    const startedISO = typeof latest.rotationStartedAt === "string"
      ? latest.rotationStartedAt
      : nextOccurrenceISO(weekday)
    setRotationDraft(rotation)
    setStartWeekday(weekday)
    return saveSchedule({ mode: "rotation", rotation, rotationStartedAt: startedISO }, "mode")
  }

  return {
    saving,
    error,
    clearError,
    fixedDraft,
    setFixedDraft,
    fixedDirty,
    saveFixedWeek,
    resetFixed,
    rotationDraft,
    rotationDirty,
    changeEntry,
    addDay,
    removeDay,
    saveRotation,
    resetRotation,
    startWeekday,
    setStartWeekday,
    pickMode,
  }
}
