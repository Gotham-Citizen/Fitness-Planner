import "./Breadcrumbs.css";

/**
 * Breadcrumbs component — shows the navigation path for the current page.
 * Usage:
 *   <Breadcrumbs items={["Home", "Workouts", "Current Workout"]} />
 */

export const Breadcrumbs = ({ items, onItemClick }) => {
  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {onItemClick && index > 0 && !isLast ? (
              <a href="#" onClick={() => onItemClick(item)}>{item}</a>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{item}</span>
            )}
          </span>
        )
      })}
    </nav>
  );
};

Breadcrumbs.displayName = "Breadcrumbs";