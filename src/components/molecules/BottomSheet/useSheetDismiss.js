import { useEffect } from "react"

import { useEscapeToClose } from "../../../hooks/index.js"

/** Escape-to-close + body scroll lock shared by all bottom sheets.
    Escape goes through the shared dismiss stack so a sheet stacked over a
    modal is the only layer that closes on a single press. */
export const useSheetDismiss = (onClose) => {
  useEscapeToClose(onClose)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])
}
