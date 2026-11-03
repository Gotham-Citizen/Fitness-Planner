import "./Skeleton.css"

/**
 * Skeleton atom — shimmer placeholders used while content loads.
 * Placeholder sizes correspond to typical UI element dimensions.
 *
 * Usage:
 *   <Skeleton type="avatar" />
 *   <Skeleton type="text" lines={3} />
 *   <Skeleton type="textSmall" />
 *   <Skeleton type="bar" />
 */

const VARIANTS = {
  avatar: "skeleton-avatar",
  text: "skeleton-text",
  textSmall: "skeleton-text-small",
  textTiny: "skeleton-text-tiny",
  bar: "skeleton-bar",
}

export const Skeleton = ({ type = "text", lines = 1, ...rest }) => {
  if (type === "row") return null // custom layout handled by parent

  const cls = VARIANTS[type]
  if (!cls) return null

  const count = type === "text" && lines > 1 ? lines : 1
  if (count === 1) {
    return <div className={cls} aria-hidden="true" {...rest} />
  }
  return (
    <div className="skeleton-text-group" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cls} {...rest} />
      ))}
    </div>
  )
}

Skeleton.displayName = "Skeleton"

// Predefined skeleton patterns for common layouts
Skeleton.Avatar = ({ ...rest }) => <Skeleton type="avatar" {...rest} />
Skeleton.Text = ({ lines = 1, ...rest }) => <Skeleton type="text" lines={lines} {...rest} />
Skeleton.Bar = ({ ...rest }) => <Skeleton type="bar" {...rest} />