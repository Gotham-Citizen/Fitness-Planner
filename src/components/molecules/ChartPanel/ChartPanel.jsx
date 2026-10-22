/** Accessible chart container (`.chart` + role=img label) wrapping a chart. */
export const ChartPanel = ({ ariaLabel, children }) => {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
