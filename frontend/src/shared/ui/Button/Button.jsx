import { forwardRef } from "react";

export const Button = forwardRef(function Button(
  {
    as: Component = "button",
    children,
    className = "",
    icon,
    size = "md",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const classes = [
    "ds-button",
    `ds-button--${variant}`,
    size !== "md" ? `ds-button--${size}` : "",
    props["aria-label"] && !children ? "ds-button--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component
      ref={ref}
      className={classes}
      type={Component === "button" ? type : undefined}
      {...props}
    >
      {icon}
      {children}
    </Component>
  );
});
