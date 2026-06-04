/*
 * Handover note: Admin coupon manager.
 * Manages coupon forms, product targeting search, usage-history filters, status toggles, and CRUD calls to /api/coupon.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

const API = {
  coupons: "/api/coupon",
  create: "/api/coupon/create",
  update: (id) => `/api/coupon/update/${id}`,
  delete: (id) => `/api/coupon/delete/${id}`,
  toggleStatus: (id) => `/api/coupon/toggle-status/${id}`,
  // FIX: Use the dedicated coupon product search endpoint (not /api/product/all)
  products: "/api/coupon/products/search",
  usageHistory: "/api/coupon/usage-history",
};

const EditIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const styles = {
  page: { padding: "24px", fontFamily: "'Outfit', sans-serif" },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "12px",
  },
  heading: { fontSize: "28px", fontWeight: "700", color: "#0f172a", margin: 0 },
  button: {
    background: "#6366f1",
    border: "none",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  tableWrapper: {
    background: "white",
    borderRadius: "16px",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    minWidth: "920px",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    background: "#f8fafc",
    padding: "14px",
    textAlign: "left",
    fontSize: "13px",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#0f172a",
    verticalAlign: "top",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "white",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modal: {
    background: "white",
    width: "100%",
    maxWidth: "700px",
    borderRadius: "20px",
    padding: "28px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  productDropdown: {
    position: "absolute",
    top: "48px",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
    zIndex: 10,
    maxHeight: "280px",
    overflowY: "auto",
    padding: "8px 0",
  },
  dropdownItem: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  dropdownProductMeta: { margin: 0, fontSize: "13px", color: "#64748b" },
  dropdownMessage: { padding: "12px 16px", color: "#64748b", fontSize: "14px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    fontSize: "14px",
    color: "#334155",
  },
};

// FIX: initialForm now includes discountType
const initialForm = {
  couponCode: "",
  discountType: "percentage",
  discount: "",
  minimumOrderAmount: "",
  maxDiscountAmount: "",
  usages: "",
  expires: "",
  status: "active",
  type: "cart",
  selectedProducts: [],
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

// FIX: uses discountType from coupon correctly
const getCouponDiscount = (coupon) => {
  const value = coupon.discountValue ?? coupon.discount;
  if (value === undefined || value === null || value === "") return "-";
  return coupon.discountType === "fixed" ? `₹${value}` : `${value}%`;
};

const getCouponUsage = (coupon) => {
  const used = coupon.usedCount ?? 0;
  const limit = coupon.usageLimit ?? coupon.usages;
  if (limit === undefined || limit === null || limit === "")
    return `${used} used`;
  return Number(limit) === 0
    ? `${used} used / Unlimited`
    : `${used} used / ${limit}`;
};

const statusBadge = (status, map) => {
  const config = map[status] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "600",
      }}
    >
      {status}
    </span>
  );
};

const USAGE_STATUS_STYLE = {
  applied: { bg: "#fef9c3", color: "#854d0e" },
  confirmed: { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

export default function Coupon() {
  const [activeTab, setActiveTab] = useState("coupons"); // "coupons" | "usage"

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Usage history state
  const [usages, setUsages] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePagination, setUsagePagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
  });
  const [usageFilters, setUsageFilters] = useState({ status: "", page: 1 });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCoupons();
  }, [page]);

  useEffect(() => {
    if (activeTab === "usage") {
      fetchUsageHistory();
    }
  }, [activeTab, usageFilters]);

  // ─── Products fetch (FIX: hits /api/coupon/products/search) ────────────────
  const fetchProducts = useCallback(
    async (page = 1, append = false) => {
      try {
        setProductLoading(true);
        const query = new URLSearchParams({ limit: 5, search: productSearch });
        const res = await fetch(`${API.products}?${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const newProducts = data?.data || [];
        setProducts((prev) =>
          append ? [...prev, ...newProducts] : newProducts,
        );
        setProductPage(page);
        setHasMoreProducts(Boolean(data?.count) && data.count === 5);
        setShowProductDropdown(true);
      } catch (error) {
        console.error("Failed to fetch products", error);
      } finally {
        setProductLoading(false);
      }
    },
    [productSearch, token],
  );

  useEffect(() => {
    if (showModal && form.type === "product") {
      fetchProducts(1, false);
    }
  }, [productSearch, showModal, form.type, fetchProducts]);

  // ─── Coupons ────────────────────────────────────────────────────────────────
  async function fetchCoupons() {
    try {
      setLoading(true);
      const query = new URLSearchParams({ page });
      const res = await fetch(`${API.coupons}?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setCoupons(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch coupons", error);
    } finally {
      setLoading(false);
    }
  }

  // ─── Usage History ──────────────────────────────────────────────────────────
  async function fetchUsageHistory() {
    try {
      setUsageLoading(true);
      const query = new URLSearchParams({ page: usageFilters.page, limit: 20 });
      if (usageFilters.status) query.set("status", usageFilters.status);

      const res = await fetch(`${API.usageHistory}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsages(data?.data || []);
      setUsagePagination(
        data?.pagination || { total: 0, currentPage: 1, totalPages: 1 },
      );
    } catch (error) {
      console.error("Failed to fetch usage history", error);
    } finally {
      setUsageLoading(false);
    }
  }

  // ─── Modal helpers ──────────────────────────────────────────────────────────
  function openCreateModal() {
    setEditingCoupon(null);
    setForm(initialForm);
    setShowModal(true);
  }

  // FIX: discountType now populated correctly when editing
  function openEditModal(coupon) {
    setEditingCoupon(coupon);
    setForm({
      couponCode: coupon.couponCode || coupon.code || "",
      discountType: coupon.discountType || "percentage",
      discount: coupon.discountValue ?? coupon.discount ?? "",
      minimumOrderAmount: coupon.minimumOrderAmount ?? "",
      maxDiscountAmount: coupon.maxDiscountAmount ?? "",
      usages: coupon.usageLimit ?? coupon.usages ?? "",
      expires:
        coupon.expiryDate || coupon.expires
          ? (coupon.expiryDate || coupon.expires).slice(0, 10)
          : "",
      status: coupon.status || "active",
      type: coupon.type || "cart",
      selectedProducts: coupon.applicableProducts || coupon.products || [],
    });
    setShowModal(true);
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.couponCode.trim()) return alert("Coupon code is required");
    if (!form.discountType) return alert("Discount type is required");
    if (!form.discount) return alert("Discount value is required");
    if (!form.expires) return alert("Expiry date is required");
    if (form.type === "product" && form.selectedProducts.length === 0)
      return alert("Select at least one product");

    try {
      setSaving(true);

      // FIX: payload now sends discountType, minimumOrderAmount, maxDiscountAmount
      const payload = {
        couponCode: form.couponCode.trim().toUpperCase(),
        discountType: form.discountType,
        discount: Number(form.discount),
        minimumOrderAmount: Number(form.minimumOrderAmount) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        usages: Number(form.usages) || 0,
        expires: form.expires,
        status: form.status,
        type: form.type,
        products:
          form.type === "product"
            ? form.selectedProducts.map((p) => p._id)
            : [],
      };

      const url = editingCoupon ? API.update(editingCoupon._id) : API.create;
      const method = editingCoupon ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Something went wrong");

      setShowModal(false);
      fetchCoupons();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this coupon permanently?")) return;
    try {
      const res = await fetch(API.delete(id), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchCoupons();
    } catch (error) {
      console.error(error);
      alert("Failed to delete coupon");
    }
  }

  function toggleProduct(product) {
    const exists = form.selectedProducts.some((p) => p._id === product._id);
    setForm((prev) => ({
      ...prev,
      selectedProducts: exists
        ? prev.selectedProducts.filter((p) => p._id !== product._id)
        : [...prev.selectedProducts, product],
    }));
  }

  const activeCoupons = useMemo(
    () => coupons.filter((c) => c.status === "active"),
    [coupons],
  );

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.heading}>Coupons</h1>
          <p style={{ marginTop: "6px", color: "#64748b", fontSize: "14px" }}>
            Manage coupon discounts and track usage history.
          </p>
        </div>
        <button style={styles.button} onClick={openCreateModal}>
          + Create Coupon
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Total Coupons", value: coupons.length, color: "#0f172a" },
          {
            label: "Active Coupons",
            value: activeCoupons.length,
            color: "#16a34a",
          },
          {
            label: "Inactive Coupons",
            value: coupons.length - activeCoupons.length,
            color: "#dc2626",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              minWidth: "180px",
            }}
          >
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              {stat.label}
            </p>
            <h2 style={{ margin: "8px 0 0", color: stat.color }}>
              {stat.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "#f1f5f9",
          padding: "4px",
          borderRadius: "12px",
          width: "fit-content",
        }}
      >
        {[
          { key: "coupons", label: "Coupons" },
          { key: "usage", label: "Usage History" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              background: activeTab === tab.key ? "white" : "transparent",
              color: activeTab === tab.key ? "#6366f1" : "#64748b",
              boxShadow:
                activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── COUPONS TAB ── */}
      {activeTab === "coupons" && (
        <>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Code",
                  "Discount",
                  "Type",
                  "Usage",
                  "Expiry",
                  "Created",
                  "Applicable",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      padding: "40px",
                      color: "#64748b",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      padding: "40px",
                      color: "#94a3b8",
                    }}
                  >
                    No coupons found
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id}>
                    <td style={styles.td}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "13px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {coupon.couponCode || coupon.code}
                      </span>
                    </td>
                    <td style={styles.td}>{getCouponDiscount(coupon)}</td>
                    <td style={styles.td}>{coupon.discountType || "-"}</td>
                    <td style={styles.td}>{getCouponUsage(coupon)}</td>
                    <td
                      style={{
                        ...styles.td,
                        color: coupon.isExpired ? "#dc2626" : "#0f172a",
                      }}
                    >
                      {formatDate(coupon.expiryDate || coupon.expires)}
                      {coupon.isExpired && (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "11px",
                            color: "#dc2626",
                          }}
                        >
                          Expired
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{formatDate(coupon.createdAt)}</td>
                    <td style={styles.td}>
                      {coupon.type === "product" ? "Product" : "Cart"}
                    </td>
                    <td style={styles.td}>
                      {statusBadge(coupon.status, {
                        active: { bg: "#dcfce7", color: "#166534" },
                        inactive: { bg: "#fee2e2", color: "#991b1b" },
                      })}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => openEditModal(coupon)}
                          style={{
                            width: "36px",
                            height: "36px",
                            padding: 0,
                            border: "none",
                            borderRadius: "8px",
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon._id)}
                          style={{
                            width: "36px",
                            height: "36px",
                            padding: 0,
                            border: "none",
                            borderRadius: "8px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "16px",
              justifyContent: "center",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              ← Prev
            </button>
            <span
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                color: "#475569",
              }}
            >
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}

      {/* ── USAGE HISTORY TAB ── */}
      {activeTab === "usage" && (
        <div>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              style={{ ...styles.select, width: "180px" }}
              value={usageFilters.status}
              onChange={(e) =>
                setUsageFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <span style={{ fontSize: "14px", color: "#64748b" }}>
              {usagePagination.total} total records
            </span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={{ ...styles.table, minWidth: "800px" }}>
              <thead>
                <tr>
                  {[
                    "User",
                    "Email",
                    "Coupon Code",
                    "Product",
                    "Discount Saved",
                    "Cart Total",
                    "Status",
                    "Applied At",
                  ].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: "40px",
                        color: "#64748b",
                      }}
                    >
                      Loading usage history...
                    </td>
                  </tr>
                ) : usages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: "40px",
                        color: "#94a3b8",
                      }}
                    >
                      No usage records found
                    </td>
                  </tr>
                ) : (
                  usages.map((usage) => (
                    <tr key={usage._id}>
                      <td style={styles.td}>{usage.user?.name || "-"}</td>
                      <td style={styles.td} title={usage.user?.email}>
                        <span style={{ fontSize: "13px", color: "#475569" }}>
                          {usage.user?.email || "-"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: "700",
                            fontSize: "12px",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {usage.couponCode}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {usage.product ? (
                          <span>{usage.product.name}</span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                            Cart
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          color: "#16a34a",
                          fontWeight: "600",
                        }}
                      >
                        ₹{usage.discountAmount?.toFixed(2) ?? "0"}
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: "400",
                          }}
                        >
                          {usage.discountType === "percentage"
                            ? `${usage.discountValue}%`
                            : `₹${usage.discountValue} flat`}
                        </div>
                      </td>
                      <td style={styles.td}>
                        ₹{usage.cartTotal?.toFixed(2) ?? "-"}
                      </td>
                      <td style={styles.td}>
                        {statusBadge(usage.status, USAGE_STATUS_STYLE)}
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: "13px" }}>
                          {formatDateTime(usage.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usagePagination.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                justifyContent: "center",
              }}
            >
              <button
                disabled={usageFilters.page <= 1}
                onClick={() =>
                  setUsageFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  opacity: usageFilters.page <= 1 ? 0.4 : 1,
                }}
              >
                ← Prev
              </button>
              <span
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "#475569",
                }}
              >
                Page {usageFilters.page} / {usagePagination.totalPages}
              </span>
              <button
                disabled={usageFilters.page >= usagePagination.totalPages}
                onClick={() =>
                  setUsageFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  opacity:
                    usageFilters.page >= usagePagination.totalPages ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                {/* Coupon Code */}
                <div>
                  <label style={styles.label}>Coupon Code *</label>
                  <input
                    style={styles.input}
                    value={form.couponCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        couponCode: e.target.value,
                      }))
                    }
                    placeholder="SAVE20"
                  />
                </div>

                {/* FIX: Discount Type field (was missing) */}
                <div>
                  <label style={styles.label}>Discount Type *</label>
                  <select
                    style={styles.select}
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountType: e.target.value,
                      }))
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label style={styles.label}>
                    {form.discountType === "fixed"
                      ? "Discount Amount (₹) *"
                      : "Discount (%) *"}
                  </label>
                  <input
                    type="number"
                    style={styles.input}
                    value={form.discount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, discount: e.target.value }))
                    }
                    placeholder={form.discountType === "fixed" ? "500" : "10"}
                    min="1"
                  />
                </div>

                {/* FIX: Minimum Order Amount (was missing from form) */}
                <div>
                  <label style={styles.label}>Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={form.minimumOrderAmount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minimumOrderAmount: e.target.value,
                      }))
                    }
                    placeholder="0 (no minimum)"
                    min="0"
                  />
                </div>

                {/* FIX: Max Discount Cap (was missing, useful for % coupons) */}
                {form.discountType === "percentage" && (
                  <div>
                    <label style={styles.label}>Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={form.maxDiscountAmount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxDiscountAmount: e.target.value,
                        }))
                      }
                      placeholder="0 (no cap)"
                      min="0"
                    />
                  </div>
                )}

                {/* Usage Limit */}
                <div>
                  <label style={styles.label}>
                    Usage Limit (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    style={styles.input}
                    value={form.usages}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, usages: e.target.value }))
                    }
                    placeholder="100"
                    min="0"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label style={styles.label}>Expiry Date *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={form.expires}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, expires: e.target.value }))
                    }
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={styles.label}>Status</label>
                  <select
                    style={styles.select}
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Coupon Type */}
                <div>
                  <label style={styles.label}>Coupon Type</label>
                  <select
                    style={styles.select}
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        type: e.target.value,
                        selectedProducts: [],
                      }))
                    }
                  >
                    <option value="cart">Cart Applicable</option>
                    <option value="product">Product Applicable</option>
                  </select>
                </div>
              </div>

              {/* Product selector */}
              {form.type === "product" && (
                <div
                  style={{
                    marginTop: "24px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "16px" }}>
                      Select Products
                    </h3>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{ ...styles.input, width: "260px" }}
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Search product..."
                      />
                      {showProductDropdown && (
                        <div style={styles.productDropdown}>
                          {productLoading ? (
                            <div style={styles.dropdownMessage}>
                              Searching...
                            </div>
                          ) : products.length === 0 ? (
                            <div style={styles.dropdownMessage}>
                              No products found.
                            </div>
                          ) : (
                            <>
                              {products.map((product) => {
                                const selected = form.selectedProducts.some(
                                  (p) => p._id === product._id,
                                );
                                return (
                                  <button
                                    key={product._id}
                                    type="button"
                                    onClick={() => {
                                      toggleProduct(product);
                                      setShowProductDropdown(false);
                                      setProductSearch("");
                                    }}
                                    style={{
                                      ...styles.dropdownItem,
                                      background: selected
                                        ? "#eef2ff"
                                        : "white",
                                    }}
                                  >
                                    <strong>{product.name}</strong>
                                    <p style={styles.dropdownProductMeta}>
                                      ₹{product.price}
                                    </p>
                                  </button>
                                );
                              })}
                              {hasMoreProducts && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    fetchProducts(productPage + 1, true)
                                  }
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    background: "#f8fafc",
                                    color: "#334155",
                                    padding: "12px 16px",
                                    cursor: "pointer",
                                    borderTop: "1px solid #e2e8f0",
                                    borderRadius: "0 0 12px 12px",
                                    textAlign: "center",
                                    fontWeight: "600",
                                  }}
                                >
                                  {productLoading ? "Loading..." : "Load more"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {form.selectedProducts.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          marginBottom: "8px",
                        }}
                      >
                        Selected:
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        {form.selectedProducts.map((product) => (
                          <div
                            key={product._id}
                            style={{
                              background: "#6366f1",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "999px",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {product.name}
                            <span
                              onClick={() => toggleProduct(product)}
                              style={{
                                cursor: "pointer",
                                fontWeight: "700",
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.status === "inactive" && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "14px",
                    borderRadius: "12px",
                    color: "#991b1b",
                    fontSize: "14px",
                  }}
                >
                  Inactive coupons will not apply discounts on cart or products.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "28px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ ...styles.button, opacity: saving ? 0.7 : 1 }}
                >
                  {saving
                    ? "Saving..."
                    : editingCoupon
                      ? "Update Coupon"
                      : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// import { useCallback, useEffect, useMemo, useState } from "react";

// const API = {
//   coupons: "/api/coupon",
//   create: "/api/coupon/create",
//   update: (id) => `/api/coupon/update/${id}`,
//   delete: (id) => `/api/coupon/delete/${id}`,
//   products: "/api/product/all",
// };

// const EditIcon = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
//     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
//   </svg>
// );

// const DeleteIcon = () => (
//   <svg
//     width="22"
//     height="22"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <polyline points="3 6 5 6 21 6" />
//     <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
//     <path d="M10 11v6M14 11v6" />
//     <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
//   </svg>
// );

// const styles = {
//   page: {
//     padding: "24px",
//     fontFamily: "'Outfit', sans-serif",
//   },

//   topBar: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: "24px",
//     flexWrap: "wrap",
//     gap: "12px",
//   },

//   heading: {
//     fontSize: "28px",
//     fontWeight: "700",
//     color: "#0f172a",
//     margin: 0,
//   },

//   button: {
//     background: "#6366f1",
//     border: "none",
//     color: "white",
//     padding: "12px 18px",
//     borderRadius: "10px",
//     cursor: "pointer",
//     fontWeight: "600",
//     fontSize: "14px",
//   },

//   tableWrapper: {
//     background: "white",
//     borderRadius: "16px",
//     overflowX: "auto",
//     border: "1px solid #e2e8f0",
//     boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
//   },

//   table: {
//     width: "100%",
//     minWidth: "920px",
//     borderCollapse: "collapse",
//     tableLayout: "fixed",
//   },

//   th: {
//     background: "#f8fafc",
//     padding: "14px",
//     textAlign: "left",
//     fontSize: "13px",
//     color: "#475569",
//     borderBottom: "1px solid #e2e8f0",
//   },

//   td: {
//     padding: "14px",
//     borderBottom: "1px solid #f1f5f9",
//     fontSize: "14px",
//     color: "#0f172a",
//     verticalAlign: "top",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//   },

//   input: {
//     width: "100%",
//     padding: "12px",
//     border: "1px solid #cbd5e1",
//     borderRadius: "10px",
//     outline: "none",
//     fontSize: "14px",
//     boxSizing: "border-box",
//   },

//   select: {
//     width: "100%",
//     padding: "12px",
//     border: "1px solid #cbd5e1",
//     borderRadius: "10px",
//     outline: "none",
//     fontSize: "14px",
//     boxSizing: "border-box",
//     background: "white",
//   },

//   modalOverlay: {
//     position: "fixed",
//     inset: 0,
//     background: "rgba(0,0,0,0.45)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 9999,
//     padding: "20px",
//   },

//   modal: {
//     background: "white",
//     width: "100%",
//     maxWidth: "700px",
//     borderRadius: "20px",
//     padding: "28px",
//     maxHeight: "90vh",
//     overflowY: "auto",
//   },

//   productDropdown: {
//     position: "absolute",
//     top: "48px",
//     left: 0,
//     right: 0,
//     background: "white",
//     border: "1px solid #cbd5e1",
//     borderRadius: "12px",
//     boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
//     zIndex: 10,
//     maxHeight: "280px",
//     overflowY: "auto",
//     padding: "8px 0",
//   },

//   dropdownItem: {
//     width: "100%",
//     padding: "12px 16px",
//     border: "none",
//     background: "transparent",
//     textAlign: "left",
//     cursor: "pointer",
//     display: "flex",
//     flexDirection: "column",
//     gap: "4px",
//   },

//   dropdownProductMeta: {
//     margin: 0,
//     fontSize: "13px",
//     color: "#64748b",
//   },

//   dropdownMessage: {
//     padding: "12px 16px",
//     color: "#64748b",
//     fontSize: "14px",
//   },

//   formGrid: {
//     display: "grid",
//     gridTemplateColumns: "1fr 1fr",
//     gap: "18px",
//   },

//   label: {
//     display: "block",
//     marginBottom: "8px",
//     fontWeight: "600",
//     fontSize: "14px",
//     color: "#334155",
//   },
// };

// const initialForm = {
//   couponCode: "",
//   discount: "",
//   usages: "",
//   expires: "",
//   status: "active",
//   type: "cart",
//   selectedProducts: [],
// };

// const formatDate = (value) => {
//   if (!value) return "-";

//   const date = new Date(value);
//   return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
// };

// const getCouponDiscount = (coupon) => {
//   const value = coupon.discountValue ?? coupon.discount;

//   if (value === undefined || value === null || value === "") return "-";

//   return coupon.discountType === "fixed" ? `₹${value}` : `${value}%`;
// };

// const getCouponUsage = (coupon) => {
//   const used = coupon.usedCount ?? 0;
//   const limit = coupon.usageLimit ?? coupon.usages;

//   if (limit === undefined || limit === null || limit === "") {
//     return `${used} used`;
//   }

//   return Number(limit) === 0 ? `${used} used / Unlimited` : `${used} used / ${limit}`;
// };

// export default function Coupon() {
//   const [coupons, setCoupons] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [showModal, setShowModal] = useState(false);
//   const [editingCoupon, setEditingCoupon] = useState(null);

//   const [form, setForm] = useState(initialForm);
//   const [saving, setSaving] = useState(false);

//   const [products, setProducts] = useState([]);
//   const [productPage, setProductPage] = useState(1);
//   const [hasMoreProducts, setHasMoreProducts] = useState(false);
//   const token = localStorage.getItem("token");
//   const [productSearch, setProductSearch] = useState("");
//   const [productLoading, setProductLoading] = useState(false);
//   const [showProductDropdown, setShowProductDropdown] = useState(false);

//   useEffect(() => {
//     fetchCoupons();
//   }, []);

//   const fetchProducts = useCallback(
//     async (page = 1, append = false) => {
//       try {
//         setProductLoading(true);

//         const query = new URLSearchParams({
//           limit: 5,
//           page,
//           search: productSearch,
//         });

//         const res = await fetch(`${API.products}?${query}`, {
//           headers: {
//             ...(token ? { Authorization: `Bearer ${token}` } : {}),
//           },
//         });
//         const data = await res.json();

//         const newProducts = data?.data || [];

//         setProducts((prev) =>
//           append ? [...prev, ...newProducts] : newProducts,
//         );
//         setProductPage(page);
//         setHasMoreProducts(
//           Boolean(data?.total) && page * 5 < data.total,
//         );
//         setShowProductDropdown(true);
//       } catch (error) {
//         console.error("Failed to fetch products", error);
//       } finally {
//         setProductLoading(false);
//       }
//     },
//     [productSearch, token],
//   );

//   useEffect(() => {
//     const loadProducts = async () => {
//       if (showModal && form.type === "product") {
//         await fetchProducts(1, false);
//       }
//     };

//     loadProducts();
//   }, [productSearch, showModal, form.type, fetchProducts]);

//   async function fetchCoupons() {
//     try {
//       setLoading(true);

//      const res = await fetch(API.coupons, {
//        headers: {
//          Authorization: `Bearer ${localStorage.getItem("token")}`,
//          "Content-Type": "application/json",
//        },
//      });
//       const data = await res.json();

//       setCoupons(data?.data || []);
//     } catch (error) {
//       console.error("Failed to fetch coupons", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function openCreateModal() {
//     setEditingCoupon(null);
//     setForm(initialForm);
//     setShowModal(true);
//   }

//   function openEditModal(coupon) {
//     setEditingCoupon(coupon);

//     setForm({
//       couponCode: coupon.couponCode || "",
//       discount: coupon.discountValue ?? coupon.discount ?? "",
//       usages: coupon.usageLimit ?? coupon.usages ?? "",
//       expires: (coupon.expiryDate || coupon.expires)
//         ? (coupon.expiryDate || coupon.expires).slice(0, 10)
//         : "",
//       status: coupon.status || "active",
//       type: coupon.type || "cart",
//       selectedProducts: coupon.applicableProducts || coupon.products || [],
//     });

//     setShowModal(true);
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();

//     if (!form.couponCode.trim()) {
//       alert("Coupon code is required");
//       return;
//     }

//     if (!form.discount) {
//       alert("Discount is required");
//       return;
//     }

//     if (form.type === "product" && form.selectedProducts.length === 0) {
//       alert("Select at least one product");
//       return;
//     }

//     try {
//       setSaving(true);

//       const payload = {
//         couponCode: form.couponCode.trim().toUpperCase(),
//         discount: Number(form.discount),
//         usages: Number(form.usages),
//         expires: form.expires,
//         status: form.status,
//         type: form.type,
//         products:
//           form.type === "product"
//             ? form.selectedProducts.map((product) => product._id)
//             : [],
//       };

//       const url = editingCoupon
//         ? API.update(editingCoupon._id)
//         : API.create;

//       const method = editingCoupon ? "PUT" : "POST";

//       const res = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//           ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data?.message || "Something went wrong");
//       }

//       setShowModal(false);
//       fetchCoupons();
//     } catch (error) {
//       console.error(error);
//       alert(error.message);
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(id) {
//     const confirmDelete = window.confirm(
//       "Delete this coupon permanently?"
//     );

//     if (!confirmDelete) return;

//     try {
//       const res = await fetch(API.delete(id), {
//         method: "DELETE",
//         headers: {
//           ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         },
//       });

//       if (!res.ok) {
//         throw new Error("Delete failed");
//       }

//       fetchCoupons();
//     } catch (error) {
//       console.error(error);
//       alert("Failed to delete coupon");
//     }
//   }

//   function toggleProduct(product) {
//     const exists = form.selectedProducts.some(
//       (p) => p._id === product._id
//     );

//     if (exists) {
//       setForm((prev) => ({
//         ...prev,
//         selectedProducts: prev.selectedProducts.filter(
//           (p) => p._id !== product._id
//         ),
//       }));
//     } else {
//       setForm((prev) => ({
//         ...prev,
//         selectedProducts: [...prev.selectedProducts, product],
//       }));
//     }
//   }

//   const activeCoupons = useMemo(() => {
//     return coupons.filter((c) => c.status === "active");
//   }, [coupons]);

//   return (
//     <div style={styles.page}>
//       <div style={styles.topBar}>
//         <div>
//           <h1 style={styles.heading}>Coupons</h1>

//           <p
//             style={{
//               marginTop: "6px",
//               color: "#64748b",
//               fontSize: "14px",
//             }}
//           >
//             Manage coupon discounts and product offers.
//           </p>
//         </div>

//         <button
//           style={styles.button}
//           onClick={openCreateModal}
//         >
//           + Create Coupon
//         </button>
//       </div>

//       <div
//         style={{
//           display: "flex",
//           gap: "16px",
//           marginBottom: "20px",
//           flexWrap: "wrap",
//         }}
//       >
//         <div
//           style={{
//             background: "white",
//             padding: "18px",
//             borderRadius: "14px",
//             border: "1px solid #e2e8f0",
//             minWidth: "180px",
//           }}
//         >
//           <p style={{ margin: 0, color: "#64748b" }}>
//             Total Coupons
//           </p>
//           <h2 style={{ margin: "8px 0 0" }}>
//             {coupons.length}
//           </h2>
//         </div>

//         <div
//           style={{
//             background: "white",
//             padding: "18px",
//             borderRadius: "14px",
//             border: "1px solid #e2e8f0",
//             minWidth: "180px",
//           }}
//         >
//           <p style={{ margin: 0, color: "#64748b" }}>
//             Active Coupons
//           </p>
//           <h2 style={{ margin: "8px 0 0", color: "#16a34a" }}>
//             {activeCoupons.length}
//           </h2>
//         </div>
//       </div>

//       <div style={styles.tableWrapper}>
//         <table style={styles.table}>
//           <thead>
//             <tr>
//               <th style={styles.th}>Coupon Code</th>
//               <th style={styles.th}>Discount</th>
//               <th style={styles.th}>Usages</th>
//               <th style={styles.th}>Expires</th>
//               <th style={styles.th}>Created At</th>
//               <th style={styles.th}>Type</th>
//               <th style={styles.th}>Status</th>
//               <th style={styles.th}>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {loading ? (
//               <tr>
//                 <td
//                   colSpan="8"
//                   style={{
//                     textAlign: "center",
//                     padding: "40px",
//                   }}
//                 >
//                   Loading coupons...
//                 </td>
//               </tr>
//             ) : coupons.length === 0 ? (
//               <tr>
//                 <td
//                   colSpan="8"
//                   style={{
//                     textAlign: "center",
//                     padding: "40px",
//                     color: "#64748b",
//                   }}
//                 >
//                   No coupons found.
//                 </td>
//               </tr>
//             ) : (
//               coupons.map((coupon) => (
//                 <tr key={coupon._id}>
//                   <td style={styles.td}>
//                     <strong>{coupon.couponCode}</strong>
//                   </td>

//                   <td style={styles.td}>
//                     {getCouponDiscount(coupon)}
//                   </td>

//                   <td style={styles.td}>
//                     {getCouponUsage(coupon)}
//                   </td>

//                   <td style={styles.td}>
//                     {formatDate(coupon.expiryDate || coupon.expires)}
//                   </td>

//                   <td style={styles.td}>
//                     {formatDate(coupon.createdAt)}
//                   </td>

//                   <td style={styles.td}>
//                     {coupon.type === "product"
//                       ? "Product Applicable"
//                       : "Cart Applicable"}
//                   </td>

//                   <td style={styles.td}>
//                     <span
//                       style={{
//                         background:
//                           coupon.status === "active"
//                             ? "#dcfce7"
//                             : "#fee2e2",
//                         color:
//                           coupon.status === "active"
//                             ? "#166534"
//                             : "#991b1b",
//                         padding: "6px 12px",
//                         borderRadius: "999px",
//                         fontSize: "12px",
//                         fontWeight: "600",
//                       }}
//                     >
//                       {coupon.status}
//                     </span>
//                   </td>

//                   <td style={styles.td}>
//                     <div
//                       style={{
//                         display: "flex",
//                         gap: "10px",
//                       }}
//                     >
//                       <button
//                         onClick={() => openEditModal(coupon)}
//                         style={{
//                           width: "40px",
//                           height: "40px",
//                           padding: "0",
//                           border: "none",
//                           borderRadius: "10px",
//                           background: "#dbeafe",
//                           color: "#1d4ed8",
//                           cursor: "pointer",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                         }}
//                         title="Edit"
//                       >
//                         <EditIcon />
//                       </button>

//                       <button
//                         onClick={() => handleDelete(coupon._id)}
//                         style={{
//                           width: "40px",
//                           height: "40px",
//                           padding: "0",
//                           border: "none",
//                           borderRadius: "10px",
//                           background: "#fee2e2",
//                           color: "#b91c1c",
//                           cursor: "pointer",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                         }}
//                         title="Delete"
//                       >
//                         <DeleteIcon />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {showModal && (
//         <div style={styles.modalOverlay}>
//           <div style={styles.modal}>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: "24px",
//               }}
//             >
//               <h2
//                 style={{
//                   margin: 0,
//                   fontSize: "24px",
//                   color: "#0f172a",
//                 }}
//               >
//                 {editingCoupon
//                   ? "Update Coupon"
//                   : "Create Coupon"}
//               </h2>

//               <button
//                 onClick={() => setShowModal(false)}
//                 style={{
//                   border: "none",
//                   background: "transparent",
//                   fontSize: "24px",
//                   cursor: "pointer",
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleSubmit}>
//               <div style={styles.formGrid}>
//                 <div>
//                   <label style={styles.label}>
//                     Coupon Code
//                   </label>

//                   <input
//                     style={styles.input}
//                     value={form.couponCode}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         couponCode: e.target.value,
//                       }))
//                     }
//                     placeholder="SAVE20"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>
//                     Discount (%)
//                   </label>

//                   <input
//                     type="number"
//                     style={styles.input}
//                     value={form.discount}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         discount: e.target.value,
//                       }))
//                     }
//                     placeholder="10"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Usages</label>

//                   <input
//                     type="number"
//                     style={styles.input}
//                     value={form.usages}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         usages: e.target.value,
//                       }))
//                     }
//                     placeholder="100"
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>
//                     Expiry Date
//                   </label>

//                   <input
//                     type="date"
//                     style={styles.input}
//                     value={form.expires}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         expires: e.target.value,
//                       }))
//                     }
//                   />
//                 </div>

//                 <div>
//                   <label style={styles.label}>Status</label>

//                   <select
//                     style={styles.select}
//                     value={form.status}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         status: e.target.value,
//                       }))
//                     }
//                   >
//                     <option value="active">Active</option>
//                     <option value="inactive">Inactive</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label style={styles.label}>
//                     Coupon Type
//                   </label>

//                   <select
//                     style={styles.select}
//                     value={form.type}
//                     onChange={(e) =>
//                       setForm((prev) => ({
//                         ...prev,
//                         type: e.target.value,
//                         selectedProducts: [],
//                       }))
//                     }
//                   >
//                     <option value="cart">
//                       Cart Applicable
//                     </option>

//                     <option value="product">
//                       Product Applicable
//                     </option>
//                   </select>
//                 </div>
//               </div>

//               {form.type === "product" && (
//                 <div
//                   style={{
//                     marginTop: "24px",
//                     border: "1px solid #e2e8f0",
//                     borderRadius: "14px",
//                     padding: "18px",
//                   }}
//                 >
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       marginBottom: "14px",
//                       flexWrap: "wrap",
//                       gap: "12px",
//                     }}
//                   >
//                     <h3
//                       style={{
//                         margin: 0,
//                         fontSize: "18px",
//                       }}
//                     >
//                       Select Products
//                     </h3>

//                     <div style={{ position: "relative" }}>
//                       <input
//                         style={{
//                           ...styles.input,
//                           width: "260px",
//                         }}
//                         value={productSearch}
//                         onChange={(e) => {
//                           setProductSearch(e.target.value);
//                           setShowProductDropdown(true);
//                         }}
//                         onFocus={() => setShowProductDropdown(true)}
//                         placeholder="Search product from database"
//                       />

//                       {showProductDropdown && (
//                         <div style={styles.productDropdown}>
//                           {productLoading ? (
//                             <div style={styles.dropdownMessage}>Searching...</div>
//                           ) : products.length === 0 ? (
//                             <div style={styles.dropdownMessage}>
//                               No products found.
//                             </div>
//                           ) : (
//                             <>
//                               {products.map((product) => {
//                                 const selected = form.selectedProducts.some(
//                                   (p) => p._id === product._id,
//                                 );
//                                 return (
//                                   <button
//                                     key={product._id}
//                                     type="button"
//                                     onClick={() => {
//                                       toggleProduct(product);
//                                       setShowProductDropdown(false);
//                                       setProductSearch("");
//                                     }}
//                                     style={{
//                                       ...styles.dropdownItem,
//                                       background: selected ? "#eef2ff" : "white",
//                                     }}
//                                   >
//                                     <div>
//                                       <strong>{product.name}</strong>
//                                       <p style={styles.dropdownProductMeta}>
//                                         ₹{product.price}
//                                       </p>
//                                     </div>
//                                   </button>
//                                 );
//                               })}

//                               {hasMoreProducts && (
//                                 <button
//                                   type="button"
//                                   onClick={async () => {
//                                     await fetchProducts(productPage + 1, true);
//                                   }}
//                                   style={{
//                                     width: "100%",
//                                     border: "none",
//                                     background: "#f8fafc",
//                                     color: "#334155",
//                                     padding: "12px 16px",
//                                     cursor: "pointer",
//                                     borderTop: "1px solid #e2e8f0",
//                                     borderRadius: "0 0 12px 12px",
//                                     textAlign: "center",
//                                     fontWeight: "600",
//                                   }}
//                                 >
//                                   {productLoading
//                                     ? "Loading more..."
//                                     : "Load more products"}
//                                 </button>
//                               )}
//                             </>
//                           )}
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {!showProductDropdown && (
//                     <div
//                       style={{
//                         display: "grid",
//                         gridTemplateColumns:
//                           "repeat(auto-fill,minmax(220px,1fr))",
//                         gap: "12px",
//                       }}
//                     >
//                       {productLoading ? (
//                         <p>Loading products...</p>
//                       ) : products.length === 0 ? (
//                         <p>No products found.</p>
//                       ) : (
//                         products.map((product) => {
//                           const selected =
//                             form.selectedProducts.some(
//                               (p) => p._id === product._id
//                             );

//                           return (
//                             <div
//                               key={product._id}
//                               onClick={() => toggleProduct(product)}
//                               style={{
//                                 border: selected
//                                   ? "2px solid #6366f1"
//                                   : "1px solid #e2e8f0",
//                                 borderRadius: "12px",
//                                 padding: "14px",
//                                 cursor: "pointer",
//                                 background: selected
//                                   ? "#eef2ff"
//                                   : "white",
//                                 transition: "0.2s",
//                               }}
//                             >
//                               <h4
//                                 style={{
//                                   margin: 0,
//                                   fontSize: "15px",
//                                   color: "#0f172a",
//                                 }}
//                               >
//                                 {product.name}
//                               </h4>

//                               <p
//                                 style={{
//                                   marginTop: "8px",
//                                   marginBottom: 0,
//                                   fontSize: "13px",
//                                   color: "#64748b",
//                                 }}
//                               >
//                                 ₹{product.price}
//                               </p>
//                             </div>
//                           );
//                         })
//                       )}
//                     </div>
//                   )}

//                   {form.selectedProducts.length > 0 && (
//                     <div style={{ marginTop: "18px" }}>
//                       <h4
//                         style={{
//                           marginBottom: "10px",
//                           fontSize: "15px",
//                         }}
//                       >
//                         Selected Products
//                       </h4>

//                       <div
//                         style={{
//                           display: "flex",
//                           flexWrap: "wrap",
//                           gap: "10px",
//                         }}
//                       >
//                         {form.selectedProducts.map((product) => (
//                           <div
//                             key={product._id}
//                             style={{
//                               background: "#6366f1",
//                               color: "white",
//                               padding: "8px 12px",
//                               borderRadius: "999px",
//                               fontSize: "13px",
//                               display: "flex",
//                               alignItems: "center",
//                               gap: "8px",
//                             }}
//                           >
//                             {product.name}

//                             <span
//                               onClick={() => toggleProduct(product)}
//                               style={{
//                                 cursor: "pointer",
//                                 fontWeight: "700",
//                               }}
//                             >
//                               ×
//                             </span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {form.status === "inactive" && (
//                 <div
//                   style={{
//                     marginTop: "20px",
//                     background: "#fef2f2",
//                     border: "1px solid #fecaca",
//                     padding: "14px",
//                     borderRadius: "12px",
//                     color: "#991b1b",
//                     fontSize: "14px",
//                     fontWeight: "500",
//                   }}
//                 >
//                   Inactive coupons will not apply discounts
//                   on cart or products.
//                 </div>
//               )}

//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "flex-end",
//                   gap: "12px",
//                   marginTop: "28px",
//                 }}
//               >
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   style={{
//                     padding: "12px 18px",
//                     borderRadius: "10px",
//                     border: "1px solid #cbd5e1",
//                     background: "white",
//                     cursor: "pointer",
//                     fontWeight: "600",
//                   }}
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="submit"
//                   disabled={saving}
//                   style={{
//                     ...styles.button,
//                     opacity: saving ? 0.7 : 1,
//                   }}
//                 >
//                   {saving
//                     ? "Saving..."
//                     : editingCoupon
//                     ? "Update Coupon"
//                     : "Create Coupon"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
