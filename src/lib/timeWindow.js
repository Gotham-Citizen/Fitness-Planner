// Shared "trailing N days" window helpers. `days = 0` means all time.

export const DAY_MS = 86400000

export const resolveNowMs = (now = Date.now()) => {
  return typeof now === "number" ? now : new Date(now).getTime()
}

export const trailingCutoffMs = (nowMs, days) => {
  return nowMs - days * DAY_MS
}

/** Strict `t > cutoff` match, same as the previous per-file filters. */
export const inTrailingWindow = (tMs, days, nowMs) => {
  if (!days) return true
  return tMs > trailingCutoffMs(nowMs, days)
}

export const filterTrailing = (items, getMs, days, now) => {
  if (!days) return items || []
  const nowMs = resolveNowMs(now)
  const cutoff = trailingCutoffMs(nowMs, days)
  return (items || []).filter((item) => {
    const t = getMs(item)
    return Number.isFinite(t) && t > cutoff
  })
}
