export const BrandLogo = () => {
  return (
    <svg className="brand-logo" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle className="brand-logo-disc" cx="16" cy="16" r="15" fill="var(--accent)" />
      <rect className="brand-logo-bar" x="10" y="8" width="4.5" height="16" rx="2.25" fill="var(--bg-elev)" />
      <rect className="brand-logo-bar" x="10" y="8" width="12.5" height="4.5" rx="2.25" fill="var(--bg-elev)" />
      <rect className="brand-logo-bar-accent" x="10" y="14.5" width="9.5" height="4.5" rx="2.25" fill="var(--accent-strong)" />
    </svg>
  )
}
