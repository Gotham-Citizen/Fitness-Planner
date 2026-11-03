import "./Card.css";

/**
 * Card atom — consistent shell with token-based styling.
 * Usage:
 *   <Card>
 *     <h3>Title</h3>
 *     <p>Content</p>
 *   </Card>
 */
export const Card = ({ className, children, ...rest }) => {
  return (
    <div className={`card-shell ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.displayName = "Card";