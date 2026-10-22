import { useEffect, useRef, useState } from "react"

import "./SearchBar.css"

import { Button, TextInput } from "../../atoms/index.js"


/**
 * Planner search row (molecule): search input + clear button.
 * `onChange` / `onClear` follow the existing value-based protocol.
 *
 * IME-safe: while a composition session is active (e.g. pinyin input for
 * Chinese), keystrokes update only the local draft — propagating them would
 * re-render (and, on the first character, unmount/remount this input via the
 * home→planner / results-list switch), killing the composition and leaving
 * fragments like "j uanfu". The committed text is sent on compositionend.
 */
export const SearchBar = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  onClear,
  clearLabel,
  showClear = true,
  autoFocus = false,
  barClassName = "",
  inputRef = null,
}) => {
  const [draft, setDraft] = useState(value)
  const composingRef = useRef(false)

  // Follow external resets (clear button, view switches) when not composing.
  useEffect(() => {
    if (!composingRef.current) setDraft(value)
  }, [value])

  return (
    <div className={["planner-search", barClassName].filter(Boolean).join(" ")}>
      <TextInput
        type="text"
        className="planner-search-input"
        inputRef={inputRef}
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          if (!composingRef.current && !e.nativeEvent?.isComposing) onChange?.(v)
        }}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false
          const v = e.target.value
          setDraft(v)
          onChange?.(v)
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
      />
      {showClear && (
        <Button variant="ghost" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </div>
  )
}
