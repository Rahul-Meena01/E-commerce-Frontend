import { forwardRef } from "react";

const VALID_VARIANTS = ["primary", "secondary", "accent", "outline", "ghost", "danger"];

export const Button = forwardRef(function Button(
  {
    as: Component = "button",
    children,
    className = "",
    icon,
    loading = false,
    size = "md",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const safeVariant = VALID_VARIANTS.includes(variant) ? variant : "primary";
  const isIconOnly = !children;

  const classes = [
    "ds-button",
    `ds-button--${safeVariant}`,
    size !== "md" ? `ds-button--${size}` : "",
    isIconOnly ? "ds-button--icon" : "",
    loading ? "ds-button--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component
      ref={ref}
      className={classes}
      disabled={props.disabled || loading}
      type={Component === "button" ? type : undefined}
      {...props}
    >
      {icon}
      {children}
    </Component>
  );
});
