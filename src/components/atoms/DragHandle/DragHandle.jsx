import "./DragHandle.css"
// Grip that reorders a row by pointer drag. Sized and `touch-action`-locked so a
// vertical press on it starts a drag instead of scrolling the page, while the
// rest of the row (and the rest of the modal) still scrolls normally.
//
// The handle is also keyboard-operable: ArrowUp/ArrowDown move the row one step
// and fire the handed-in `onNudge`, which is the same action the drag commits to.
export const DragHandle = ({ onNudge, disabled = false, label, ...handleProps }) => {
  // Pull `className` out of the spread so it can't overwrite the base class.
  const { className: extraClass, ...spreadProps } = handleProps
  const mergedClass = ["drag-handle", extraClass].filter(Boolean).join(" ")

  return (
    <button
      type="button"
      className={mergedClass}
      data-drag-handle=""
      aria-label={label}
      disabled={disabled}
      {...spreadProps}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault()
          onNudge?.(-1)
        } else if (event.key === "ArrowDown") {
          event.preventDefault()
          onNudge?.(1)
        }
      }}
    >
      <span className="drag-handle-grip" aria-hidden="true" />
    </button>
  )
}