import React from "react";
import "./Spinner.css";

/**
 * Spinner
 * Props: size: 'sm'|'md'|'lg', label: string
 */
const Spinner = ({ size = "md", label = "Loading" }) => {
  return (
    <div className={`spinner spinner-${size}`} role="status" aria-label={label}>
      <svg className="spinner-svg" viewBox="0 0 50 50" aria-hidden="true">
        <circle
          className="path"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Spinner;
