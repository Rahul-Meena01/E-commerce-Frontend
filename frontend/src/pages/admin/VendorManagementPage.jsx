/*
 * pages/admin/VendorManagementPage.jsx
 *
 * Lists all vendor accounts for the admin.
 * Data is fetched from:  GET /api/admin/vendors
 *
 * Query params sent to the API:
 *   ?page=<n>            → current page (1-indexed)
 *   ?limit=5             → fixed at 5 items per page
 *   ?status=<value>      → optional filter: "active" | "suspended" | "pending"
 *                          omitted when "All" tab is selected
 *
 * Pagination is SERVER-SIDE — the API returns only the current page of results.
 * The total count and totalPages come from the API response, not computed locally.
 *
 * Clicking "View Profile →" navigates to /admin/vendors/:id
 * where :id is the vendor's MongoDB _id.
 */

import { useState, useEffect, useCallback } from "react";
import { BarChart3, TrendingUp, Users, AlertCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination";
import API from "../../utils/api";

// ─── Constants ──────────────────────────────────────────────────────────────────

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=1e293b&color=fff&size=128&bold=true`;

// Normalise the backend status ("active" / "suspended" / "pending")
// into a display label and style.
const STATUS_MAP = {
  active: {
    bg: "#e6f4ff",
    color: "#0958d9",
    border: "#91caff",
    icon: "✨",
    label: "Active",
  },
  suspended: {
    bg: "#fff1f0",
    color: "#cf1322",
    border: "#ffa39e",
    icon: "🚫",
    label: "Suspended",
  },
  pending: {
    bg: "#fffbe6",
    color: "#d46b08",
    border: "#ffe58f",
    icon: "⏳",
    label: "Pending",
  },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

// ─── Stat / Filter Card ───────────────────────────────────────────────────────

const StatCard = ({ label, value, accent, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: "1 1 160px",
      minWidth: 140,
      background: active ? accent : "#fff",
      borderRadius: 14,
      border: `2px solid ${active ? accent : "#e5e7eb"}`,
      padding: "18px 20px",
      cursor: "pointer",
      textAlign: "left",
      transition: "all .18s",
      boxShadow: active
        ? `0 4px 14px ${accent}33`
        : "0 1px 4px rgba(0,0,0,.06)",
    }}
  >
    <div
      style={{
        fontSize: 30,
        fontWeight: 800,
        lineHeight: 1.1,
        marginTop: 8,
        color: active ? "#fff" : accent,
      }}
    >
      {value ?? "…"}
    </div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        marginTop: 4,
        color: active ? "#ffffffcc" : "#6b7280",
      }}
    >
      {label}
    </div>
  </button>
);

// ─── Filter tab definitions ───────────────────────────────────────────────────
// `apiValue` is what gets sent to the backend as ?status=
// Empty string means "All" — we omit the status param entirely.
const FILTER_TABS = [
  { label: "👥 All Vendors", apiValue: "", accent: "#6366f1" },
  { label: "✨ Active Vendors", apiValue: "active", accent: "#0958d9" },
  { label: "⏳ Pending Vendors", apiValue: "pending", accent: "#d46b08" },
  { label: "🚫 Suspended Vendors", apiValue: "suspended", accent: "#cf1322" },
];

const ITEMS_PER_PAGE = 10;
const TABLE_COLS = [
  "Vendor ID",
  "Name",
  "Shop Name",
  "Email",
  "Status",
  "Action",
];

// ─── Main Component ───────────────────────────────────────────────────────────

const VendorManagementPage = () => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    total: null,
    active: null,
    pending: null,
    suspended: null,
  });
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "pending" | "suspended"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch vendors from the API ─────────────────────────────────────────────
  // Called whenever page or statusFilter changes.
  // The API handles filtering and pagination — we just pass the params.
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({ page, limit: ITEMS_PER_PAGE });
      if (statusFilter) searchParams.set("status", statusFilter);
      const params = searchParams.toString();
      const data = await API(`/api/admin/vendors?${params}`);

      if (!data.success) {
        setError(data.message || "Failed to load vendors.");
        return;
      }

      setVendors(data.data || data.vendors || []);
      setTotalPages(data.pages || data.totalPages || 1);
      setTotalCount(data.total || data.totalVendors || 0);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // ── Fetch summary stats (all statuses) once on mount ──────────────────────
  // We call the API 3 times in parallel — once per status — to get counts.
  // These power the stat cards at the top.
  const fetchStats = useCallback(async () => {
    try {
      const [all, active, pending, suspended] = await Promise.all([
        API("/api/admin/vendors?limit=1"),
        API("/api/admin/vendors?limit=1&status=active"),
        API("/api/admin/vendors?limit=1&status=pending"),
        API("/api/admin/vendors?limit=1&status=suspended"),
      ]);

      setStats({
        total: all.success ? all.total : 0,
        active: active.success ? active.total : 0,
        pending: pending.success ? pending.total : 0,
        suspended: suspended.success ? suspended.total : 0,
      });
    } catch {
      // Stats failing is non-critical — the table still works
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTabClick = (val) => {
    setStatusFilter(val);
    setPage(1); // reset to first page on filter change
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        background: "#f1f5f9",
        minHeight: "100vh",
        padding: "28px 32px",
        color: "#0f172a",
      }}
    >
      {/* ── Page title ── */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Vendor Management
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "5px 0 0" }}>
          Manage your vendors, view their details, and track their status.
        </p>
      </div>

      {/* ── Stat / filter cards ── */}
      <div
        style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}
      >
        {FILTER_TABS.map((tab) => (
          <StatCard
            key={tab.apiValue}
            label={tab.label}
            value={
              tab.apiValue === ""
                ? stats.total
                : tab.apiValue === "active"
                  ? stats.active
                  : tab.apiValue === "pending"
                    ? stats.pending
                    : stats.suspended
            }
            accent={tab.accent}
            active={statusFilter === tab.apiValue}
            onClick={() => handleTabClick(tab.apiValue)}
          />
        ))}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            background: "#fff1f0",
            border: "1px solid #ffa39e",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#cf1322",
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {error}
          <button
            onClick={fetchVendors}
            style={{
              border: "none",
              background: "none",
              color: "#cf1322",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Result count ── */}
      <div
        style={{
          marginBottom: 10,
          fontSize: 13,
          color: "#94a3b8",
          textAlign: "right",
        }}
      >
        {loading
          ? "Loading…"
          : `${totalCount} vendor${totalCount !== 1 ? "s" : ""}`}
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {TABLE_COLS.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton rows */}
              {loading &&
                vendors.length === 0 &&
                Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {TABLE_COLS.map((c) => (
                      <td key={c} style={{ padding: "13px 16px" }}>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 6,
                            background:
                              "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.2s infinite",
                            width: c === "Action" ? 80 : "70%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Empty state */}
              {!loading && vendors.length === 0 && (
                <tr>
                  <td
                    colSpan={TABLE_COLS.length}
                    style={{
                      padding: 50,
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: 15,
                    }}
                  >
                    No vendors found.
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {vendors.map((v, i) => {
                // The API populates vendor.user with { name, email, phone, createdAt }
                const name = v.user?.name || "—";
                const email = v.user?.email || "—";

                return (
                  <tr
                    key={v._id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: i % 2 === 0 ? "#fff" : "#fafbfc",
                      opacity: loading ? 0.5 : 1,
                      transition: "background .12s, opacity .15s",
                    }}
                  >
                    {/* Vendor ID — last 8 chars of MongoDB ObjectId for readability */}
                    <td
                      style={{
                        padding: "13px 16px",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#94a3b8",
                      }}
                    >
                      #{String(v._id).slice(-8).toUpperCase()}
                    </td>

                    {/* Name + avatar */}
                    <td style={{ padding: "13px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <img
                          src={v.logo || avatarFallback(name)}
                          alt={name}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #e2e8f0",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </span>
                      </div>
                    </td>

                    {/* Shop name */}
                    <td
                      style={{
                        padding: "13px 16px",
                        color: "#475569",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {v.shopName || "—"}
                    </td>

                    {/* Email */}
                    <td
                      style={{
                        padding: "13px 16px",
                        color: "#475569",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "13px 16px" }}>
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Action — navigate using the real MongoDB _id */}
                    <td style={{ padding: "13px 16px" }}>
                      <button
                        onClick={() => navigate(`/admin/vendors/${v._id}`)}
                        style={{
                          background: "#6366f1",
                          color: "#fff",
                          border: "none",
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#4f46e5")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#6366f1")
                        }
                      >
                        View Profile →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <Pagination page={page} pages={totalPages} onPageChange={setPage} />
      </div>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default VendorManagementPage;
