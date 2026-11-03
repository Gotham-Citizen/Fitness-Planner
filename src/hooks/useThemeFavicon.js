import { useEffect } from "react"

/**
 * Keeps the browser tab icon in step with the active color theme. The favicon
 * is a <link> in index.html that lives outside React's tree, so this effect
 * rewrites its href with a data-URI SVG built from the theme's resolved logo
 * colors (--logo-disc / --logo-bar / --logo-bar-accent in index.css — the same
 * variables .brand-logo uses). App's theme effect sets data-theme on <html>
 * before this runs, so the variables already resolve to the new palette.
 * public/favicon.svg stays in place as the no-JS / first-paint fallback,
 * colored like the default (Azure/dark) theme.
 */
export const useThemeFavicon = (theme) => {
  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement)
    const disc = rootStyle.getPropertyValue("--logo-disc").trim()
    const bar = rootStyle.getPropertyValue("--logo-bar").trim()
    const barAccent = rootStyle.getPropertyValue("--logo-bar-accent").trim()
    // Variables unresolved (CSS not applied yet) -> leave the static icon.
    if (!disc || !bar || !barAccent) return

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      `<circle cx="16" cy="16" r="15" fill="${disc}"/>` +
      `<rect x="10" y="8" width="4.5" height="16" rx="2.25" fill="${bar}"/>` +
      `<rect x="10" y="8" width="12.5" height="4.5" rx="2.25" fill="${bar}"/>` +
      `<rect x="10" y="14.5" width="9.5" height="4.5" rx="2.25" fill="${barAccent}"/>` +
      "</svg>"

    const link = document.querySelector('link[rel="icon"]')
    if (!link) return
    link.setAttribute("href", `data:image/svg+xml,${encodeURIComponent(svg)}`)
  }, [theme])
}
