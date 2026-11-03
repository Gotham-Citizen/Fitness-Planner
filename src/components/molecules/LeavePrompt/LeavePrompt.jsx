import { useEffect, useRef } from "react"

import { useTranslation } from "react-i18next"

import { Button } from "../../atoms/index.js"

export const LeavePrompt = ({ open, onStay, onLeave }) => {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const stayButtonRef = useRef(null)
  const previousActiveElement = useRef(null)

  useEffect(() => {
    if (!open) return

    previousActiveElement.current = document.activeElement

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onStay()
      }
    }

    const trapFocus = (e) => {
      if (e.key !== "Tab" || !dialogRef.current) return

      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keydown", trapFocus)

    setTimeout(() => {
      stayButtonRef.current?.focus()
    }, 0)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keydown", trapFocus)
      previousActiveElement.current?.focus?.()
    }
  }, [open, onStay])

  if (!open) return null

  return (
    <div className="leave-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-prompt-title" aria-describedby="leave-prompt-message">
      <div className="leave-prompt-content" ref={dialogRef} tabIndex="-1">
        <h3 id="leave-prompt-title" className="leave-prompt-title">
          {t("session.leavePromptTitle", { defaultValue: "Leave Session" })}
        </h3>
        <p id="leave-prompt-message" className="leave-prompt-message">
          {t("session.leavePromptMessage", { defaultValue: "You have an active workout session. Are you sure you want to leave it unfinished?" })}
        </p>
        <div className="leave-prompt-actions">
          <Button ref={stayButtonRef} variant="primary" onClick={onStay}>
            {t("session.stay", { defaultValue: "Stay on Session" })}
          </Button>
          <Button variant="ghost" onClick={onLeave}>
            {t("session.leave", { defaultValue: "Give Up" })}
          </Button>
        </div>
      </div>
    </div>
  )
}