// Client-side form validation. (server/validate.js carries the
// untrimmed variant used at the API boundary.)

export const isValidEmail = (value) => {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
