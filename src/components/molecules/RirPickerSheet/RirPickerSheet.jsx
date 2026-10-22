import { useState } from "react"

import { useTranslation } from "react-i18next"

import {
  normalizeEffortScale,
  RIR_PRESETS,
  RIR_STEP,
  rirToRpe,
  RPE_MAX,
  RPE_MIN,
  RPE_PRESETS,
  RPE_STEP,
  rpeToRir,
} from "../../../lib/effort.js"

import { SegmentedToggle } from "../../atoms/index.js"
import { BottomSheet } from "../BottomSheet/BottomSheet.jsx"

const RIR_MIN = 0
const RIR_MAX = 10

const clampRir = (n) => {
  if (!Number.isFinite(n)) return null
  return Math.min(RIR_MAX, Math.max(RIR_MIN, n))
}

const clampRpe = (n) => {
  if (!Number.isFinite(n)) return null
  return Math.min(RPE_MAX, Math.max(RPE_MIN, n))
}

const stepRir = (cur, dir) => {
  const base = cur == null ? (dir > 0 ? 0 : null) : cur
  if (base == null) return dir > 0 ? 0 : null
  return clampRir(Math.round((base + dir * RIR_STEP) * 10) / 10)
}

const stepRpe = (cur, dir) => {
  const base = cur == null ? (dir > 0 ? RPE_MAX : null) : cur
  if (base == null) return dir > 0 ? RPE_MAX : null
  return clampRpe(Math.round((base + dir * RPE_STEP) * 10) / 10)
}

const displayFor = (rir, scale) => {
  if (rir == null) return ""
  return String(normalizeEffortScale(scale) === "rpe" ? rirToRpe(rir) : rir)
}

// Effort bottom-sheet supporting both scales. `value` is canonical RIR (null =
// unrated), `scale` is the set's logged scale ('rir' | 'rpe') used as the
// initial tab. `onSelect(rir, scale)` always reports canonical RIR plus the tab
// that was used, so old RIR sets stay RIR unless re-logged as RPE.
export const RirPickerSheet = ({ value, scale, lockScale, onSelect, onClose }) => {
  // When locked (active workout session), the sheet stays in the session's
  // fixed scale — no RIR/RPE toggle, so one workout never mixes scales.
  const { t } = useTranslation()
  const locked = lockScale === true
  const [tab, setTab] = useState(() => normalizeEffortScale(scale))
  const [exactDraft, setExactDraft] = useState(() => displayFor(value, scale))

  const switchTab = (next) => {
    const clean = normalizeEffortScale(next)
    if (clean === tab) return
    setTab(clean)
    setExactDraft(displayFor(value, clean))
  }

  const commitExact = (raw) => {
    const text = String(raw ?? "").trim()
    if (text === "") {
      onSelect?.(null, tab)
      return
    }
    const n = Number(text)
    if (!Number.isFinite(n)) return
    if (tab === "rpe") {
      const clamped = clampRpe(n)
      if (clamped == null) return
      onSelect?.(rpeToRir(clamped), "rpe")
    } else {
      const clamped = clampRir(n)
      if (clamped == null) return
      onSelect?.(clamped, "rir")
    }
  }

  const isRirActive = (presetRir) => {
    if (value == null) return false
    if (presetRir >= 4) return value >= 4
    return value === presetRir
  }

  const isRpeActive = (presetRpe) => {
    if (value == null) return false
    const rpe = rirToRpe(value)
    if (presetRpe <= RPE_MIN) return rpe <= RPE_MIN
    return rpe === presetRpe
  }

  const presets = tab === "rpe" ? RPE_PRESETS : RIR_PRESETS
  const isRpe = tab === "rpe"

  const stepDown = () => {
    if (isRpe) {
      const cur = exactDraft === "" ? null : Number(exactDraft)
      const next = stepRpe(Number.isFinite(cur) ? cur : null, -1)
      if (next == null) {
        setExactDraft("")
        onSelect?.(null, "rpe")
      } else {
        setExactDraft(String(next))
        onSelect?.(rpeToRir(next), "rpe")
      }
    } else {
      const cur = exactDraft === "" ? null : Number(exactDraft)
      const next = stepRir(Number.isFinite(cur) ? cur : null, -1)
      if (next == null) {
        setExactDraft("")
        onSelect?.(null, "rir")
      } else {
        setExactDraft(String(next))
        onSelect?.(next, "rir")
      }
    }
  }

  const stepUp = () => {
    if (isRpe) {
      const cur = exactDraft === "" ? null : Number(exactDraft)
      const next = stepRpe(Number.isFinite(cur) ? cur : null, 1)
      if (next != null) {
        setExactDraft(String(next))
        onSelect?.(rpeToRir(next), "rpe")
      }
    } else {
      const cur = exactDraft === "" ? null : Number(exactDraft)
      const next = stepRir(Number.isFinite(cur) ? cur : null, 1)
      if (next != null) {
        setExactDraft(String(next))
        onSelect?.(next, "rir")
      }
    }
  }

  const pickPreset = (p) => {
    if (isRpe) {
      const active = isRpeActive(p.rpe)
      if (active) onSelect?.(null, "rpe")
      else onSelect?.(rpeToRir(p.rpe), "rpe")
    } else {
      const active = isRirActive(p.rir)
      if (active) onSelect?.(null, "rir")
      else onSelect?.(p.rir, "rir")
    }
    onClose?.()
  }

  return (
    <BottomSheet label={t("effortPicker.title")} onClose={onClose}>
      <h3 className="rir-sheet-title" style={{ marginBottom: "2px" }}>{t("effortPicker.title")}</h3>
        <div className="muted small" style={{ marginBottom: "10px" }}>
          {isRpe ? t("effortPicker.subRpe") : t("effortPicker.subRir")}
        </div>
        {!locked && (
          <div style={{ marginBottom: "10px" }}>
            <SegmentedToggle
              options={["rir", "rpe"]}
              value={tab}
              onPick={switchTab}
              ariaLabel={t("effortPicker.scaleGroup")}
              uppercase
            />
          </div>
        )}
        <div className="list menu-list effpick">
          {presets.map((p) => {
            const label = isRpe
              ? (p.rpe <= RPE_MIN ? `${RPE_MIN}-` : String(p.rpe))
              : (p.rir >= 4 ? "4+" : String(p.rir))
            const active = isRpe ? isRpeActive(p.rpe) : isRirActive(p.rir)
            return (
              <div
                key={label}
                className={`item menu-item${active ? " is-active" : ""}`}
                role="button"
                tabIndex={0}
                style={{ "--bc": p.color }}
                aria-pressed={active}
                aria-label={`${isRpe ? "RPE" : "RIR"} ${label}: ${t(p.feelKey)}`}
                onClick={() => pickPreset(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    pickPreset(p)
                  }
                }}
              >
                <span className="lrow-i effpick-n">{label}</span>
                <div className="grow"><div className="tt">{t(p.feelKey)}</div></div>
                <span className="menu-on" aria-hidden={!active}>
                  <svg className="icn" data-icon="check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m4.8 12.6 4.8 4.8L19.2 6.8"></path>
                  </svg>
                </span>
              </div>
            )
          })}
          <div className="item menu-item effpick-free">
            <div className="grow"><div className="tt">{isRpe ? t("effortPicker.exactRpe") : t("effortPicker.exactRir")}</div></div>
            <div className="stp effcell-stp">
              <button type="button" aria-label={t("effortPicker.decrease")} onClick={stepDown}>
                <svg className="icn" data-icon="minus" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M5.2 12h13.6"></path>
                </svg>
              </button>
              <span className="val">
                <input
                  inputMode="decimal"
                  className="num"
                  placeholder="–"
                  type="text"
                  aria-label={isRpe ? t("effortPicker.exactRpe") : t("effortPicker.exactRir")}
                  value={exactDraft}
                  onChange={(e) => setExactDraft(e.target.value)}
                  onBlur={(e) => commitExact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitExact(e.currentTarget.value)
                      e.currentTarget.blur()
                    }
                  }}
                />
              </span>
              <button type="button" aria-label={t("effortPicker.increase")} onClick={stepUp}>
                <svg className="icn" data-icon="plus" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 5.2v13.6M5.2 12h13.6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div style={{ height: "4px" }}></div>
    </BottomSheet>
  )
}
