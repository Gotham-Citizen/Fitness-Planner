import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { MAX_GIF_BYTES } from "../../../lib/api.js"

import "./GifPicker.css"

import { Button, FieldError } from "../../atoms/index.js"

// Pasted/dropped plain text that looks like an absolute link counts as a URL.
const URL_LIKE_RE = /^https?:\/\//i

// Human-readable upload size for the chosen-file chip.
const formatSize = (bytes) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Dragged links arrive as text/uri-list (one URL per line, # comments) or as
// plain text — only the first http(s) entry counts.
const extractDroppedUrl = (data) => {
  const raw = String(data?.getData?.("text/uri-list") || data?.getData?.("text/plain") || "")
  const first = raw.split(/\r?\n/).find((line) => line.trim() !== "" && !line.trim().startsWith("#"))
  const text = first?.trim() || ""
  return URL_LIKE_RE.test(text) ? text : ""
}

// Copied web images arrive re-encoded (an animated GIF becomes a static PNG
// bitmap), but the clipboard's text/html flavor still carries the original
// <img src> — recovering it keeps the animation alive via the link chip.
const extractPastedImgSrc = (html) => {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html")
  return (doc.querySelector("img")?.getAttribute("src") || "").trim()
}

/**
 * Controlled GIF source picker for the custom-exercise form, styled after
 * PhotoRoom/remove.bg's upload box: one dashed dropzone div where you can
 * drag & drop a GIF file, drop or paste a GIF link (Ctrl+V is captured
 * page-wide while the form is open — pastes aimed at editable fields are
 * left alone), or click anywhere in the div to pick a file. A pasted or
 * dropped link becomes a URL chip inside the zone. File and URL are
 * mutually exclusive; the parent owns url/file and performs the actual
 * upload on submit — see CustomExerciseForm.
 */
export const GifPicker = ({ url, file, disabled = false, onUrlChange, onFileChange }) => {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const [pickError, setPickError] = useState(null)
  const [pastedHint, setPastedHint] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // URL whose preview failed to load — reshowing the same URL stays hidden.
  const [erroredUrl, setErroredUrl] = useState("")

  // Object URL for the chosen file preview; the cleanup revokes the previous
  // URL whenever the file changes (and on unmount).
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const trimmedUrl = url.trim()
  const showUrlPreview = trimmedUrl !== "" && trimmedUrl !== erroredUrl

  // Shared gate for every way a file can arrive (picker, drop, paste).
  const acceptFile = useCallback((picked) => {
    if (picked.type !== "image/gif") {
      setPickError(t("custom.gifWrongType"))
      return
    }
    if (picked.size > MAX_GIF_BYTES) {
      setPickError(t("custom.gifTooLarge"))
      return
    }
    setPickError(null)
    onUrlChange("")
    onFileChange(picked)
  }, [t, onUrlChange, onFileChange])

  // Links arrive by page-wide paste or drop — both funnel through here so
  // the chip and hints stay in sync. File and URL are mutually exclusive.
  const applyUrl = useCallback((next) => {
    setPickError(null)
    onFileChange(null)
    onUrlChange(next)
  }, [onFileChange, onUrlChange])

  // Page-wide Ctrl+V capture (external clipboard events, removed on unmount
  // and inert while saving). Text pastes aimed at editable elements (the
  // exercise name input) are theirs to handle — image-only pastes are ours
  // even there, since a text field cannot use them. A clipboard GIF becomes
  // the chosen file; a re-encoded pasted image (copied web GIFs arrive as
  // PNG) falls back to its source URL from the text/html flavor, or explains
  // why it cannot be used.
  useEffect(() => {
    if (disabled) return undefined
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const image = items.find((it) => it.type.startsWith("image/"))
      const target = e.target
      const editable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      if (editable && ((e.clipboardData?.getData?.("text") || "").trim() || !image)) return
      if (image) {
        e.preventDefault()
        const asFile = image.getAsFile()
        if (asFile && asFile.type === "image/gif") {
          setPastedHint(true)
          acceptFile(asFile)
          return
        }
        const src = extractPastedImgSrc(e.clipboardData?.getData?.("text/html"))
        if (src && URL_LIKE_RE.test(src)) {
          setPastedHint(true)
          applyUrl(src)
          return
        }
        const kind = (asFile?.type || image.type || "").replace(/^image\//, "").toUpperCase()
        setPickError(t("custom.gifNotGif", { type: kind || "image" }))
        return
      }
      const text = (e.clipboardData?.getData?.("text") || "").trim()
      if (text && URL_LIKE_RE.test(text)) {
        e.preventDefault()
        setPastedHint(true)
        applyUrl(text)
      }
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [disabled, acceptFile, applyUrl, t])

  const openPicker = () => {
    if (!disabled) fileInputRef.current?.click()
  }

  const handleFilePick = (e) => {
    const picked = e.target.files?.[0] ?? null
    e.target.value = "" // allow re-picking the same file
    if (picked) acceptFile(picked)
  }

  const removeFile = (e) => {
    e?.stopPropagation?.() // the chip lives inside the clickable dropzone
    setPickError(null)
    setPastedHint(false)
    onFileChange(null)
  }

  const removeUrl = (e) => {
    e?.stopPropagation?.() // the chip lives inside the clickable dropzone
    setPickError(null)
    setPastedHint(false)
    setErroredUrl("")
    onUrlChange("")
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = (e) => {
    // Child elements fire dragleave too — only reset when truly leaving.
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) {
      acceptFile(dropped)
      return
    }
    // No file — a dragged link/image URL becomes the URL (PhotoRoom-style).
    const text = extractDroppedUrl(e.dataTransfer)
    if (text) applyUrl(text)
  }

  return (
    <div className="gif-picker">
      <span className="auth-label">{t("custom.gif")}</span>
      {/* Hidden input sits outside the dropzone so its programmatic click
          never bubbles back into the zone's own onClick. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/gif"
        className="gif-file-input"
        tabIndex={-1}
        aria-label={t("custom.gifChooseAria")}
        onChange={handleFilePick}
        disabled={disabled}
      />
      <div
        className={`gif-dropzone${dragOver ? " is-dragover" : ""}`}
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="gif-file-chip">
            {previewUrl ? <img className="gif-chip-thumb" src={previewUrl} alt="" /> : null}
            <span className="gif-file-meta">
              <span className="gif-file-name">{file.name}</span>
              <span className="gif-file-size">{formatSize(file.size)}</span>
            </span>
            <Button variant="ghost" className="gif-remove-btn" onClick={removeFile} disabled={disabled}>
              {t("custom.gifRemove")}
            </Button>
          </div>
        ) : trimmedUrl !== "" ? (
          <div className="gif-file-chip gif-url-chip">
            {showUrlPreview ? (
              <img
                className="gif-chip-thumb"
                src={trimmedUrl}
                alt=""
                onError={() => setErroredUrl(trimmedUrl)}
              />
            ) : (
              <svg className="gif-url-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 8.9h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1s1.39-3.1 3.1-3.1z"
                  fill="currentColor"
                />
              </svg>
            )}
            <span className="gif-file-meta">
              <span className="gif-file-name">{trimmedUrl}</span>
            </span>
            <Button variant="ghost" className="gif-remove-btn" onClick={removeUrl} disabled={disabled}>
              {t("custom.gifRemove")}
            </Button>
          </div>
        ) : (
          <>
            <svg className="gif-dropzone-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" />
              <path
                d="m5.5 16.5 4-4.5 3.5 4 2.5-2.5 3.5 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <span className="gif-dropzone-title">{t("custom.gifDrop")}</span>
            <span className="gif-dropzone-sub">{t("custom.gifDropHint")}</span>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                openPicker()
              }}
              disabled={disabled}
            >
              {t("custom.gifChoose")}
            </Button>
          </>
        )}
      </div>
      {pastedHint ? <p className="gif-hint gif-pasted">{t("custom.gifPasted")}</p> : null}
      <FieldError error={pickError} />
      {showUrlPreview ? (
        <img className="gif-preview" src={trimmedUrl} alt="" onError={() => setErroredUrl(trimmedUrl)} />
      ) : null}
      {trimmedUrl !== "" && !showUrlPreview ? (
        <p className="gif-hint">{t("custom.gifPreviewFail")}</p>
      ) : null}
    </div>
  )
}
