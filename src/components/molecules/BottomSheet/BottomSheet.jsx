import { useSheetDismiss } from "./useSheetDismiss.js"

/**
 * Shared bottom-sheet shell: overlay + sheet + grab handle.
 * Runs useSheetDismiss internally so callers only pass content.
 */
export const BottomSheet = ({ label, onClose, children }) => {
  useSheetDismiss(onClose)
  return (
    <div className="sheet-overlay rir-sheet-overlay" onClick={onClose}>
      <div
        className="sheet rir-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grab" aria-hidden="true"></div>
        {children}
      </div>
    </div>
  )
}
