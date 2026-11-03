import { useEffect } from "react"

/**
 * Scroll memory for the app's real scroll container (".app-main" — the
 * window itself never scrolls because ".app" is 100svh with overflow
 * hidden). Opening a movement detail unmounts the page, and every template
 * renders its own ".app-main", so the scroll offset dies with the node.
 * This hook remembers the offset per key and restores it when the page
 * remounts, so lists come back exactly where the user left them.
 *
 * The offset is captured with a passive scroll listener, NOT in the
 * effect cleanup: React runs unmount cleanups after the old ".app-main"
 * is already detached, and a detached node reads scrollTop === 0. The
 * listener always holds the last real value.
 */

// Module-level so offsets survive the unmount/remount round-trip.
const savedOffsets = new Map()

export const useScrollMemory = (key) => {
  useEffect(() => {
    const scroller = document.querySelector(".app-main")
    if (!scroller) return undefined
    const save = () => savedOffsets.set(key, scroller.scrollTop)
    scroller.addEventListener("scroll", save, { passive: true })
    // rAF waits for the remounted list to lay out; the browser clamps
    // the offset if the restored content is shorter than before.
    const restore = requestAnimationFrame(() => {
      scroller.scrollTop = savedOffsets.get(key) ?? 0
    })
    return () => {
      cancelAnimationFrame(restore)
      scroller.removeEventListener("scroll", save)
    }
  }, [key])
}
