import { useEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { exerciseName, mediaUrl } from "../../../lib/muscles.js"

import "./SavePanel.css"

import { Button, TextInput } from "../../atoms/index.js"
import { ModalShell } from "../ModalShell/ModalShell.jsx"

const RenameConfirm = ({ inline, pendingRename, busy, renaming, resolving, confirmRef, onConfirm, onDecline, t }) => {
  return (
    <div className={inline ? "rename-confirm rename-confirm-inline" : "rename-confirm"} role="alert">
      <p>
        {t("save.wantRename", { from: pendingRename.existing.name, to: pendingRename.proposed })}
      </p>
      <div className="rename-confirm-actions">
        <Button
          ref={confirmRef}
          onClick={onConfirm}
          disabled={busy}
        >
          {renaming ? t("save.renaming") : t("save.yesRenameAdd")}
        </Button>
        <Button
          variant="ghost"
          onClick={onDecline}
          disabled={busy}
        >
          {resolving ? t("save.adding") : t("save.noAddTo", { name: pendingRename.existing.name })}
        </Button>
      </div>
    </div>
  )
}

export const SavePanel = ({ exercise, workoutLists, onAddToList, onCreateList, onRenameList, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [added, setAdded] = useState({})
  const [pendingRename, setPendingRename] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [resolving, setResolving] = useState(false)
  const rowRefs = useRef({})
  const highlightTimer = useRef(null)
  const confirmYesRef = useRef(null)

  const hasLists = workoutLists.length > 0
  const busy = renaming || resolving

  const flashHighlight = (id) => {
    if (!id) return
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600)
  }

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
  }, [])

  // Roll to the matching list when a case-only duplicate is typed.
  useEffect(() => {
    if (!pendingRename) return
    const el = rowRefs.current[pendingRename.existing.id]
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    const t = setTimeout(() => confirmYesRef.current?.focus?.(), 350)
    return () => clearTimeout(t)
  }, [pendingRename])

  const resetCreate = () => {
    setName("")
    setShowCreate(false)
    setPendingRename(null)
  }

  const scrollToRow = (id) => {
    const el = rowRefs.current[id]
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    flashHighlight(id)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    const result = await onCreateList(trimmed)
    // Backwards compatibility: legacy callers returned the new id string.
    if (typeof result === "string") {
      if (result) setAdded((a) => ({ ...a, [result]: true }))
      resetCreate()
      return
    }
    if (result && result.status === "created" && result.list) {
      setAdded((a) => ({ ...a, [result.list.id]: true }))
      resetCreate()
      return
    }
    if (result && result.status === "created" && result.id) {
      setAdded((a) => ({ ...a, [result.id]: true }))
      resetCreate()
      return
    }
    if (result && result.status === "conflict") {
      // Keep the create form open; the question lives on the matching row.
      flashHighlight(result.existing.id)
      setPendingRename({ existing: result.existing, proposed: result.proposed })
      return
    }
    if (result && result.status === "duplicate" && result.existing) {
      // Exact duplicate: auto-add with no question.
      try {
        setResolving(true)
        scrollToRow(result.existing.id)
        await onAddToList(result.existing.id)
        setAdded((a) => ({ ...a, [result.existing.id]: true }))
        resetCreate()
      } finally {
        setResolving(false)
      }
      return
    }
    // error / empty: App already toasted (workouts flow); keep form open for editing.
  }

  const handleConfirmRename = async () => {
    if (!pendingRename || !onRenameList || busy) return
    try {
      setRenaming(true)
      const updated = await onRenameList(pendingRename.existing.id, pendingRename.proposed)
      if (updated) {
        await onAddToList(updated.id)
        setAdded((a) => ({ ...a, [updated.id]: true }))
        flashHighlight(updated.id)
        resetCreate()
      } else {
        setPendingRename(null)
      }
    } finally {
      setRenaming(false)
    }
  }

  const handleDeclineRename = async () => {
    if (!pendingRename || busy) return
    try {
      setResolving(true)
      await onAddToList(pendingRename.existing.id)
      setAdded((a) => ({ ...a, [pendingRename.existing.id]: true }))
      flashHighlight(pendingRename.existing.id)
      resetCreate()
    } finally {
      setResolving(false)
    }
  }

  const handleAdd = (listId) => {
    onAddToList(listId)
    setAdded((a) => ({ ...a, [listId]: true }))
  }

  const openCreate = () => {
    setPendingRename(null)
    setShowCreate(true)
  }

  const pendingRowExists =
    pendingRename && workoutLists.some((l) => l.id === pendingRename.existing.id)

  return (
    <ModalShell
      dialogClassName="save-panel"
      title={(
        <>
          {mediaUrl(exercise.image) ? (
            <img src={mediaUrl(exercise.image)} alt="" />
          ) : (
            <span className="save-panel-placeholder" aria-hidden="true">💪</span>
          )}
          <span>{t("save.title", { name: exerciseName(exercise, lang) })}</span>
        </>
      )}
      titleAs="div"
      titleClassName="save-panel-exercise"
      onClose={onClose}
      closeLabel={t("save.close")}
      footer={(
        <Button onClick={onClose}>
          {t("save.done")}
        </Button>
      )}
    >
          {!hasLists && !showCreate && (
            <div className="save-empty">
              <p>{t("save.empty")}</p>
              <Button onClick={openCreate}>
                {t("save.newList")}
              </Button>
            </div>
          )}

          {hasLists && (
            <div className="save-lists">
              <h3 className="save-section-title">{t("save.yourLists")}</h3>
              <ul className="save-list-rows">
                {workoutLists.map((list) => (
                  <li
                    key={list.id}
                    ref={(el) => {
                      if (el) rowRefs.current[list.id] = el
                      else delete rowRefs.current[list.id]
                    }}
                    className={highlightId === list.id ? "save-list-row is-highlight" : "save-list-row"}
                  >
                    <div className="save-list-row-main">
                      <div className="save-list-info">
                        <span className="save-list-name">{list.name}</span>
                        <span className="save-list-count">{t("save.exerciseCount", { count: list.exercises.length })}</span>
                      </div>
                      {added[list.id] || list.exercises.some((ex) => ex.id === exercise.id) ? (
                        <span className="added-badge">{t("save.added")}</span>
                      ) : (
                        <button type="button" className="add-button" onClick={() => handleAdd(list.id)}>
                          {t("save.add")}
                        </button>
                      )}
                    </div>
                    {pendingRename && pendingRename.existing.id === list.id && (
                      <RenameConfirm
                        inline
                        pendingRename={pendingRename}
                        busy={busy}
                        renaming={renaming}
                        resolving={resolving}
                        confirmRef={confirmYesRef}
                        onConfirm={handleConfirmRename}
                        onDecline={handleDeclineRename}
                        t={t}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="save-create">
            {showCreate ? (
              <form className="create-list-form" onSubmit={handleCreate}>
                <TextInput
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("save.listNamePh")}
                  aria-label={t("save.listNameAria")}
                />
                <Button type="submit" disabled={!name.trim() || busy}>
                  {resolving ? t("save.adding") : t("save.createAdd")}
                </Button>
                <Button variant="ghost" onClick={resetCreate} disabled={busy}>
                  {t("save.cancel")}
                </Button>
              </form>
            ) : (
              <Button variant="secondary" onClick={openCreate}>
                {t("save.newListFull")}
              </Button>
            )}
            {pendingRename && !pendingRowExists && (
              <RenameConfirm
                pendingRename={pendingRename}
                busy={busy}
                renaming={renaming}
                resolving={resolving}
                confirmRef={confirmYesRef}
                onConfirm={handleConfirmRename}
                onDecline={handleDeclineRename}
                t={t}
              />
            )}
          </div>
    </ModalShell>
  )
}
