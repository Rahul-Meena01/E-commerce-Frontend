import React from 'react';

export default function AdminButton({
  children,
  onClick,
  variant = "primary", // primary, secondary, danger, success
  icon: Icon,
  disabled = false,
  className = "",
  style = {},
  type = "button",
  title = ""
}) {
  const getColors = () => {
    switch (variant) {
      case "primary":
        return { bg: "#4f46e5", hover: "#4338ca", text: "#ffffff", border: "transparent" };
      case "danger":
        return { bg: "#ef4444", hover: "#dc2626", text: "#ffffff", border: "transparent" };
      case "success":
        return { bg: "#10b981", hover: "#059669", text: "#ffffff", border: "transparent" };
      case "secondary":
      default:
        return { bg: "#ffffff", hover: "#f3f4f6", text: "#374151", border: "#d1d5db" };
    }
  };

  const colors = getColors();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`admin-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: children ? "8px" : "0",
        padding: children ? "8px 16px" : "8px",
        height: "40px",
        width: children ? "auto" : "40px",
        borderRadius: "8px",
        fontWeight: "500",
        fontSize: "14px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        transition: "all 0.2s ease-in-out",
        boxShadow: variant === "secondary" ? "0 1px 2px rgba(0,0,0,0.05)" : "0 2px 4px rgba(0,0,0,0.1)",
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.bg;
        }
      }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
