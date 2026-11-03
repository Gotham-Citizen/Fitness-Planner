import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * Remembers the `.app-main` scroll offset per app view and re-applies it when
 * that view becomes active again. Every template renders its own `.app-main`
 * scroll container, so switching views always remounts at the top — this hook
 * restores positions for flows like workout history → session summary → back.
 *
 * `viewKey` should identify the content shown, not just the route: App passes
 * the view, plus the session id for history summaries, so two different
 * summaries don't share one scroll slot.
 */
export const useViewScrollRestore = (viewKey) => {
  const memory = useRef({})
  const viewRef = useRef(viewKey)

  // File incoming scrolls under the live view key.
  useEffect(() => {
    viewRef.current = viewKey
  }, [viewKey])

  // `.app-main` scrolls don't bubble, so listen in capture phase.
  useEffect(() => {
    const onScroll = (e) => {
      const el = e.target
      if (el instanceof Element && el.classList.contains("app-main")) {
        memory.current[viewRef.current] = el.scrollTop
      }
    }
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => document.removeEventListener("scroll", onScroll, { capture: true })
  }, [])

  // Restore after the new template commits, before the browser paints.
  useLayoutEffect(() => {
    const el = document.querySelector(".app-main")
    if (el) el.scrollTop = memory.current[viewKey] ?? 0
  }, [viewKey])
}
