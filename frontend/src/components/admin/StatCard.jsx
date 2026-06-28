import React from 'react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "#6366f1",
  sub = "",
  active = false,
  onClick = null
}) {
  const isClickable = !!onClick;
  
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        cursor: isClickable ? "pointer" : "default",
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        boxShadow: active ? `0 4px 12px ${color}33` : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.15s, box-shadow 0.15s, border 0.15s",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 8px 24px ${color}33`;
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = active ? `0 4px 12px ${color}33` : "0 1px 4px rgba(0,0,0,0.06)";
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "100px",
          height: "100px",
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </p>
        {Icon && (
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div>
        <h3 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#0f172a" }}>
          {value}
        </h3>
        {sub && (
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
