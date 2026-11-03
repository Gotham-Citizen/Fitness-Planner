import "./ReorderControls.css"

import { Button, DragHandle } from "../../atoms/index.js"

// Reorder controls for one row of a sortable list: a drag grip and the paired
// up/down buttons that move it one step.
//
// The grip's pointer drag is handled by the parent <li> (which owns
// `handleProps` from useDragReorder and carries `data-drag-index`), so the
// grip itself only needs to be a visual target — its `pointerdown` bubbles up
// to the row. The up/down buttons call `onNudge` directly.
export const ReorderControls = ({
  index,
  total,
  onNudge,
  gripLabel,
  upLabel,
  downLabel,
}) => {
  return (
    <div className="reorder-controls">
      <DragHandle
        className="reorder-controls-grip"
        label={gripLabel}
        onNudge={onNudge}
      />
      <span className="reorder-controls-btn" data-move="up">
        <Button
          variant="icon"
          onClick={() => onNudge?.(-1)}
          disabled={index <= 0}
          aria-label={upLabel}
          title={upLabel}
        >
          ↑
        </Button>
      </span>
      <span className="reorder-controls-btn" data-move="down">
        <Button
          variant="icon"
          onClick={() => onNudge?.(1)}
          disabled={index >= total - 1}
          aria-label={downLabel}
          title={downLabel}
        >
          ↓
        </Button>
      </span>
    </div>
  )
}