import React from "react";
import PropTypes from "prop-types";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";
import "../../../styles/Reveal.css";

export const Reveal = ({ children, delay = 0, duration = 0.8, direction = "up", className = "" }) => {
  const [ref, isIntersecting] = useIntersectionObserver({ triggerOnce: true });

  const style = {
    transitionDuration: `${duration}s`,
    transitionDelay: `${delay}s`,
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`reveal reveal-${direction} ${isIntersecting ? "reveal-active" : ""} ${className}`}
    >
      {children}
    </div>
  );
};

Reveal.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
  duration: PropTypes.number,
  direction: PropTypes.oneOf(["up", "down", "left", "right"]),
  className: PropTypes.string,
};

export default Reveal;
