import { forwardRef, useId } from "react";

export const Select = forwardRef(function Select(
  { children, className = "", error, hint, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="ds-field">
      {label && (
        <label className="ds-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <span className="ds-select-wrap">
        <select
          ref={ref}
          id={selectId}
          className={`ds-select ${className}`.trim()}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
      </span>
      {hint && <span className="ds-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="ds-field__error" id={errorId}>{error}</span>}
    </div>
  );
});
