import { useEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import "./BackToTop.css"

// Show the button only after this much scroll, so short pages never see it.
const SHOW_AFTER_PX = 400

/**
 * Floating "back to top" button for the page scroll container (".app-main" —
 * the window itself never scrolls because ".app" is 100svh with overflow
 * hidden; every template renders its own ".app-main", so this atom mounts
 * and unmounts together with its scroller). Hidden until the container
 * scrolls past SHOW_AFTER_PX; click smooth-scrolls back to the top
 * (instant when the user prefers reduced motion).
 */
export const BackToTop = () => {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const scrollerRef = useRef(null)

  useEffect(() => {
    const scroller = document.querySelector(".app-main")
    if (!scroller) return undefined
    scrollerRef.current = scroller
    const onScroll = () => setVisible(scroller.scrollTop > SHOW_AFTER_PX)
    // Sync on attach: a restored scroll offset (see useViewScrollRestore /
    // useScrollMemory) already counts, even before the first scroll event.
    onScroll()
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      scrollerRef.current = null
      scroller.removeEventListener("scroll", onScroll)
    }
  }, [])

  const handleBackToTop = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    scroller.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      className="back-to-top"
      onClick={handleBackToTop}
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
    >
      <span aria-hidden="true">↑</span>
    </button>
  )
}
