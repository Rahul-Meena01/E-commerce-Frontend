import { forwardRef, useId } from "react";

export const Input = forwardRef(function Input(
  { className = "", error, hint, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="ds-field">
      {label && (
        <label className="ds-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`ds-input ${className}`.trim()}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {hint && <span className="ds-field__hint" id={hintId}>{hint}</span>}
      {error && <span className="ds-field__error" id={errorId}>{error}</span>}
    </div>
  );
});
