import { useState } from "react"

import { useTranslation } from "react-i18next"

import "./EditWorkoutHeader.css"

import { Button, TextInput } from "../../atoms/index.js"
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog.jsx"

export const EditWorkoutHeader = ({ list, onClose, onRename }) => {
  const { t } = useTranslation()
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [pendingConflict, setPendingConflict] = useState(null)

  const startRename = () => {
    setNameDraft(list.name)
    setPendingConflict(null)
    setRenaming(true)
  }

  const cancelRename = () => {
    setRenaming(false)
    setNameDraft("")
    setPendingConflict(null)
  }

  const commitRename = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || !onRename || busy) return
    if (trimmed === list.name) {
      cancelRename()
      return
    }
    setBusy(true)
    try {
      const result = await onRename(list.id, trimmed, {
        checkConflict: true,
        ignoreId: list.id,
      })
      if (result?.status === "conflict") {
        setPendingConflict(result)
        return
      }
      if (result) cancelRename()
    } finally {
      setBusy(false)
    }
  }

  const confirmConflict = async () => {
    const pending = pendingConflict
    if (!pending || !onRename || busy) return
    setBusy(true)
    try {
      const updated = await onRename(list.id, pending.proposed)
      if (updated) cancelRename()
      else setPendingConflict(null)
    } finally {
      setBusy(false)
    }
  }

  const handleNameKeyDown = (event) => {
    if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return
    if (event.key === "Enter") {
      event.preventDefault()
      commitRename()
    } else if (event.key === "Escape") {
      event.preventDefault()
      cancelRename()
    }
  }

  return (
    <header className="edit-workout-header">
      <button
        type="button"
        className="edit-workout-back"
        onClick={onClose}
        aria-label={t("editWorkout.closeEditor")}
      >
        ←
      </button>
      {renaming ? (
        <div className="edit-workout-rename">
          <TextInput
            autoFocus
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={handleNameKeyDown}
            aria-label={t("editWorkout.renameAria")}
          />
          <Button onClick={commitRename} disabled={!nameDraft.trim() || busy}>
            {busy ? t("lists.renaming") : t("editWorkout.saveName")}
          </Button>
          <Button variant="ghost" onClick={cancelRename} disabled={busy}>
            {t("lists.cancel")}
          </Button>
        </div>
      ) : (
        <>
          <h1 id="edit-workout-title" className="edit-workout-title">
            {t("editWorkout.title", { name: list.name })}
          </h1>
          <Button
            variant="ghost"
            onClick={startRename}
            aria-label={t("editWorkout.renameAria")}
          >
            {t("editWorkout.rename")}
          </Button>
        </>
      )}
      {pendingConflict && (
        <ConfirmDialog
          title={t("editWorkout.rename")}
          message={t("lists.wantRename", {
            from: list.name,
            to: pendingConflict.proposed,
          })}
          confirmLabel={busy ? t("lists.renaming") : t("lists.yesRename")}
          cancelLabel={t("lists.keepName", { name: list.name })}
          busy={busy}
          onConfirm={confirmConflict}
          onCancel={() => setPendingConflict(null)}
        />
      )}
    </header>
  )
}
