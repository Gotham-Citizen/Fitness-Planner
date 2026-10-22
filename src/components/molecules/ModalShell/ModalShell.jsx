import { Button } from "../../atoms/index.js"

/**
 * Shared modal shell: overlay + dialog + header (title + icon close) +
 * body + footer. `bodyAs`/`bodyProps` cover the form-body case
 * (CustomExerciseForm); `footerInsideBody` keeps submit footers inside it.
 */
export const ModalShell = ({
  dialogClassName,
  label,
  title,
  titleAs: Title = "span",
  titleClassName = "modal-title",
  onClose,
  closeLabel,
  bodyAs: Body = "div",
  bodyClassName = "modal-body",
  bodyProps,
  footerClassName = "modal-footer",
  footer,
  footerInsideBody = false,
  children,
}) => {
  const footerNode = footer ? <div className={footerClassName}>{footer}</div> : null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={dialogClassName ? `modal ${dialogClassName}` : "modal"}
        role="dialog"
        aria-modal="true"
        {...(label ? { "aria-label": label } : {})}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <Title className={titleClassName}>{title}</Title>
          <Button variant="icon" onClick={onClose} aria-label={closeLabel}>
            ✕
          </Button>
        </div>
        <Body className={bodyClassName} {...bodyProps}>
          {children}
          {footerInsideBody ? footerNode : null}
        </Body>
        {footerInsideBody ? null : footerNode}
      </div>
    </div>
  )
}
