/*
 * pages/admin/VendorProfilePage.jsx
 *
 * Shows the full detail view for a single vendor.
 * Data is fetched from:  GET /api/admin/vendors/:id
 *
 * The :id comes from useParams() and is the vendor's MongoDB _id,
 * passed through from VendorManagementPage when "View Profile →" is clicked.
 *
 * API response shape (vendor document with populated user):
 *   data: {
 *     _id, shopName, slug, description, logo, banner, status,
 *     commissionRate, address, city, pincode,
 *     businessPhone, businessEmail, websiteUrl,
 *     createdAt, updatedAt,
 *     user: { _id, name, email, phone, createdAt }
 *   }
 *
 * Tabs that show real data:   BUSINESS INFORMATION, DETAILS
 * Tabs that are placeholders: ANALISE, PRODUCTS, CATEGORY, SUB-CATEGORY, COUPON, ORDERS
 * (Those tabs would need their own API endpoints — wire them up when ready.)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../utils/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "V")}&background=1e293b&color=fff&size=256&bold=true`;

// Format an ISO date string into a readable date, e.g. "28 May 2026"
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active: { bg: "#dcfce7", color: "#166534", label: "Active" },
  suspended: { bg: "#fee2e2", color: "#991b1b", label: "Suspended" },
  pending: { bg: "#fef9c3", color: "#854d0e", label: "Pending" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      style={{
        padding: "4px 14px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
};

// ─── Info field (label + rounded box) ────────────────────────────────────────

const InfoField = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "#334155",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
    <div
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 24,
        padding: "12px 20px",
        fontSize: 15,
        color: "#0f172a",
        backgroundColor: "#fff",
      }}
    >
      {value || "—"}
    </div>
  </div>
);

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  "ANALISE",
  "BUSINESS INFORMATION",
  "PRODUCTS",
  "CATEGORY",
  "SUB-CATEGORY",
  "COUPON",
  "ORDERS",
  "DETAILS",
];

// ─── Main component ───────────────────────────────────────────────────────────

const VendorProfilePage = () => {
  const { id } = useParams(); // MongoDB _id from the URL
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ANALISE");
  const [updating, setUpdating] = useState(false);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [vendorStats, setVendorStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });

  const [statusErrors, setStatusErrors] = useState({});
  
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionErrors, setCommissionErrors] = useState({});
  const [updatingCommission, setUpdatingCommission] = useState(false);

  // ── Update vendor status ───────────────────────────────────────────────────
  const updateStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    setUpdating(true);
    setStatusErrors({});
    try {
      const data = await API(`/api/admin/vendors/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!data.success) {
        if (data.errors && Array.isArray(data.errors)) {
          const newErrors = {};
          data.errors.forEach((e) => {
            const fieldName = e.path && e.path[0];
            if (fieldName) newErrors[fieldName] = e.message;
          });
          setStatusErrors(newErrors);
        } else {
          alert(data.message || "Failed to update status.");
        }
        return;
      }
      setVendor(data.data);
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const updateCommission = async () => {
    setUpdatingCommission(true);
    setCommissionErrors({});
    try {
      const data = await API(`/api/admin/vendors/${id}/commission`, {
        method: "PUT",
        body: JSON.stringify({ commissionRate: Number(commissionRate) }),
      });
      if (!data.success) {
        if (data.errors && Array.isArray(data.errors)) {
          const newErrors = {};
          data.errors.forEach((e) => {
            const fieldName = e.path && e.path[0];
            if (fieldName) newErrors[fieldName] = e.message;
          });
          setCommissionErrors(newErrors);
        } else {
          alert(data.message || "Failed to update commission.");
        }
        return;
      }
      setVendor(data.data);
      setIsEditingCommission(false);
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setUpdatingCommission(false);
    }
  };

  // ── Fetch vendor data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await API(`/api/admin/vendors/${id}`);

        if (!data.success) {
          setError(data.message || "Failed to load vendor.");
          return;
        }

        setVendor(data.data);
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  useEffect(() => {
    const fetchVendorOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");

      try {
        const data = await API(`/api/admin/vendors/${id}/orders`);

        if (!data.success) {
          setOrdersError(data.message || "Failed to load vendor order data.");
          setVendorOrders([]);
          setVendorStats({
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
          });
          return;
        }

        const totalOrders = data.totalOrders || 0;
        const totalRevenue = data.totalRevenue || 0;

        setVendorOrders(data.data || []);
        setVendorStats({
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        });
      } catch (err) {
        setOrdersError("Network error. Please try again.");
        setVendorOrders([]);
        setVendorStats({
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
        });
      } finally {
        setOrdersLoading(false);
      }
    };

    if (activeTab === "ANALISE" || activeTab === "ORDERS") {
      fetchVendorOrders();
    }
  }, [id, activeTab]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f1f5f9",
          padding: "32px",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              margin: "0 auto 16px",
              border: "4px solid #e2e8f0",
              borderTopColor: "#6366f1",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: 15 }}>Loading vendor profile…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f1f5f9",
          padding: "32px",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          ← Back to Vendors
        </button>
        <div
          style={{
            background: "#fff1f0",
            border: "1px solid #ffa39e",
            borderRadius: 12,
            padding: "24px",
            color: "#cf1322",
            fontSize: 15,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  // Destructure the vendor and its populated user for convenience
  const user = vendor?.user || {};

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        padding: "32px",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: "#000",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: "none",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 20,
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ← Back to Vendors
      </button>

      {/* ── Main card ── */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,.05)",
          display: "flex",
          flexDirection: "column",
          minHeight: "80vh",
        }}
      >
        {/* ── TOP: Profile header ── */}
        <div
          style={{
            padding: 32,
            display: "flex",
            gap: 32,
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          {/* Logo / avatar */}
          <div
            style={{
              width: 160,
              height: 200,
              border: "1.5px solid #cbd5e1",
              borderRadius: 12,
              overflow: "hidden",
              flexShrink: 0,
              backgroundColor: "#fff",
            }}
          >
            <img
              src={vendor.logo || avatarFallback(user.name)}
              alt={vendor.shopName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Info fields grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              flex: 1,
            }}
          >
            <InfoField label="Vendor Name" value={user.name} />
            <InfoField label="Shop Name" value={vendor.shopName} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Vendor ID
              </span>
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 24,
                  padding: "12px 20px",
                  fontSize: 13,
                  color: "#94a3b8",
                  backgroundColor: "#fff",
                  fontFamily: "monospace",
                }}
              >
                {vendor._id}
              </div>
            </div>
            <InfoField label="Email" value={user.email} />
            <InfoField label="Phone" value={user.phone} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Status
              </span>
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 24,
                  padding: "10px 20px",
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <StatusBadge status={vendor.status} />
                
                {vendor.status === "pending" && (
                  <button
                    onClick={() => updateStatus("active")}
                    disabled={updating}
                    style={{
                      background: "#166534",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: updating ? "not-allowed" : "pointer",
                      opacity: updating ? 0.7 : 1,
                    }}
                  >
                    {updating ? "..." : "Approve"}
                  </button>
                )}
                {vendor.status === "active" && (
                  <button
                    onClick={() => updateStatus("suspended")}
                    disabled={updating}
                    style={{
                      background: "#cf1322",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: updating ? "not-allowed" : "pointer",
                      opacity: updating ? 0.7 : 1,
                    }}
                  >
                    {updating ? "..." : "Block / Pause"}
                  </button>
                )}
                {vendor.status === "suspended" && (
                  <button
                    onClick={() => updateStatus("active")}
                    disabled={updating}
                    style={{
                      background: "#166534",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: updating ? "not-allowed" : "pointer",
                      opacity: updating ? 0.7 : 1,
                    }}
                  >
                    {updating ? "..." : "Reactivate"}
                  </button>
                )}
              </div>
              {statusErrors.status && <div style={{color:"#e94560", fontSize:"12px", marginTop:"4px"}}>{statusErrors.status}</div>}
            </div>
            <InfoField label="Join Date" value={formatDate(user.createdAt)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>Commission</span>
                {!isEditingCommission ? (
                   <button 
                     onClick={() => {
                        setCommissionRate(vendor.commissionRate ?? 10);
                        setIsEditingCommission(true);
                        setCommissionErrors({});
                     }}
                     style={{background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12, fontWeight: "bold"}}
                   >Edit</button>
                ) : (
                   <div style={{display: "flex", gap: "8px"}}>
                     <button onClick={updateCommission} disabled={updatingCommission} style={{background: "#166534", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: 10, fontWeight: "bold"}}>Save</button>
                     <button onClick={() => setIsEditingCommission(false)} style={{background: "#cbd5e1", color: "#000", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: 10, fontWeight: "bold"}}>Cancel</button>
                   </div>
                )}
              </span>
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 24,
                  padding: "12px 20px",
                  fontSize: 15,
                  color: "#0f172a",
                  backgroundColor: "#fff",
                }}
              >
                {!isEditingCommission ? (
                  `${vendor.commissionRate ?? 10}%`
                ) : (
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    style={{ border: "none", outline: "none", width: "100%", background: "transparent", fontSize: 15 }}
                  />
                )}
              </div>
              {commissionErrors.commissionRate && <div style={{color:"#e94560", fontSize:"12px", marginTop:"4px"}}>{commissionErrors.commissionRate}</div>}
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Tab bar ── */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            overflowX: "auto",
          }}
        >
          {TABS.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                minWidth: 100,
                padding: "16px 8px",
                fontSize: 11,
                fontWeight: activeTab === tab ? 700 : 600,
                color: activeTab === tab ? "#000" : "#64748b",
                backgroundColor: activeTab === tab ? "#f8fafc" : "#fff",
                border: "none",
                borderRight:
                  index < TABS.length - 1 ? "1px solid #e2e8f0" : "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #000"
                    : "2px solid transparent",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                transition: "all 0.15s",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 56,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── BOTTOM: Tab content ── */}
        <div
          style={{
            flex: 1,
            padding: 32,
            backgroundColor: "#fff",
            overflowY: "auto",
          }}
        >
          {activeTab === "ANALISE" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 24,
              }}
            >
              {[
                {
                  label: "Total Revenue",
                  value: ordersLoading
                    ? "Loading..."
                    : formatMoney(vendorStats.totalRevenue),
                },
                {
                  label: "Total Orders",
                  value: ordersLoading ? "Loading..." : vendorStats.totalOrders,
                },
                {
                  label: "Average Order Value",
                  value: ordersLoading
                    ? "Loading..."
                    : formatMoney(vendorStats.averageOrderValue),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      color: "#64748b",
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: "bold",
                      color: "#0f172a",
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
              {ordersError ? (
                <div
                  style={{
                    gridColumn: "1/-1",
                    padding: 20,
                    borderRadius: 16,
                    backgroundColor: "#fff1f0",
                    border: "1px solid #ffa39e",
                    color: "#cf1322",
                  }}
                >
                  {ordersError}
                </div>
              ) : (
                <p
                  style={{
                    gridColumn: "1/-1",
                    color: "#94a3b8",
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  Real-time vendor revenue and order history are loaded from the
                  admin vendor orders API.
                </p>
              )}
            </div>
          )}

          {/* BUSINESS INFORMATION — real data from the vendor document */}
          {activeTab === "BUSINESS INFORMATION" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <InfoField label="Shop Description" value={vendor.description} />
              <InfoField label="Website" value={vendor.websiteUrl} />
              <InfoField label="Business Email" value={vendor.businessEmail} />
              <InfoField label="Business Phone" value={vendor.businessPhone} />
              <InfoField label="Address" value={vendor.address} />
              <InfoField label="City" value={vendor.city} />
              <InfoField label="Pincode" value={vendor.pincode} />
              <InfoField label="Shop Slug" value={vendor.slug} />
            </div>
          )}

          {/* PRODUCTS */}
          {activeTab === "PRODUCTS" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", textTransform: "uppercase", fontSize: 12 }}>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Image</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Name</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Price</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Stock</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!vendor.products || vendor.products.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No products found</td></tr>
                  ) : (
                    vendor.products.map(p => (
                      <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px" }}>
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt="product" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: "#e2e8f0", borderRadius: 6 }}></div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: "12px 16px" }}>₹{p.price}</td>
                        <td style={{ padding: "12px 16px" }}>{p.stock_qty}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: p.isActive ? "#166534" : "#991b1b", background: p.isActive ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CATEGORY */}
          {activeTab === "CATEGORY" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", textTransform: "uppercase", fontSize: 12 }}>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Name</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Slug</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!vendor.categories || vendor.categories.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No categories found</td></tr>
                  ) : (
                    vendor.categories.map(c => (
                      <tr key={c._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{c.slug}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: c.isActive ? "#166534" : "#991b1b", background: c.isActive ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SUB-CATEGORY */}
          {activeTab === "SUB-CATEGORY" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", textTransform: "uppercase", fontSize: 12 }}>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Name</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Parent Category</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!vendor.subCategories || vendor.subCategories.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No sub-categories found</td></tr>
                  ) : (
                    vendor.subCategories.map(sc => (
                      <tr key={sc._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{sc.name}</td>
                        <td style={{ padding: "12px 16px" }}>{sc.category?.name || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: sc.isActive ? "#166534" : "#991b1b", background: sc.isActive ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {sc.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* COUPON */}
          {activeTab === "COUPON" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", textTransform: "uppercase", fontSize: 12 }}>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Code</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Discount</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Usage</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Expires</th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!vendor.coupons || vendor.coupons.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No coupons found</td></tr>
                  ) : (
                    vendor.coupons.map(cp => (
                      <tr key={cp._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace" }}>{cp.code}</td>
                        <td style={{ padding: "12px 16px" }}>{cp.discountType === "percentage" ? `${cp.discountValue}%` : `₹${cp.discountValue}`}</td>
                        <td style={{ padding: "12px 16px" }}>{cp.usedCount} / {cp.maxUses || "∞"}</td>
                        <td style={{ padding: "12px 16px" }}>{cp.expiresAt ? new Date(cp.expiresAt).toLocaleDateString() : "Never"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: cp.isActive ? "#166534" : "#991b1b", background: cp.isActive ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {cp.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ORDERS — real vendor order history */}
          {activeTab === "ORDERS" && (
            <div>
              {ordersLoading ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  Loading vendor orders...
                </div>
              ) : ordersError ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    backgroundColor: "#fff1f0",
                    border: "1px solid #ffa39e",
                    color: "#cf1322",
                  }}
                >
                  {ordersError}
                </div>
              ) : vendorOrders.length === 0 ? (
                <PlaceholderTab message="No vendor orders found yet." />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#f8fafc",
                          textAlign: "left",
                          color: "#64748b",
                          textTransform: "uppercase",
                          fontSize: 12,
                        }}
                      >
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Order ID
                        </th>
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Customer
                        </th>
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Date
                        </th>
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Status
                        </th>
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Vendor Revenue
                        </th>
                        <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          Items
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorOrders.map((order) => (
                        <tr key={order._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#0f172a" }}>
                            {order._id.slice(-8)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {order.user?.name || order.user?.email || "Customer"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {formatDate(order.createdAt)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                color: "#0f172a",
                                background: "#e2e8f0",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {order.orderStatus}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                            {formatMoney(order.vendorTotal)}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#475569" }}>
                            {order.vendorItems.map((item) => `${item.name} x${item.qty}`).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DETAILS — real data: timestamps and commission */}
          {activeTab === "DETAILS" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <InfoField
                label="Registered On"
                value={formatDate(vendor.createdAt)}
              />
              <InfoField
                label="Last Updated"
                value={formatDate(vendor.updatedAt)}
              />
              <InfoField
                label="Commission Rate"
                value={`${vendor.commissionRate ?? 10}%`}
              />
              <InfoField label="Account Status" value={vendor.status} />
              {vendor.banner && (
                <div style={{ gridColumn: "1/-1" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Shop Banner
                  </span>
                  <img
                    src={vendor.banner}
                    alt="banner"
                    style={{
                      width: "100%",
                      maxHeight: 200,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reusable placeholder tab ─────────────────────────────────────────────────

const PlaceholderTab = ({ message }) => (
  <div
    style={{
      padding: 32,
      border: "1px dashed #cbd5e1",
      borderRadius: 16,
      textAlign: "center",
      color: "#94a3b8",
      backgroundColor: "#f8fafc",
    }}
  >
    <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
  </div>
);

export default VendorProfilePage;
