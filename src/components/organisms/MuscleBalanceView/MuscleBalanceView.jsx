import { useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { profileBodyweightKg } from "../../../lib/bodyweight.js"
import { levelsOf, loadOfSessions, localizedMuscleLabel, muscleBalanceWindow, MUSCLES, musclesForSide, rankOf } from "../../../lib/muscleMap.js"
import { FATIGUE_HALF_LIFE_MS, FATIGUE_LEVELS, fatigueOf, fatigueStateFor, fatigueStateOf,STRENGTH_LEVELS, strengthMetaOf } from "../../../lib/recovery.js"

import "./MuscleBalanceView.css"

import { Button } from "../../atoms/index.js"
import { MuscleBodyMap, RangeTabs } from "../../molecules/index.js"


const MODES = [
  { id: "volume", key: "balance.volume" },
  { id: "ready", key: "balance.ready" },
  { id: "recovery", key: "balance.recovering" },
  { id: "fatigue", key: "balance.fatigue" },
  { id: "strength", key: "balance.strength" },
]

const WINDOWS = [
  { id: 0, key: "balance.allTime" },
  { id: 7, key: "balance.thisWeek" },
  { id: 30, key: "balance.last30d" },
]

export const MuscleBalanceView = ({ sessions, exercises, user, onOpenStructural }) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState("volume")
  const [win, setWin] = useState(30)
  const [side, setSide] = useState("front")
  const [selected, setSelected] = useState(null)
  const listRef = useRef(null)

  // When selection comes from the body map, the matching row may be
  // off-screen in a long list — bring it into view so the accent outline
  // (recovery-row.is-selected) is actually seen.
  useEffect(() => {
    if (!selected || !listRef.current) return
    listRef.current.querySelector(".recovery-row.is-selected")?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selected])

  const bodyweightKg = profileBodyweightKg(user)
  const completed = useMemo(() => (sessions || []).filter((s) => s?.completedAt), [sessions])
  // Time window filters Volume only. Fatigue (Ready / Recovering / Fatigued)
  // always uses all completed sessions — fatigueOf() applies its own 30-day
  // scan cutoff internally, so this is numerically identical to "Last 30d"
  // without jumping when the Volume window changes.
  const volumeWindowed = useMemo(() => muscleBalanceWindow(completed, win), [completed, win])

  const volume = useMemo(() => loadOfSessions(volumeWindowed, exercises), [volumeWindowed, exercises])
  const fatigue = useMemo(
    () => fatigueOf({ sessions: completed, exercises, bodyweightKg: bodyweightKg || 0 }),
    [completed, exercises, bodyweightKg],
  )
  const strengthData = useMemo(
    () => strengthMetaOf({ sessions: completed, exercises }),
    [completed, exercises],
  )
  const strength = strengthData.values
  const strengthTrained = strengthData.trained
  // Exact fatigue states per muscle (ready / recovering / fatigued) — drives the
  // green / amber / red map coloring, independent of the finer L0-L4 buckets.
  const fatigueStates = useMemo(() => {
    const states = {}
    MUSCLES.forEach((m) => { states[m] = fatigueStateOf(fatigue[m] || 0) })
    return states
  }, [fatigue])

  // State-exclusive tabs: Ready shows only ready muscles (green), Recovering
  // only recovering ones (amber), Fatigue only fatigued ones (red). Volume
  // shows everything (null = no filter).
  const activeState = mode === "ready" ? "ready" : mode === "recovery" ? "recovering" : mode === "fatigue" ? "fatigued" : null
  const stateSet = useMemo(() => (
    activeState ? new Set(MUSCLES.filter((m) => fatigueStates[m] === activeState)) : null
  ), [fatigueStates, activeState])

  const { levels, ranked } = useMemo(() => {
    if (mode === "fatigue") {
      const lv = levelsOf(fatigue, FATIGUE_LEVELS)
      const order = [...MUSCLES].sort((a, b) => (fatigue[b] || 0) - (fatigue[a] || 0))
      return { levels: lv, ranked: { worked: order.filter((m) => (fatigue[m] || 0) > 0), missed: order.filter((m) => !(fatigue[m] > 0)) } }
    }
    if (mode === "recovery") {
      const lv = {}
      MUSCLES.forEach((m) => {
        const v = fatigue[m] || 0
        lv[m] = v > 0.5 ? 4 : v >= 0.25 ? 2 : v > 0 ? 1 : 0
      })
      const order = [...MUSCLES].sort((a, b) => (fatigue[a] || 0) - (fatigue[b] || 0))
      return { levels: lv, ranked: { worked: order.filter((m) => (fatigue[m] || 0) > 0), missed: order.filter((m) => !(fatigue[m] > 0)) } }
    }
    if (mode === "ready") {
      const lv = levelsOf(fatigue, FATIGUE_LEVELS)
      const order = [...MUSCLES].sort((a, b) => (fatigue[a] || 0) - (fatigue[b] || 0))
      return { levels: lv, ranked: { worked: order.filter((m) => (fatigue[m] || 0) > 0), missed: order.filter((m) => !(fatigue[m] > 0)) } }
    }
    if (mode === "strength") {
      const lv = levelsOf(strength, STRENGTH_LEVELS)
      const order = [...MUSCLES].sort((a, b) => (strength[b] || 0) - (strength[a] || 0))
      return { levels: lv, ranked: { worked: order, missed: [] } }
    }
    const lv = levelsOf(volume)
    return { levels: lv, ranked: rankOf(volume) }
  }, [mode, volume, fatigue, strength])

  const readinessPercentFor = (slug) => {
    const v = Number(fatigue[slug] || 0)
    return Math.max(0, Math.min(100, Math.round((1 - v) * 100)))
  }

  const strengthPercentFor = (slug) => {
    const v = Number(strength[slug] || 0)
    return Math.max(0, Math.min(100, Math.round(v * 100)))
  }

  const barPercentFor = (slug) => {
    if (mode === "ready") return readinessPercentFor(slug)
    if (mode === "strength") return strengthTrained[slug] ? strengthPercentFor(slug) : 0
    return (levels[slug] || 0) * 25
  }

  const fatiguePercentFor = (slug) => {
    const v = Number(fatigue[slug] || 0)
    return Math.max(0, Math.min(100, Math.round(v * 100)))
  }

  const strengthBandFor = (slug) => {
    if (!strengthTrained[slug]) return t("balance.notTrained")
    const p = strengthPercentFor(slug)
    if (p >= 90) return t("balance.strong")
    if (p >= 75) return t("balance.developing")
    return t("balance.weak")
  }

  const badgeFor = (slug) => {
    if (mode === "ready") return `${readinessPercentFor(slug)}%`
    if (mode === "strength") {
      if (!strengthTrained[slug]) return "—"
      return `L${levels[slug]} (${strengthPercentFor(slug)}%)`
    }
    if (mode === "fatigue" || mode === "recovery") {
      if (!(fatigue[slug] > 0)) return "—"
      return `L${levels[slug]} (${fatiguePercentFor(slug)}%)`
    }
    return levels[slug] > 0 ? `L${levels[slug]}` : "—"
  }

  const stateLabel = (state) => state === "ready" ? t("balance.ready") : state === "recovering" ? t("balance.recovering") : t("balance.fatigued")
  const detailFor = (slug) => {
    if (mode === "strength") {
      if (!strengthTrained[slug]) return t("balance.notTrained")
      return `${strengthPercentFor(slug)}% ${strengthBandFor(slug)}`
    }
    if (mode === "fatigue") {
      const v = fatigue[slug] || 0
      return `${fatiguePercentFor(slug)}% ${stateLabel(fatigueStateOf(v))}`
    }
    if (mode === "ready") {
      return `${readinessPercentFor(slug)}% ${t("balance.ready")}`
    }
    if (mode === "recovery") {
      return `${fatiguePercentFor(slug)}% ${stateLabel(fatigueStateFor(fatigue[slug] || 0))}`
    }
    const v = volume[slug] || 0
    return t("balance.effectiveSets", { v: (Math.round(v * 10) / 10).toFixed(1) })
  }

  const flipSide = () => {
    setSide((s) => (s === "back" ? "front" : "back"))
    setSelected(null)
  }

  const toggleSelect = (slug) => {
    setSelected((prev) => (prev === slug ? null : slug))
  }

  // The right-hand list mirrors the current illustration: only muscles drawn
  // in this side's view (musclesForSide), preserving each mode's ordering.
  // State-exclusive tabs further narrow to the active fatigue state.
  // Ready is ordered most-ready first, so untrained (100%) come before
  // lightly fatigued ones; other modes keep their ranked order.
  const orderedSlugs = useMemo(() => (
    mode === "ready" ? [...ranked.missed, ...ranked.worked] : [...ranked.worked, ...ranked.missed]
  ), [mode, ranked])
  const visibleSlugs = useMemo(() => {
    const visible = new Set(musclesForSide(side))
    return orderedSlugs.filter((slug) => visible.has(slug) && (!stateSet || stateSet.has(slug)))
  }, [orderedSlugs, side, stateSet])

  // How many matching muscles are hidden on the opposite side. Used for the
  // empty-state hint so e.g. "Recovering · Front" can point at back-side
  // muscles instead of looking like nothing is recovering at all.
  const otherSideCount = useMemo(() => {
    if (!stateSet) return 0
    const otherVisible = new Set(musclesForSide(side === "back" ? "front" : "back"))
    return orderedSlugs.filter((slug) => otherVisible.has(slug) && stateSet.has(slug)).length
  }, [orderedSlugs, side, stateSet])

  // When Recovering is empty because everything trained is still above the
  // 0.50 fatigued edge, show how many are fatigued and roughly when the
  // closest one decays into the 25-50% recovering band (36h half-life).
  const recoveryStall = useMemo(() => {
    if (mode !== "recovery" || visibleSlugs.length > 0 || otherSideCount > 0) return null
    const fatigued = MUSCLES.map((m) => fatigue[m] || 0).filter((v) => v > 0.5)
    if (fatigued.length === 0) return null
    const closest = Math.min(...fatigued)
    const raw = -Math.log(Math.max(1e-6, 1 - Math.min(0.99, closest)))
    const target = -Math.log(1 - 0.5)
    const hours = Math.max(1, Math.ceil((FATIGUE_HALF_LIFE_MS / 3600000) * Math.log2(raw / target)))
    const eta = hours >= 48 ? `~${Math.round(hours / 24)}d` : `~${hours}h`
    return { count: fatigued.length, eta }
  }, [mode, visibleSlugs.length, otherSideCount, fatigue])

  // Map inputs gated to the active state: members keep their level/state fill,
  // everything else renders uncolored (level 0 + no st-* class = gray base).
  // Selection passes through only for a visible muscle (no stray outline).
  const mapLevels = useMemo(() => {
    if (!stateSet) return levels
    const gated = {}
    MUSCLES.forEach((m) => { gated[m] = stateSet.has(m) ? levels[m] : 0 })
    return gated
  }, [levels, stateSet])
  const mapStates = useMemo(() => {
    if (!stateSet) return fatigueStates
    const gated = {}
    stateSet.forEach((m) => { gated[m] = fatigueStates[m] })
    return gated
  }, [fatigueStates, stateSet])
  const mapSelected = stateSet && !stateSet.has(selected) ? null : selected

  const sideName = (s) => s === "back" ? t("balance.back") : t("balance.front")

  return (
    <section className="balance-view" aria-label={t("balance.title")}>
      <h2 className="workouts-title">{t("balance.title")}</h2>
      <p className="movement-list-subtitle">{t("balance.subtitle")}</p>

      <div className="seg" role="tablist" aria-label={t("balance.mode")} style={{ "--n": MODES.length, "--i": Math.max(0, MODES.findIndex((m) => m.id === mode)) }}>
        <span className="seg-sel" aria-hidden="true" />
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} aria-pressed={mode === m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>
            <span>{t(m.key)}</span>
          </button>
        ))}
      </div>

      {mode === "volume" && (
      <RangeTabs
        options={WINDOWS}
        value={win}
        onChange={setWin}
        ariaLabel={t("balance.window")}
        renderLabel={(w) => t(w.key)}
      />
      )}
      <div className="balance-grid">
        <div className="balance-map-wrap">
          <MuscleBodyMap
            levels={mapLevels}
            states={mapStates}
            selected={mapSelected}
            onSelect={toggleSelect}
            modeClass={mode === "volume" ? "" : mode === "strength" ? "hm-strength" : "hm-fatigue"}
            side={side}
          />
          {mode === "volume" && (
            <div className="hm-legend hm-volume" aria-label={t("balance.volume")}>
              <span>{t("balance.less")}</span><div className="hm-c l1" />
              <span>{t("balance.more")}</span><div className="hm-c l4" />
            </div>
          )}
          {mode === "strength" && (
            <div className="hm-legend hm-strength" aria-label={t("balance.strength")}>
              <span>{t("balance.notTrained")}</span><div className="hm-c l0" />
              <span>{t("balance.weak")}</span><div className="hm-c l1" />
              <span>{t("balance.strong")}</span><div className="hm-c l4" />
            </div>
          )}
          <Button
            variant="ghost"
            size="detail-small"
            className="balance-flip"
            onClick={flipSide}
            aria-label={side === "back" ? t("balance.frontView") : t("balance.backView")}
          >
            {side === "back" ? t("balance.showFront") : t("balance.showBack")}
          </Button>
        </div>
        <div className="balance-lists">
          <h3>{t("balance.listHeading", { mode: mode === "volume" ? t("balance.hardestFirst") : mode === "ready" ? t("balance.ready") : mode === "recovery" ? t("balance.recovering") : mode === "fatigue" ? t("balance.fatigued") : t("balance.strongestFirst"), side: sideName(side) })}</h3>
          {visibleSlugs.length === 0 ? (
            <div className="balance-empty">
              <p className="balance-hint">
                {mode === "ready"
                  ? otherSideCount > 0
                    ? t("balance.emptyReadyOther", { a: sideName(side), n: otherSideCount, b: sideName(side === "back" ? "front" : "back") })
                    : t("balance.emptyReadyNone")
                  : mode === "recovery"
                    ? otherSideCount > 0
                      ? t("balance.emptyRecoveryOther", { a: sideName(side), n: otherSideCount, b: sideName(side === "back" ? "front" : "back") })
                      : recoveryStall
                        ? t("balance.emptyRecoveryStall", { n: recoveryStall.count, eta: recoveryStall.eta })
                        : t("balance.emptyRecoveryNone")
                    : mode === "fatigue"
                      ? otherSideCount > 0
                        ? t("balance.emptyFatigueOther", { a: sideName(side), n: otherSideCount, b: sideName(side === "back" ? "front" : "back") })
                        : t("balance.emptyFatigueNone")
                      : t("balance.emptyDefault")}
              </p>
              {otherSideCount > 0 && (
                <button
                  type="button"
                  className="ghost-button detail-small balance-flip"
                  onClick={flipSide}
                  aria-label={side === "back" ? t("balance.frontView") : t("balance.backView")}
                >
                  {side === "back" ? t("balance.showFront") : t("balance.showBack")}
                </button>
              )}
            </div>
          ) : (
          <ul className="recovery-list" ref={listRef}>
            {visibleSlugs.map((slug) => (
              <li
                key={slug}
                data-slug={slug}
                className={`recovery-row is-clickable is-${mode === "recovery" ? "recovering" : mode === "fatigue" ? "fatigued" : mode}${mode === "strength" && !strengthTrained[slug] ? " is-untrained" : ""} ${selected === slug ? "is-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === slug}
                aria-label={`${selected === slug ? t("balance.deselect") : t("balance.highlight")} ${localizedMuscleLabel(slug)} ${t("balance.onMap")}`}
                onClick={() => toggleSelect(slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    toggleSelect(slug)
                  }
                }}
              >
                <div className="recovery-row-head">
                  <div className="recovery-row-info">
                    <span className="recovery-label">{localizedMuscleLabel(slug)}</span>
                    <span className="recovery-sub">{detailFor(slug)}</span>
                  </div>
                  <span className="recovery-badge">{badgeFor(slug)}</span>
                </div>
                <div className="recovery-bar" role="progressbar" aria-valuenow={barPercentFor(slug)} aria-valuemin={0} aria-valuemax={100} aria-label={`${localizedMuscleLabel(slug)} ${barPercentFor(slug)}%`}>
                  <div className="recovery-bar-fill" style={{ width: `${barPercentFor(slug)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      </div>

      <div className="balance-card balance-open-card">
        <div className="balance-open-text">
          <h3>{t("balance.structural")}</h3>
          <p className="panel-subtitle">{t("balance.structuralSub")}</p>
        </div>
        <Button variant="primary" size="detail-small" onClick={onOpenStructural}>
          {t("balance.open")}
        </Button>
      </div>
    </section>
  )
}
