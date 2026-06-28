import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, justifyContent: "center" }}>
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        style={{
          display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
          borderRadius: 8, border: "1px solid #e2e8f0", background: page <= 1 ? "#f8fafc" : "#fff",
          cursor: page <= 1 ? "not-allowed" : "pointer", color: page <= 1 ? "#94a3b8" : "#334155",
          fontSize: 14, fontWeight: 500,
        }}
      >
        <ChevronLeft size={16} /> Prev
      </button>

      <span style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>
        Page {page} of {pages}
      </span>

      <button
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        style={{
          display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
          borderRadius: 8, border: "1px solid #e2e8f0", background: page >= pages ? "#f8fafc" : "#fff",
          cursor: page >= pages ? "not-allowed" : "pointer", color: page >= pages ? "#94a3b8" : "#334155",
          fontSize: 14, fontWeight: 500,
        }}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}
