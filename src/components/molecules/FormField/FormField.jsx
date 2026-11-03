import "./FormField.css";

/**
 * FormField molecule — combines a TextInput with a label and optional error message.
 * Usage:
 *   <FormField label="Username" error={errors.username}>
 *     <TextInput placeholder="Enter username" />
 *   </FormField>
 *
 * Or with inline input:
 *   <FormField label="Password" error={errors.password} type="password">
 *     <TextInput placeholder="Enter password" />
 *   </FormField>
 */
export const FormField = ({
  label,
  error,
  children,
  ...rest
}) => {
  return (
    <div className="form-field" {...rest}>
      {label && <label className="form-field-label">{label}</label>}
      {children}
      {error && <p className="form-field-error">{error}</p>}
    </div>
  );
};

FormField.displayName = "FormField";