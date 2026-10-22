import "./TextInput.css"
/**
 * Shared text field primitive (atom). Class-preserving wrapper over the
 * global `.text-input` style. `select` elements keep native markup.
 * Forwards `ref` (React 19 prop) or legacy `inputRef` to the underlying node
 * so parents (e.g. PlannerPage) can restore focus across view switches.
 */
export const TextInput = ({ multiline = false, className = "", inputRef = null, ref = null, ...rest }) => {
  const resolvedRef = ref ?? inputRef ?? null
  const cls = ["text-input", className].filter(Boolean).join(" ")
  if (multiline) return <textarea ref={resolvedRef} className={cls} {...rest} />
  return <input ref={resolvedRef} className={cls} {...rest} />
}
