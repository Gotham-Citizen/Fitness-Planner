import { useEffect, useRef, useState } from "react"

/**
 * Shared FAB + overlay-drawer mechanics (exercise library, recovery panel).
 * The panel starts folded on every viewport; the FAB's `open()` reveals it
 * as a fixed right-side drawer over a backdrop. On small screens (<=900px)
 * Escape, backdrop click, and swipe-right close it, and background scroll is
 * locked while it is open. `collapse()` folds only the mobile slide-in, so
 * selection flows can keep the desktop drawer open.
 */
export const usePanelDrawer = () => {
  // Panel visibility: folded (closed) by default on all viewports,
  // just like on mobile — the FAB opens it on demand.
  const [panelOpen, setPanelOpen] = useState(false)
  // Mobile drawer: controls the slide-in animation on <=900px.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSmall, setIsSmall] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 900px)").matches
      : false,
  )

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined
    const mq = window.matchMedia("(max-width: 900px)")
    const onChange = (e) => {
      setIsSmall(e.matches)
      if (!e.matches) {
        setDrawerOpen(false)
      } else {
        setPanelOpen(false)
      }
    }
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    }
    // Safari < 14 fallback
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])

  // Lock background scroll while the drawer covers a small screen.
  useEffect(() => {
    if (!isSmall || !drawerOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [isSmall, drawerOpen])

  // Escape closes the drawer.
  useEffect(() => {
    if (!isSmall || !drawerOpen) return undefined
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDrawerOpen(false)
        setPanelOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isSmall, drawerOpen])

  const touchStartRef = useRef(null)

  const open = () => {
    setPanelOpen(true)
    setDrawerOpen(true)
  }

  const close = () => {
    setPanelOpen(false)
    setDrawerOpen(false)
  }

  const collapse = () => {
    setDrawerOpen(false)
  }

  // Swipe-right on the drawer folds it back (small screens only).
  const onTouchStart = (e) => {
    const touch = e.touches?.[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (e) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const touch = e.changedTouches?.[0]
    if (!touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      setDrawerOpen(false)
      setPanelOpen(false)
    }
  }

  return { panelOpen, drawerOpen, isSmall, open, close, collapse, onTouchStart, onTouchEnd }
}
