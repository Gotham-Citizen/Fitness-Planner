/**
 * PageCarousel — story-style swipeable pages with dot indicators.
 *
 * Pure CSS scroll-snap paging (no libraries): touch devices swipe natively
 * and also get stories-style edge taps (tap the outer quarter of the track
 * to page), hover-capable devices get Instagram-post-style chevrons on the
 * frame edges, and the dots underneath work everywhere. One child = one
 * page; `Children.toArray` drops null/boolean holes, so a conditional page
 * collapses the carousel to a static single page (no dots, chevrons, or
 * scrolling). The active dot is driven solely by the scroll position, so
 * gesture and programmatic paging share one source of truth.
 */
import { Children, useCallback, useEffect, useRef, useState } from "react"

import "./PageCarousel.css"

// Constants
// Pointer travel (px) below which a touch release counts as a tap, not a swipe.
const TAP_SLOP_PX = 10
// Outer fraction of the track width where a tap pages backwards/forwards.
const EDGE_TAP_FRACTION = 0.25

// Outline stroke chevron (16x16 in a 24x24 box, stroke=currentColor) matching
// the TabIcon aesthetic in MobileTabBar.jsx.
const ChevronIcon = ({ dir }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "prev"
        ? <path d="M14.5 5.5 8 12l6.5 6.5" />
        : <path d="M9.5 5.5 16 12l-6.5 6.5" />}
    </svg>
  )
}

// pageLabels — per-dot aria labels (falls back to "n / count").
// pageTitles — optional per-page heading pinned at the top of the card.
export const PageCarousel = ({
  children,
  className = "",
  ariaLabel,
  pageLabels = [],
  pageTitles = [],
  prevLabel = "Previous",
  nextLabel = "Next",
}) => {
  // State — active page index; updated only from scroll position.
  const [activeIndex, setActiveIndex] = useState(0)

  // Params — scroller element, pending scroll-sync frame, last touch point.
  const trackRef = useRef(null)
  const rafRef = useRef(0)
  const tapRef = useRef({ x: 0, y: 0 })

  // Values — real pages only (null/false children drop out).
  const pages = Children.toArray(children)
  const pageCount = pages.length
  const multi = pageCount > 1
  const regionProps = multi
    ? { role: "region", "aria-roledescription": "carousel", "aria-label": ariaLabel }
    : {}

  // Hooks — nearest-page tracking off scroll events, rAF-throttled.
  const handleScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const track = trackRef.current
      if (!track || !track.clientWidth) return
      const next = Math.max(0, Math.min(pageCount - 1, Math.round(track.scrollLeft / track.clientWidth)))
      setActiveIndex((prev) => (prev === next ? prev : next))
    })
  }, [pageCount])

  const goTo = useCallback(
    (index) => {
      const track = trackRef.current
      if (!track || !track.clientWidth) return
      const clamped = Math.max(0, Math.min(pageCount - 1, index))
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      track.scrollTo({ left: clamped * track.clientWidth, behavior: reduce ? "auto" : "smooth" })
    },
    [pageCount],
  )

  const step = useCallback((delta) => goTo(activeIndex + delta), [activeIndex, goTo])

  // Actions — stories-style edge taps (touch only): a tap — not a swipe —
  // in the outer quarter of the track pages prev/next.
  const handlePointerDown = (e) => {
    tapRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e) => {
    if (e.pointerType !== "touch" || !multi) return
    const moved = Math.abs(e.clientX - tapRef.current.x) + Math.abs(e.clientY - tapRef.current.y)
    if (moved > TAP_SLOP_PX) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (ratio < EDGE_TAP_FRACTION) step(-1)
    else if (ratio > 1 - EDGE_TAP_FRACTION) step(1)
  }

  // Actions — keyboard paging while the track is focused.
  const handleKeyDown = (e) => {
    if (!multi) return
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      step(-1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      step(1)
    }
  }

  const dotLabel = (i) => pageLabels[i] || `${i + 1} / ${pageCount}`

  // External sync — cancel any pending scroll-sync frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className={`page-carousel ${className}`.trim()} {...regionProps}>
      <div className="page-carousel-frame">
        <div
          ref={trackRef}
          className="page-carousel-track"
          tabIndex={multi ? 0 : undefined}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          {pages.map((page, i) => (
            <div className="page-carousel-page" key={i}>
              {pageTitles[i] && (
                <h3 className="page-carousel-page-title">{pageTitles[i]}</h3>
              )}
              <div className="page-carousel-page-body">{page}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="page-carousel-chevron is-prev"
          aria-label={prevLabel}
          onClick={() => step(-1)}
          disabled={!multi || activeIndex === 0}
        >
          <ChevronIcon dir="prev" />
        </button>
        <button
          type="button"
          className="page-carousel-chevron is-next"
          aria-label={nextLabel}
          onClick={() => step(1)}
          disabled={!multi || activeIndex === pageCount - 1}
        >
          <ChevronIcon dir="next" />
        </button>
      </div>
      {multi && (
        <div className="page-carousel-dots">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`page-carousel-dot${i === activeIndex ? " is-active" : ""}`}
              aria-label={dotLabel(i)}
              aria-current={i === activeIndex ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
