// ─── pages/admin/UserManagementPage.jsx ──────────────────────────────────────
//
// Admin User Management page.
// Aligned to User model:
//   - uses `profileImage` (not `avatar`)
//   - uses `role` (not `isAdmin`)
//   - shows address / city / pincode from User model
//   - status override via PUT /api/users/:id/status
//
// Drop this file into your pages/admin/ folder.
// Make sure your axios/fetch instance sends the admin JWT automatically,
// OR swap the bare fetch() calls here for your existing api utility.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = "/api/users";

// Reads JWT from localStorage — swap key name if yours differs
const authHeader = () => {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeader(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n || 0);

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=1e293b&color=fff&size=128&bold=true`;

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  Hot:      { bg: "#fff1f0", color: "#cf1322", border: "#ffa39e", icon: "🔥" },
  Cold:     { bg: "#e6f4ff", color: "#0958d9", border: "#91caff", icon: "🧊" },
  Deactive: { bg: "#f5f5f5", color: "#595959", border: "#d9d9d9", icon: "💤" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.Deactive;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {s.icon} {status || "Deactive"}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, accent, icon, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: "1 1 160px", minWidth: 140,
      background: active ? accent : "#fff",
      borderRadius: 14, border: `2px solid ${active ? accent : "#e5e7eb"}`,
      padding: "18px 20px", cursor: onClick ? "pointer" : "default",
      textAlign: "left", transition: "all .18s",
      boxShadow: active ? `0 4px 14px ${accent}33` : "0 1px 4px rgba(0,0,0,.06)",
    }}
  >
    <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
    <div style={{
      fontSize: 30, fontWeight: 800, lineHeight: 1.1, marginTop: 8,
      color: active ? "#fff" : accent,
    }}>{value ?? "…"}</div>
    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: active ? "#ffffffcc" : "#6b7280" }}>
      {label}
    </div>
  </button>
);

// ─── User Profile Drawer ──────────────────────────────────────────────────────

const STATUS_OPTIONS = ["Hot", "Cold", "Deactive"];

const UserProfileDrawer = ({ userId, onClose, onStatusChanged }) => {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true); setError(null);
    apiFetch(`${API_BASE}/${userId}`)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleStatusOverride = async (newStatus) => {
    setSaving(true);
    try {
      await apiFetch(`${API_BASE}/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setProfile((p) => ({ ...p, status: newStatus, adminStatusOverride: newStatus }));
      showToast(`Status set to ${newStatus}`);
      onStatusChanged?.();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(15,23,42,.45)", backdropFilter: "blur(2px)" }} />

      {/* Drawer */}
      <div style={{
        width: "min(700px, 100vw)", height: "100vh", background: "#f8fafc",
        overflowY: "auto", boxShadow: "-6px 0 32px rgba(0,0,0,.15)",
        display: "flex", flexDirection: "column",
        animation: "slideIn .22s ease-out",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(60px); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>

        {/* ── Sticky header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>User Profile</span>
            {profile && (
              <span style={{ marginLeft: 10, fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
                #{profile._id?.slice(-8).toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            border: "none", background: "#f1f5f9", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#475569",
          }}>✕</button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "sticky", top: 57, zIndex: 9,
            background: toast.type === "error" ? "#fff1f0" : "#f0fdf4",
            borderBottom: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`,
            color: toast.type === "error" ? "#991b1b" : "#166534",
            padding: "10px 24px", fontSize: 13, fontWeight: 500,
          }}>
            {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
          </div>
        )}

        {loading && (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            Loading profile…
          </div>
        )}

        {error && (
          <div style={{ padding: 24, color: "#cf1322", fontSize: 14 }}>⚠ {error}</div>
        )}

        {profile && !loading && (
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* ── Hero ── */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
              borderRadius: 16, padding: "22px 24px", color: "#fff",
              display: "flex", gap: 20, alignItems: "flex-start",
            }}>
              <img
                src={profile.profileImage || avatarFallback(profile.name)}
                alt={profile.name}
                onError={(e) => { e.target.src = avatarFallback(profile.name); }}
                style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "3px solid #334155", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile.name}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>{profile.email}</div>
                {profile.phone && (
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>📞 {profile.phone}</div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <StatusBadge status={profile.status} />
                  {profile.adminStatusOverride && (
                    <span style={{ fontSize: 11, background: "#7c3aed22", color: "#7c3aed", border: "1px solid #7c3aed44", padding: "2px 8px", borderRadius: 10 }}>
                      📌 Admin pinned
                    </span>
                  )}
                  <span style={{ fontSize: 11, background: "#ffffff15", color: "#cbd5e1", padding: "2px 8px", borderRadius: 10, border: "1px solid #ffffff20" }}>
                    Joined {fmtDate(profile.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Quick status override ── */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "16px 18px",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
                Override Status
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((s) => {
                  const st = STATUS_MAP[s];
                  const isActive = profile.status === s;
                  return (
                    <button
                      key={s}
                      disabled={saving}
                      onClick={() => handleStatusOverride(s)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: saving ? "not-allowed" : "pointer", transition: "all .15s",
                        background: isActive ? st.color : "#f8fafc",
                        color: isActive ? "#fff" : st.color,
                        border: `1.5px solid ${isActive ? st.color : st.border}`,
                        opacity: saving ? .6 : 1,
                      }}
                    >
                      {st.icon} {s}
                    </button>
                  );
                })}
                {profile.adminStatusOverride && (
                  <button
                    disabled={saving}
                    onClick={() => handleStatusOverride("")}
                    style={{
                      padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", background: "#fff", color: "#94a3b8",
                      border: "1.5px dashed #cbd5e1",
                    }}
                  >
                    ↺ Clear Override
                  </button>
                )}
              </div>
            </div>

            {/* ── Overview cards ── */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Total Orders",  value: profile.totalOrders ?? 0,         icon: "📦", color: "#0958d9" },
                { label: "Total Spend",   value: fmtCurrency(profile.totalSpend),   icon: "💰", color: "#389e0d" },
                { label: "Last Purchase", value: fmtDate(profile.lastOrderDate),    icon: "🕒", color: "#c41d7f" },
              ].map((c) => (
                <div key={c.label} style={{
                  flex: "1 1 130px", background: "#fff", borderRadius: 12,
                  border: "1px solid #e2e8f0", padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 22 }}>{c.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: c.color, marginTop: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* ── Contact & Address ── */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "18px 20px",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
                Contact & Address
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "14px 20px" }}>
                {[
                  ["Name",    profile.name],
                  ["Email",   profile.email],
                  ["Phone",   profile.phone   || "—"],
                  ["Address", profile.address || "—"],
                  ["City",    profile.city    || "—"],
                  ["Pincode", profile.pincode || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: .4 }}>{k}</div>
                    <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 500, marginTop: 3, wordBreak: "break-all" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Order History ── */}
            <div style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid #f1f5f9",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>
                  Order History
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{profile.orders?.length ?? 0} orders</span>
              </div>

              {!profile.orders?.length ? (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  No orders yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Order ID", "Date", "Amount", "Payment", "Status"].map((h) => (
                          <th key={h} style={{
                            padding: "10px 14px", textAlign: "left",
                            fontSize: 11, fontWeight: 700, color: "#94a3b8",
                            textTransform: "uppercase", letterSpacing: .4,
                            borderBottom: "1px solid #e2e8f0",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profile.orders.map((o, i) => {
                        const statusStyle = {
                          Delivered: { bg: "#f0fdf4", color: "#166534" },
                          Cancelled:  { bg: "#fff1f0", color: "#991b1b" },
                          Pending:    { bg: "#fffbe6", color: "#854d0e" },
                          Processing: { bg: "#eff6ff", color: "#1d4ed8" },
                          Shipped:    { bg: "#f5f3ff", color: "#6d28d9" },
                        };
                        const ss = statusStyle[o.orderStatus] || statusStyle.Pending;
                        return (
                          <tr key={o._id} style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: i % 2 === 0 ? "#fff" : "#fafbfc",
                          }}>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "#0f172a", fontSize: 12 }}>
                              #{o.shortId}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(o.createdAt)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(o.totalPrice)}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{o.paymentMethod}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                padding: "3px 10px", borderRadius: 12,
                                fontSize: 11, fontWeight: 700,
                                background: ss.bg, color: ss.color,
                              }}>{o.orderStatus}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};


// ─── Main Page ─────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { label: "All",      value: "",         icon: "👥", statsKey: "total",    accent: "#6366f1" },
  { label: "Hot",      value: "Hot",      icon: "🔥", statsKey: "hot",      accent: "#cf1322" },
  { label: "Cold",     value: "Cold",     icon: "🧊", statsKey: "cold",     accent: "#0958d9" },
  { label: "Deactive", value: "Deactive", icon: "💤", statsKey: "deactive", accent: "#595959" },
];

const UserManagementPage = () => {
  const [stats,        setStats]        = useState(null);
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [totalUsers,   setTotalUsers]   = useState(0);
  const [selectedId,   setSelectedId]   = useState(null);

  const searchTimer = useRef(null);

  // ── Load stats ──────────────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    apiFetch(`${API_BASE}/stats`).then(setStats).catch(console.error);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(() => {
    setLoading(true); setError(null);
    const q = new URLSearchParams({ pageNumber: page });
    if (search)       q.set("search",  search);
    if (statusFilter) q.set("status",  statusFilter);

    apiFetch(`${API_BASE}?${q}`)
      .then((data) => {
        setUsers(data.users);
        setPages(data.pages);
        setTotalUsers(data.totalUsers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadUsers, 300);
    return () => clearTimeout(searchTimer.current);
  }, [loadUsers]);

  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const handleTabClick     = (val) => { setStatusFilter(val); setPage(1); };

  const TABLE_COLS = ["User ID", "Name", "Email", "Status", "Last Purchase", "Orders", "Action"];

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f1f5f9", minHeight: "100vh",
      padding: "28px 32px", color: "#0f172a",
    }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -.5 }}>User Management</h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "5px 0 0" }}>
          Monitor customers, track purchase behaviour, manage statuses.
        </p>
      </div>

      {/* ── Stat / filter tabs ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        {FILTER_TABS.map((tab) => (
          <StatCard
            key={tab.value}
            label={`${tab.icon} ${tab.label} Users`}
            value={tab.statsKey === "total" ? stats?.total : stats?.[tab.statsKey]}
            accent={tab.accent}
            active={statusFilter === tab.value}
            onClick={() => handleTabClick(tab.value)}
          />
        ))}
      </div>

      {/* ── Search bar ── */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
        padding: "12px 16px", marginBottom: 16,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "9px 12px 9px 36px", fontSize: 14,
              outline: "none", background: "#f8fafc", color: "#0f172a",
            }}
          />
        </div>
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}
          >
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "auto" }}>
          {loading ? "Loading…" : `${totalUsers} user${totalUsers !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden",
      }}>
        {error && (
          <div style={{ padding: "12px 20px", background: "#fff1f0", color: "#991b1b", fontSize: 13, borderBottom: "1px solid #fca5a5" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {TABLE_COLS.map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#64748b",
                    textTransform: "uppercase", letterSpacing: .5,
                    borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={TABLE_COLS.length} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                    Loading users…
                  </td>
                </tr>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length} style={{ padding: 50, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
                    No users found.
                  </td>
                </tr>
              )}

              {!loading && users.map((u, i) => (
                <tr key={u._id} style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: i % 2 === 0 ? "#fff" : "#fafbfc",
                  transition: "background .12s",
                }}>
                  {/* User ID */}
                  <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                    #{u._id?.slice(-8).toUpperCase()}
                  </td>

                  {/* Name + Avatar */}
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={u.profileImage || avatarFallback(u.name)}
                        alt={u.name}
                        onError={(e) => { e.target.src = avatarFallback(u.name); }}
                        style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }}
                      />
                      <span style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{u.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: "13px 16px", color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "13px 16px" }}>
                    <StatusBadge status={u.status} />
                  </td>

                  {/* Last Purchase */}
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap" }}>
                    {fmtDate(u.lastOrderDate)}
                  </td>

                  {/* Total Orders */}
                  <td style={{ padding: "13px 16px", fontWeight: 700, textAlign: "center", color: "#0f172a" }}>
                    {u.totalOrders}
                  </td>

                  {/* Action */}
                  <td style={{ padding: "13px 16px" }}>
                    <button
                      onClick={() => setSelectedId(u._id)}
                      style={{
                        background: "#6366f1", color: "#fff", border: "none",
                        padding: "7px 14px", borderRadius: 8, fontSize: 12,
                        fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#4f46e5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}
                    >
                      View Profile →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 6, padding: "16px 20px", borderTop: "1px solid #f1f5f9",
          }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "7px 16px", border: "1px solid #e2e8f0", borderRadius: 8,
                background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? .4 : 1, fontSize: 13, fontWeight: 600,
              }}
            >← Prev</button>

            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 13,
                  cursor: "pointer", fontWeight: p === page ? 800 : 500,
                  border: p === page ? "none" : "1px solid #e2e8f0",
                  background: p === page ? "#6366f1" : "#fff",
                  color: p === page ? "#fff" : "#374151",
                }}
              >{p}</button>
            ))}

            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "7px 16px", border: "1px solid #e2e8f0", borderRadius: 8,
                background: "#fff", cursor: page >= pages ? "not-allowed" : "pointer",
                opacity: page >= pages ? .4 : 1, fontSize: 13, fontWeight: 600,
              }}
            >Next →</button>
          </div>
        )}
      </div>

      {/* ── Profile Drawer ── */}
      {selectedId && (
        <UserProfileDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChanged={() => { loadStats(); loadUsers(); }}
        />
      )}

    </div>
  );
};

export default UserManagementPage;