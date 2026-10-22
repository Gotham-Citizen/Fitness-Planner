import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { localizedCategory, localizedEquipment, localizedTarget } from "../../../lib/muscles.js"

import "./CustomExerciseForm.css"

import { Button, TextInput } from "../../atoms/index.js"
import { ModalShell } from "../ModalShell/ModalShell.jsx"

export const CustomExerciseForm = ({ hierarchy, equipments, onCreate, onClose }) => {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [target, setTarget] = useState("")
  const [equipment, setEquipment] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const targets = useMemo(() => {
    const part = (hierarchy || []).find((p) => p.name === category)
    return part ? part.targets : []
  }, [hierarchy, category])

  const valid = name.trim() !== "" && category !== "" && target !== ""

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid || saving) return
    try {
      setSaving(true)
      setError(null)
      await onCreate({ name: name.trim(), category, target, equipment: equipment || "body weight" })
    } catch (err) {
      setError(err?.message || t("custom.failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      dialogClassName="custom-exercise-modal"
      title={t("custom.title")}
      onClose={onClose}
      closeLabel={t("custom.close")}
      bodyAs="form"
      bodyClassName="modal-body custom-exercise-form"
      bodyProps={{ onSubmit: handleSubmit }}
      footerInsideBody
      footerClassName="modal-footer custom-exercise-footer"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("custom.cancel")}
          </Button>
          <Button type="submit" disabled={!valid || saving}>
            {saving ? t("custom.creating") : t("custom.create")}
          </Button>
        </>
      )}
    >
          <label className="auth-label">
            {t("custom.name")}
            <TextInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("custom.namePh")}
              aria-label={t("custom.nameAria")}
            />
          </label>
          <label className="auth-label">
            {t("custom.bodyPart")}
            <select
              className="text-input"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setTarget("")
              }}
              aria-label={t("custom.bodyPartAria")}
            >
              <option value="">{t("custom.choosePart")}</option>
              {(hierarchy || []).map((p) => (
                <option key={p.name} value={p.name}>
                  {localizedCategory(p.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-label">
            {t("custom.muscle")}
            <select
              className="text-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!category}
              aria-label={t("custom.muscleAria")}
            >
              <option value="">{category ? t("custom.chooseMuscle") : t("custom.pickPartFirst")}</option>
              {targets.map((tg) => (
                <option key={tg.name} value={tg.name}>
                  {localizedTarget(tg.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-label">
            {t("custom.equipment")}
            <select
              className="text-input"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              aria-label={t("custom.equipmentAria")}
            >
              <option value="">{t("custom.bwDefault")}</option>
              {(equipments || []).filter((eq) => eq.toLowerCase() !== "body weight").map((eq) => (
                <option key={eq} value={eq}>
                  {localizedEquipment(eq)}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="auth-error">{error}</p>}
    </ModalShell>
  )
}
