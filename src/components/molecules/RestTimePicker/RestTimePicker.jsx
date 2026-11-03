import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import "./RestTimePicker.css"

import { formatRestSecs } from "./formatRest.js"

/* Must stay in sync with RestTimePicker.css (--rtd-item-h / --rtd-width). */
const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
/* picker chrome: 4px padding top/bottom + 1px border top/bottom */
const PICKER_CHROME = 10
const POPOVER_GAP = 8
const POPOVER_WIDTH = 132
const EDGE_MARGIN = 8

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

const nearestIndex = (values, raw) => {
  const target = Number(raw)
  if (!Number.isFinite(target)) return 0
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < values.length; i += 1) {
    const diff = Math.abs(values[i] - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

/**
 * Android-style wheel picker for rest time.
 * Scroll to highlight, tap the highlighted row or press Enter to confirm.
 * Backdrop / Esc / Tab cancels.
 *
 * Rendered through a portal into document.body so that ancestors with
 * transform / will-change (e.g. a dragged row, an animated modal) can't
 * turn `position: fixed` into something relative to themselves.
 *
 * `anchorEl` must be a DOM element (not a ref object).
 */
export const RestTimePicker = ({
  value,
  onSelect,
  onClose,
  min = 30,
  max = 180,
  step = 15,
  anchorEl,
  formatValue = formatRestSecs,
  ariaLabel,
}) => {
  const values = useMemo(() => {
    const safeStep = Math.max(1, Math.round(step))
    const out = []
    for (let v = Math.ceil(min / safeStep) * safeStep; v <= max; v += safeStep) out.push(v)
    if (out.length === 0) out.push(min)
    return out
  }, [min, max, step])

  const [index, setIndex] = useState(() => nearestIndex(values, value))
  const [pos, setPos] = useState(null)
  const ready = pos !== null

  const popoverRef = useRef(null)
  const listRef = useRef(null)

  /* ---- position under the anchor, flipping above when there is no room ---- */
  useLayoutEffect(() => {
    if (!anchorEl || typeof anchorEl.getBoundingClientRect !== "function") return undefined

    const measure = () => {
      const rect = anchorEl.getBoundingClientRect()
      const height = LIST_HEIGHT + PICKER_CHROME
      const left = clamp(
        rect.left,
        EDGE_MARGIN,
        Math.max(EDGE_MARGIN, window.innerWidth - POPOVER_WIDTH - EDGE_MARGIN),
      )
      let top = rect.bottom + POPOVER_GAP
      if (top + height > window.innerHeight - EDGE_MARGIN) {
        const above = rect.top - height - POPOVER_GAP
        top = above >= EDGE_MARGIN ? above : Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)
      }
      setPos({ left, top })
    }

    // The picker's own list scrolling must not trigger a re-measure.
    const onWindowScroll = (event) => {
      if (popoverRef.current?.contains(event.target)) return
      measure()
    }

    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", onWindowScroll, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", onWindowScroll, true)
    }
  }, [anchorEl])

  /* ---- park the list on the initial value (runs once the list exists) ---- */
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = index * ITEM_HEIGHT
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  /* ---- take focus once the list exists ---- */
  useEffect(() => {
    if (ready) listRef.current?.focus({ preventScroll: true })
  }, [ready])

  /* ---- dismiss on outside click ---- */
  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target
      if (popoverRef.current?.contains(target)) return
      // Let the anchor's own onClick toggle the popover closed.
      if (anchorEl?.contains?.(target)) return
      onClose?.()
    }
    document.addEventListener("mousedown", onPointerDown, true)
    document.addEventListener("touchstart", onPointerDown, true)
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true)
      document.removeEventListener("touchstart", onPointerDown, true)
    }
  }, [anchorEl, onClose])

  const commit = useCallback(
    (next) => {
      onSelect?.(next)
      onClose?.()
    },
    [onSelect, onClose],
  )

  const scrollToIndex = useCallback((next) => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: next * ITEM_HEIGHT, behavior: "smooth" })
  }, [])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setIndex(clamp(Math.round(el.scrollTop / ITEM_HEIGHT), 0, values.length - 1))
  }, [values.length])

  const handleKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault()
          const next = clamp(index + 1, 0, values.length - 1)
          setIndex(next)
          scrollToIndex(next)
          break
        }
        case "ArrowUp": {
          event.preventDefault()
          const next = clamp(index - 1, 0, values.length - 1)
          setIndex(next)
          scrollToIndex(next)
          break
        }
        case "Enter":
        case " ": {
          event.preventDefault()
          commit(values[index])
          break
        }
        case "Escape": {
          // Keep the modal shell underneath from also closing.
          event.preventDefault()
          event.stopPropagation()
          onClose?.()
          break
        }
        case "Tab": {
          onClose?.()
          break
        }
        default:
          break
      }
    },
    [index, values, commit, onClose, scrollToIndex],
  )

  if (!pos) return null

  return createPortal(
    <div
      ref={popoverRef}
      className="rest-time-picker"
      style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div className="rest-time-picker__band" aria-hidden="true" />
      <ul
        ref={listRef}
        className="rest-time-picker__list"
        role="listbox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-activedescendant={`rest-time-option-${index}`}
        onScroll={handleScroll}
      >
        {values.map((secs, i) => (
          <li
            key={secs}
            id={`rest-time-option-${i}`}
            role="option"
            aria-selected={i === index}
            className={`rest-time-picker__item${i === index ? " is-active" : ""}`}
            onClick={() => {
              if (i === index) {
                commit(secs)
              } else {
                setIndex(i)
                scrollToIndex(i)
              }
            }}
          >
            {formatValue(secs)}
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  )
}