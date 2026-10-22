import { Button } from "../../atoms/index.js"

/**
 * Paired Save/Cancel row (`.account-edit-row`) shared by inline editors.
 * `saving` swaps the save label and locks both buttons; `saveDisabled`
 * adds extra save gating (e.g. invalid input).
 */
export const SaveCancelRow = ({
  saving = false,
  saveDisabled = false,
  onSave,
  onCancel,
  savingLabel,
  saveLabel,
  cancelLabel,
}) => {
  return (
    <div className="account-edit-row">
      <Button
        size="detail-small"
        onClick={onSave}
        disabled={saving || saveDisabled}
      >
        {saving ? savingLabel : saveLabel}
      </Button>
      <Button variant="ghost" size="detail-small" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
    </div>
  )
}
