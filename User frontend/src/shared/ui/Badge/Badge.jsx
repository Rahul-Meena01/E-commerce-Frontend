export function Badge({ children, className = "", tone = "neutral" }) {
  return (
    <span className={`ds-badge ds-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
