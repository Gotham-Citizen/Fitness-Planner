import { useCallback, useEffect, useRef, useState } from "react"

// Pointer movement (px) before a press on the grip becomes a drag. Keeps a tap
// on the handle — and a page scroll that happens to begin on it — from moving
// the row by accident.
const DRAG_THRESHOLD = 8

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/**
 * Vertical reordering for a list of rows. Returns the drag state to spread over
 * the list plus a `move(index, offset)` action that both the pointer gesture and
 * a caller's own up/down buttons funnel into, so the two paths can never
 * disagree about the order.
 *
 * Drag model: the DOM order is left untouched while dragging (so row geometry
 * stays stable and `data-drag-index` keeps matching the array), and the rows
 * themselves are translated via CSS — the lifted row follows the pointer and
 * the rows between the origin slot and the destination slot slide by one row
 * height. Only on drop does the caller's array actually change. That keeps a
 * dropped gesture from collapsing a row's height and re-measuring mid-gesture.
 *
 * Why pointer events rather than HTML5 drag: the app is mobile-first (dvh
 * layouts, a MobileTabBar) and `draggable` never fires for touch. One
 * pointerdown/move/up path covers finger, stylus and mouse; the listeners sit on
 * `window` so the gesture survives the pointer leaving the list, and a second
 * finger landing mid-drag cancels it rather than hijacking the row.
 */
export const useDragReorder = ({ items, onDrop, disabled = false }) => {
  // { from, to, dy, rowHeight } while dragging — from is where the row started,
  // to is the slot it is currently over, dy is the pointer offset from the
  // initial press.
  const [drag, setDrag] = useState(null)
  const gestureRef = useRef(null)

  const count = (items || []).length
  const last = count - 1

  // Reorder `items` by moving the row at `index` to `index + offset`, clamped to
  // the list bounds. Used directly by the up/down buttons; the pointer path
  // builds the same array once, on drop.
  const move = useCallback(
    (index, offset) => {
      if (disabled) return null
      const source = items || []
      const target = clamp(index + offset, 0, source.length - 1)
      if (index < 0 || index >= source.length || target === index) return null
      const next = source.slice()
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row)
      onDrop?.(next)
      return next
    },
    [disabled, items, onDrop],
  )

  const onPointerDown = useCallback(
    (event) => {
      if (disabled) return
      if (event.button != null && event.button !== 0) return
      const row = event.currentTarget.closest("[data-drag-index]")
      const index = Number(row?.dataset.dragIndex)
      if (!Number.isInteger(index) || index < 0 || index >= count) return
      gestureRef.current = {
        pointerId: event.pointerId,
        from: index,
        to: index,
        startY: event.clientY,
        startX: event.clientX,
        rowHeight: row.getBoundingClientRect().height,
        armed: false,
      }
    },
    [count, disabled],
  )

  useEffect(() => {
    if (disabled) return undefined
    const onPointerMove = (event) => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId) return
      const dy = event.clientY - gesture.startY
      const dx = event.clientX - gesture.startX
      if (!gesture.armed) {
        if (Math.abs(dy) < DRAG_THRESHOLD && Math.abs(dx) < DRAG_THRESHOLD) return
        gesture.armed = true
      }
      if (!gesture.rowHeight) return
      // Track the destination on the ref as well as in state: `commit` reads it
      // on pointerup without depending on whether the last move has rendered.
      gesture.to = clamp(gesture.from + Math.round(dy / gesture.rowHeight), 0, last)
      setDrag({
        from: gesture.from,
        to: gesture.to,
        dy,
        rowHeight: gesture.rowHeight,
      })
    }

    const commit = (event) => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId) return
      gestureRef.current = null
      const next = gesture.armed && gesture.to !== gesture.from
        ? reordered(items || [], gesture.from, gesture.to)
        : null
      setDrag(null)
      if (next) onDrop?.(next)
    }

    // Abandoned gestures commit nothing. On touch the row is scrollable, so the
    // browser often cancels the pointer once it decides you meant to scroll —
    // committing there would reorder the list as a side effect of scrolling.
    const abandon = (event) => {
      const gesture = gestureRef.current
      if (!gesture || gesture.pointerId !== event.pointerId) return
      gestureRef.current = null
      setDrag(null)
    }

    const onPointerDownCapture = (event) => {
      // Multi-touch: a second finger landing mid-drag must not hijack the row.
      const gesture = gestureRef.current
      if (gesture && gesture.pointerId !== event.pointerId) gestureRef.current = null
    }

    window.addEventListener("pointerdown", onPointerDownCapture, true)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", commit)
    window.addEventListener("pointercancel", abandon)
    return () => {
      window.removeEventListener("pointerdown", onPointerDownCapture, true)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", commit)
      window.removeEventListener("pointercancel", abandon)
    }
  }, [disabled, items, last, onDrop])

  // Offset (px) a row at `index` should be translated by during a drag.
  // Empty when idle, so rows render with no transform at rest.
  const offsetFor = useCallback(
    (index) => {
      if (!drag || drag.from === drag.to) return index === drag?.from ? drag.dy : 0
      const goingDown = drag.to > drag.from
      // The lifted row alone, following the pointer.
      if (index === drag.from) return drag.dy
      // Rows between the origin and destination slide out of the way by
      // exactly one row height, away from the direction of travel.
      const between = goingDown ? index > drag.from && index <= drag.to : index >= drag.to && index < drag.from
      return between ? (goingDown ? -drag.rowHeight : drag.rowHeight) : 0
    },
    [drag],
  )

  return {
    drag,
    isDragging: drag !== null,
    liftedIndex: drag ? drag.from : null,
    offsetFor,
    handleProps: disabled ? {} : { onPointerDown },
    move,
  }
}

// Same splice-and-reinsert as `move`, for the pointer path's committed order.
const reordered = (source, from, to) => {
  const next = source.slice()
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row)
  return next
}
