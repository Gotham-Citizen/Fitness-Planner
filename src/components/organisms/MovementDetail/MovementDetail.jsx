import { useState } from "react"

import { useTranslation } from "react-i18next"

import { exerciseName, localizedCategory, localizedEquipment, localizedMuscleGroup, localizedTarget, mediaUrl } from "../../../lib/muscles.js"

import "./MovementDetail.css"

import { Button, TextInput } from "../../atoms/index.js"


const DIFFICULTY_TAG = {
  1: "movement.difficultyEasy",
  2: "movement.difficultyMedium",
  3: "movement.difficultyHard",
}

export const MovementDetail = ({ exercise, onBack, onSave, saveLabel, onUpdateExercise, onDeleteExercise, lang }) => {
  const { t, i18n } = useTranslation()
  const l = lang || (String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en")
  const name = exerciseName(exercise, l)
  const instrText = exercise.instructions?.[l] || exercise.instructions?.en || ""
  const steps = (exercise.instruction_steps?.[l]?.length ? exercise.instruction_steps[l] : (exercise.instruction_steps?.en?.length ? exercise.instruction_steps.en : []))
  const secondary = exercise.secondary_muscles || []
  const isCustom = typeof exercise.id === "string" && exercise.id.startsWith("custom-")
  const canManage = isCustom && typeof onUpdateExercise === "function" && typeof onDeleteExercise === "function"

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [editingInstr, setEditingInstr] = useState(false)
  const [instrDraft, setInstrDraft] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const openNameEditor = () => {
    setFormError(null)
    setNameDraft(name)
    setEditingName(true)
  }

  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || busy) return
    try {
      setBusy(true)
      setFormError(null)
      await onUpdateExercise(exercise.id, { name: trimmed })
      setEditingName(false)
    } catch (err) {
      setFormError(err?.message || t("movement.failedRename"))
    } finally {
      setBusy(false)
    }
  }

  const openInstrEditor = () => {
    setFormError(null)
    setInstrDraft(instrText)
    setEditingInstr(true)
  }

  const saveInstr = async () => {
    if (busy) return
    try {
      setBusy(true)
      setFormError(null)
      await onUpdateExercise(exercise.id, { instructions: instrDraft, instructionsLang: l })
      setEditingInstr(false)
    } catch (err) {
      setFormError(err?.message || t("movement.failedInstr"))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (busy) return
    try {
      setBusy(true)
      setFormError(null)
      await onDeleteExercise(exercise.id)
    } catch (err) {
      setFormError(err?.message || t("movement.failedDelete"))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="movement-detail">
      <button type="button" className="back-button" onClick={onBack}>
        {t("movement.back")}
      </button>

      <div className="movement-detail-hero">
        <div className="movement-detail-head">
          {editingName ? (
            <div className="detail-edit-row">
              <TextInput
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label={t("movement.nameAria")}
              />
              <Button onClick={saveName} disabled={!nameDraft.trim() || busy}>
                {busy ? t("movement.saving") : t("common.save")}
              </Button>
              <Button variant="ghost" onClick={() => setEditingName(false)} disabled={busy}>
                {t("movement.cancel")}
              </Button>
            </div>
          ) : (
            <h2 className="movement-detail-title">{name}</h2>
          )}
          <p className="movement-detail-cats">
            {localizedCategory(exercise.category)} · {localizedTarget(exercise.target)}
          </p>
          <div className="movement-detail-tags">
            <span className="tag">{localizedEquipment(exercise.equipment)}</span>
            <span className="tag">{t(DIFFICULTY_TAG[exercise.difficulty ?? 2] ?? DIFFICULTY_TAG[2])}</span>
            {isCustom && <span className="tag tag-custom">{t("movement.customTag")}</span>}
            {secondary.length > 0 && <span className="tag">{t("movement.secondary", { list: secondary.map((m) => localizedMuscleGroup(m)).join(", ") })}</span>}
          </div>
        </div>
        <div className="movement-detail-gif-wrap">
          {mediaUrl(exercise.gif_url) ? (
            <img className="movement-detail-gif" src={mediaUrl(exercise.gif_url)} alt={name} />
          ) : (
            <span className="movement-detail-placeholder" aria-hidden="true">💪</span>
          )}
        </div>
      </div>

      <div className="movement-detail-instructions">
        <div className="detail-section-head">
          <h3>{t("movement.howTo")}</h3>
          {canManage && !editingInstr && (
            <Button variant="ghost" size="detail-small" onClick={openInstrEditor}>
              {instrText ? t("movement.editInstr") : t("movement.addInstr")}
            </Button>
          )}
        </div>
        {editingInstr ? (
          <div className="detail-edit-col">
            <TextInput
              multiline
              className="detail-textarea"
              autoFocus
              rows={4}
              value={instrDraft}
              onChange={(e) => setInstrDraft(e.target.value)}
              placeholder={t("movement.instrPh")}
              aria-label={t("movement.instrAria")}
            />
            <div className="detail-edit-row">
              <Button onClick={saveInstr} disabled={busy}>
                {busy ? t("movement.saving") : t("movement.saveInstr")}
              </Button>
              <Button variant="ghost" onClick={() => setEditingInstr(false)} disabled={busy}>
                {t("movement.cancel")}
              </Button>
            </div>
          </div>
        ) : steps.length > 0 ? (
          <ol className="instruction-steps">
            {steps.map((step, i) => (
              <li key={i} className="instruction-step">
                <span className="instruction-step-num">{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        ) : instrText ? (
          <p>{instrText}</p>
        ) : (
          <p className="movement-detail-empty">{isCustom ? t("movement.noInstrCustom") : t("movement.noInstr")}</p>
        )}
      </div>

      {formError && <p className="auth-error">{formError}</p>}

      {canManage && (
        <div className="detail-manage">
          {!editingName && (
            <Button variant="ghost" onClick={openNameEditor}>
              {t("movement.rename")}
            </Button>
          )}
          {confirmDelete ? (
            <div className="rename-confirm" role="alert">
              <p>{t("movement.deleteConfirm", { name })}</p>
              <div className="rename-confirm-actions">
                <Button onClick={handleDelete} disabled={busy}>
                  {busy ? t("movement.deleting") : t("movement.yesDelete")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  {t("movement.keepIt")}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" tone="danger-text" onClick={() => setConfirmDelete(true)}>
              {t("movement.deleteExercise")}
            </Button>
          )}
        </div>
      )}

      <button type="button" className="save-button" onClick={onSave}>
        {saveLabel || t("movement.saveToList")}
      </button>
    </section>
  )
}
