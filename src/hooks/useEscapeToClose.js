import { useEffect, useRef } from "react"

/**
 * Escape-to-close backed by a module-level dismiss stack: every dismissible
 * overlay (bottom sheet, modal, drawer) pushes a token on mount and only the
 * topmost — last mounted — one responds to Escape. Stacked overlays (picker
 * sheet over the custom-exercise modal over the edit-workout modal) then
 * close one layer at a time instead of all at once.
 *
 * `enabled` gates registration (e.g. the drawer only while its slide-in is
 * open). `onClose` is read through a latest-ref, so callback identity churn
 * never reshuffles the stack.
 */
const dismissStack = []

export const useEscapeToClose = (onClose, enabled = true) => {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!enabled) return undefined
    const token = { close: () => onCloseRef.current?.() }
    dismissStack.push(token)
    const onKey = (e) => {
      if (e.key !== "Escape") return
      if (dismissStack[dismissStack.length - 1] !== token) return
      token.close()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      const i = dismissStack.indexOf(token)
      if (i !== -1) dismissStack.splice(i, 1)
    }
  }, [enabled])
}
