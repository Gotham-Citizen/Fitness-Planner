import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import "./RestTimePicker.css"

import { formatRestSecs } from "./formatRest.js"

/* Must stay in sync with RestTimePicker.css (--rtd-item-h / --rtd-width). */
const ITEM_HEIGHT = 44
const DEFAULT_VISIBLE_ITEMS = 5
const LIST_HEIGHT = ITEM_HEIGHT * DEFAULT_VISIBLE_ITEMS

/* picker chrome: 4px padding top/bottom + 1px border top/bottom */
const PICKER_CHROME = 10
const POPOVER_GAP = 8
const POPOVER_WIDTH = 132
const EDGE_MARGIN = 8

/* Sheet mode reserves roughly this much vertical space for the grabber,
   top/bottom padding, and the safe area. Used to derive a matching wheel
   row count from 50vh. */
const SHEET_CHROME = 40

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
 *
 * presentation="popover" (default)
 *   Anchored bubble next to `anchorEl`. Requires a real DOM element for
 *   `anchorEl`, otherwise it renders nothing.
 *
 * presentation="sheet"
 *   Bottom sheet that spans the full viewport width and is half the viewport
 *   tall. `anchorEl` is ignored. The wheel row count is derived from the sheet
 *   height so the band stays centered as the screen changes.
 *
 * Scroll to highlight, tap the highlighted row or press Enter to confirm.
 * Backdrop / Esc / Tab cancels.
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
  presentation = "popover",
}) => {
  const isSheet = presentation === "sheet"

  const values = useMemo(() => {
    const safeStep = Math.max(1, Math.round(step))
    const out = []
    for (let v = Math.ceil(min / safeStep) * safeStep; v <= max; v += safeStep) out.push(v)
    if (out.length === 0) out.push(min)
    return out
  }, [min, max, step])

  const [index, setIndex] = useState(() => nearestIndex(values, value))
  const [pos, setPos] = useState(null)
  // Wheel row count in sheet mode. Must be odd so the centre row is always
  // selectable and the scroll-snap centre lands on an item boundary.
  const [sheetRows, setSheetRows] = useState(DEFAULT_VISIBLE_ITEMS)

  // Sheet mode never waits on popover measurement, so it is ready immediately.
  const ready = isSheet || pos !== null

  const popoverRef = useRef(null)
  const listRef = useRef(null)

  /* ---- derive wheel row count from the sheet height (sheet mode only) ---- */
  useLayoutEffect(() => {
    if (!isSheet) return undefined
    if (typeof window === "undefined") return undefined

    const compute = () => {
      const sheetHeight = window.innerHeight * 0.5
      const usable = Math.max(ITEM_HEIGHT * 3, sheetHeight - SHEET_CHROME)
      const raw = Math.floor(usable / ITEM_HEIGHT)
      // Keep it odd: centre row == selected row.
      let rows = raw % 2 === 1 ? raw : raw - 1
      rows = clamp(rows, 3, 15)
      setSheetRows(rows)
    }

    compute()
    window.addEventListener("resize", compute)
    return () => window.removeEventListener("resize", compute)
  }, [isSheet])

  /* ---- position under the anchor, flipping above when there is no room ----
     Skipped entirely in sheet mode. */
  useLayoutEffect(() => {
    if (isSheet) return undefined
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
  }, [anchorEl, isSheet])

  /* ---- park the list on the initial value (runs once the list exists,
     and again whenever the row count changes so the wheel stays aligned). ---- */
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = index * ITEM_HEIGHT
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sheetRows])

  /* ---- take focus once the list exists ---- */
  useEffect(() => {
    if (ready) listRef.current?.focus({ preventScroll: true })
  }, [ready])

  /* ---- dismiss on outside click (popover mode only — the sheet has a
     backdrop that handles its own click). ---- */
  useEffect(() => {
    if (isSheet) return undefined
    const onPointerDown = (event) => {
      const target = event.target
      if (popoverRef.current?.contains(target)) return
      if (anchorEl?.contains?.(target)) return
      onClose?.()
    }
    document.addEventListener("mousedown", onPointerDown, true)
    document.addEventListener("touchstart", onPointerDown, true)
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true)
      document.removeEventListener("touchstart", onPointerDown, true)
    }
  }, [anchorEl, onClose, isSheet])

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

  if (!ready) return null

  // CSS custom property drives --rtd-list-h / --rtd-pad-h in sheet mode.
  const sheetVars = isSheet ? { "--rtd-rows": String(sheetRows) } : undefined
  const positionStyle = isSheet
    ? sheetVars
    : { left: `${pos.left}px`, top: `${pos.top}px` }

  const picker = (
    <div
      ref={popoverRef}
      className={`rest-time-picker${isSheet ? " rest-time-picker--sheet" : ""}`}
      style={positionStyle}
      onKeyDown={handleKeyDown}
      onClick={isSheet ? (e) => e.stopPropagation() : undefined}
      role={isSheet ? "dialog" : "presentation"}
      aria-modal={isSheet ? "true" : undefined}
      aria-label={isSheet ? ariaLabel : undefined}
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
    </div>
  )

  if (isSheet) {
    return createPortal(
      <div
        className="rest-time-sheet-backdrop"
        role="presentation"
        onClick={onClose}
      >
        {picker}
      </div>,
      document.body,
    )
  }

  return createPortal(picker, document.body)
}