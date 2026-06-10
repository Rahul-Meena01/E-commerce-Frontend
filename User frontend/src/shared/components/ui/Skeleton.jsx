import React from "react";
import "./Skeleton.css";

/**
 * Skeleton
 * Props:
 * - variant: 'text' | 'avatar' | 'card' | 'image' | 'custom'
 * - width, height: for custom sizing (string, e.g. '100px' or '50%')
 * - className
 */
const Skeleton = ({ variant = "text", width, height, className = "" }) => {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const baseClass = `sk-${variant}`;

  return (
    <div
      className={`sk ${baseClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
