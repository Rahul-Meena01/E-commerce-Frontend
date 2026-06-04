import { useId } from "react";

export function Tooltip({ children, content }) {
  const id = useId();
  return (
    <span className="ds-tooltip">
      {children}
      <span className="ds-tooltip__content" id={id} role="tooltip">
        {content}
      </span>
    </span>
  );
}
