import { createPortal } from "react-dom"

import { useTranslation } from "react-i18next"

import "./ConfirmDialog.css"

import { Button } from "../../atoms/index.js"
import { ModalShell } from "../ModalShell/ModalShell.jsx"

/**
 * Themed confirmation dialog for destructive actions. Uses ModalShell so the
 * overlay, surface, borders and focus behavior follow the active theme.
 */
export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation()
  const dismissLabel = cancelLabel ?? t("lists.cancel")
  const handleCancel = () => {
    if (!busy) onCancel()
  }
  const heading = (
    <>
      <span className="confirm-dialog-icon" aria-hidden="true">⚠</span>
      {title}
    </>
  )

  // Portal to the body so the overlay can never be clipped or positioned
  // relative to an ancestor. The marker makes the themed dialog easy to find
  // in DevTools when verifying it replaced the old native prompt.
  return createPortal(
    <div data-confirm-dialog="true">
      <ModalShell
        dialogClassName="confirm-dialog"
        label={title}
        title={heading}
        titleAs="h3"
        onClose={handleCancel}
        closeLabel={dismissLabel}
        footer={(
          <>
            <Button variant="ghost" onClick={handleCancel} disabled={busy}>
              {dismissLabel}
            </Button>
            <Button tone="danger" onClick={onConfirm} disabled={busy}>
              {confirmLabel ?? t("weighins.delete")}
            </Button>
          </>
        )}
      >
        <p className="confirm-dialog-message">{message}</p>
      </ModalShell>
    </div>,
    document.body,
  )
}
