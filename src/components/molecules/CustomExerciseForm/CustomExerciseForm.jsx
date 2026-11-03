import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { uploadExerciseGif } from "../../../lib/api.js"
import { localizedCategory, localizedEquipment, localizedTarget } from "../../../lib/muscles.js"

import "./CustomExerciseForm.css"

import { Button, TextInput } from "../../atoms/index.js"
import { GifPicker } from "../GifPicker/GifPicker.jsx"
import { ModalShell } from "../ModalShell/ModalShell.jsx"
import { OptionPickerSheet } from "../OptionPickerSheet/OptionPickerSheet.jsx"

// Which picker sheet is open, if any.
const PICKERS = {
  BODY_PART: "body-part",
  MUSCLE: "muscle",
  EQUIPMENT: "equipment",
}

// Optional GIF link must be an absolute http(s) URL (relative media paths are
// reserved for the seeded library).
const GIF_URL_RE = /^https?:\/\/\S+$/i

export const CustomExerciseForm = ({ hierarchy, equipments, onCreate, onClose }) => {
  const { t, i18n } = useTranslation()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [target, setTarget] = useState("")
  const [equipment, setEquipment] = useState("")
  // Instructions are built step by step; one empty row is always available.
  const [steps, setSteps] = useState([""])
  const [gifUrl, setGifUrl] = useState("")
  const [gifFile, setGifFile] = useState(null)
  const [picker, setPicker] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const targets = useMemo(() => {
    const part = (hierarchy || []).find((p) => p.name === category)
    return part ? part.targets : []
  }, [hierarchy, category])

  const categoryOptions = useMemo(
    () => (hierarchy || []).map((p) => ({ value: p.name, label: localizedCategory(p.name) })),
    [hierarchy],
  )

  const targetOptions = useMemo(
    () => targets.map((tg) => ({ value: tg.name, label: localizedTarget(tg.name) })),
    [targets],
  )

  const equipmentOptions = useMemo(
    () => [
      { value: "", label: t("custom.bwDefault") },
      ...(equipments || [])
        .filter((eq) => eq.toLowerCase() !== "body weight")
        .map((eq) => ({ value: eq, label: localizedEquipment(eq) })),
    ],
    [equipments, t],
  )

  const valid = name.trim() !== "" && category !== "" && target !== ""

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid || saving) return
    // Resolve the GIF source first: a chosen file is sent to /api/media and
    // the returned absolute URL wins; otherwise the link as typed is used.
    let resolvedGif = gifUrl.trim()
    if (gifFile) {
      try {
        setSaving(true)
        setError(null)
        const { url: uploadedUrl } = await uploadExerciseGif(gifFile)
        resolvedGif = uploadedUrl
      } catch (err) {
        setSaving(false)
        setError(err?.message || t("custom.gifUploadFailed"))
        return
      }
    }
    if (resolvedGif && !GIF_URL_RE.test(resolvedGif)) {
      setError(t("custom.gifInvalid"))
      return
    }
    // Recompute step values at submit time (state may lag behind keystrokes);
    // blank rows are dropped and the joined text doubles as the fallback
    // instructions string.
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)
    try {
      setSaving(true)
      setError(null)
      await onCreate({
        name: name.trim(),
        category,
        target,
        equipment: equipment || "body weight",
        gifUrl: resolvedGif || null,
        instructionSteps: cleanSteps,
        instructions: cleanSteps.join("\n"),
        instructionsLang: String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en",
      })
    } catch (err) {
      setError(err?.message || t("custom.failed"))
    } finally {
      setSaving(false)
    }
  }

  const pickCategory = (v) => {
    setCategory(v)
    setTarget("")
  }

  const addStep = () => setSteps((prev) => [...prev, ""])

  const changeStep = (i, value) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)))

  const removeStep = (i) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const categoryLabel = category ? localizedCategory(category) : t("custom.choosePart")
  const targetLabel = target
    ? localizedTarget(target)
    : (category ? t("custom.chooseMuscle") : t("custom.pickPartFirst"))
  const equipmentLabel = equipment ? localizedEquipment(equipment) : t("custom.bwDefault")

  const renderField = (labelText, currentLabel, hasValue, ariaLabel, onOpen, disabled = false) => (
    <label className="auth-label">
      {labelText}
      <button
        type="button"
        className={`custom-exercise-field${hasValue ? " has-value" : ""}`}
        onClick={onOpen}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <span className="custom-exercise-field-value">{currentLabel}</span>
        <span className="custom-exercise-field-chevron" aria-hidden="true">&#9662;</span>
      </button>
    </label>
  )

  return (
    <>
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
              aria-describedby={error ? "custom-exercise-error" : undefined}
              aria-invalid={!!error}
            />
          </label>
          {renderField(t("custom.bodyPart"), categoryLabel, Boolean(category), t("custom.bodyPartAria"), () => setPicker(PICKERS.BODY_PART))}
          {renderField(t("custom.muscle"), targetLabel, Boolean(target), t("custom.muscleAria"), () => setPicker(PICKERS.MUSCLE), !category)}
          {renderField(t("custom.equipment"), equipmentLabel, Boolean(equipment), t("custom.equipmentAria"), () => setPicker(PICKERS.EQUIPMENT))}
          <span id="custom-steps-label" className="auth-label">
            {t("custom.instructions")}
          </span>
          <ol className="custom-exercise-steps" aria-labelledby="custom-steps-label">
            {steps.map((step, i) => (
              <li key={i} className="custom-exercise-step">
                <TextInput
                  className="custom-exercise-step-input"
                  value={step}
                  onChange={(e) => changeStep(i, e.target.value)}
                  placeholder={t("custom.stepPh", { step: i + 1 })}
                  aria-label={t("custom.stepAria", { step: i + 1 })}
                  aria-describedby={error ? "custom-exercise-error" : undefined}
                  aria-invalid={!!error}
                />
                <Button
                  variant="icon"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1 || saving}
                  aria-label={t("custom.removeStepAria", { step: i + 1 })}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ol>
          <Button
            variant="secondary"
            onClick={addStep}
            disabled={saving}
            className="custom-exercise-add-step"
            aria-label={t("custom.addStepAria")}
          >
            {t("custom.addStep")}
          </Button>
          <GifPicker
            url={gifUrl}
            file={gifFile}
            disabled={saving}
            onUrlChange={setGifUrl}
            onFileChange={setGifFile}
          />
          {error && <p id="custom-exercise-error" className="auth-error" role="alert">{error}</p>}
      </ModalShell>
      {picker === PICKERS.BODY_PART && (
        <OptionPickerSheet
          title={t("custom.bodyPart")}
          subtitle={t("custom.choosePart")}
          options={categoryOptions}
          value={category}
          onPick={pickCategory}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === PICKERS.MUSCLE && (
        <OptionPickerSheet
          title={t("custom.muscle")}
          subtitle={t("custom.chooseMuscle")}
          options={targetOptions}
          value={target}
          onPick={setTarget}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === PICKERS.EQUIPMENT && (
        <OptionPickerSheet
          title={t("custom.equipment")}
          subtitle={t("library.subEquipment")}
          options={equipmentOptions}
          value={equipment}
          onPick={setEquipment}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  )
}
