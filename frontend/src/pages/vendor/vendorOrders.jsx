import { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useParams } from "react-router-dom";
import {
  ShoppingBag,
  Eye,
  Printer,
  Calendar,
  User,
  MapPin,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import API from "../../utils/api";
import Pagination from "../../components/Pagination";
import "../../styles/vendor.css";

const PAGE_SIZE = 10;

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const STATUS_CONFIG = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-purple",
  delivered: "badge-success",
  cancelled: "badge-error",
};
// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  "₹" +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Image detector (handles http/https/relative paths) ────────────────────────
const isImageUrl = (src) => {
  if (!src || typeof src !== "string") return false;
  return (
    src.startsWith("http") ||
    src.startsWith("/") ||
    src.startsWith("./") ||
    src.startsWith("../")
  );
};



// ── PDF Generation ────────────────────────────────────────────────────────────
const generateVendorInvoicePDF = (order, shopName) => {
  if (!order) return;
  const doc = new jsPDF();

  const fmtPlain = (n) =>
    "Rs. " +
    Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("LOFT", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Premium E-commerce Experience", 14, 28);

  // Vendor Details
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Vendor Details", 130, 22);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Store: ${shopName || "Unknown Vendor"}`, 130, 28);
  doc.text("Contact: Vendor Portal", 130, 34);

  // Invoice Info
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", 14, 45);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Order ID: ${order.orderNumber || order._id?.slice(-6).toUpperCase() || order._id}`, 14, 53);
  doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN")}`, 14, 59);

  // Customer Details
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", 14, 73);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Name: ${order.user?.name || "N/A"}`, 14, 80);
  doc.text(`Email: ${order.user?.email || "N/A"}`, 14, 86);
  doc.text(`Phone: ${order.user?.phone || "N/A"}`, 14, 92);

  // Shipping Details
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Shipped To:", 100, 73);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`${order.shippingAddress?.address || ""}`, 100, 80);
  doc.text(`${order.shippingAddress?.city || ""}, ${order.shippingAddress?.postalCode || ""}`, 100, 86);
  doc.text(`${order.shippingAddress?.country || ""}`, 100, 92);

  // Items Table
  const tableColumn = ["Item", "Quantity", "Price", "Total"];
  const tableRows = [];

  const itemsList = order.orderItems || order.items || [];
  
  if (itemsList.length > 0) {
    itemsList.forEach((item) => {
      const itemData = [
        item.name,
        item.qty.toString(),
        fmtPlain(item.price),
        fmtPlain(item.qty * item.price),
      ];
      tableRows.push(itemData);
    });
  }

  autoTable(doc, {
    startY: 105,
    head: [tableColumn],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59] },
  });

  const finalY = doc.lastAutoTable.finalY || 105;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Vendor Items Subtotal:", 130, finalY + 10);
  
  let currentY = finalY + 16;
  const vendorTotal = order.totalAmount || 0; 
  
  doc.setTextColor(0);
  doc.text(`${fmtPlain(vendorTotal)}`, 170, finalY + 10);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Vendor Total:", 130, currentY);
  doc.text(`${fmtPlain(vendorTotal)}`, 170, currentY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Payment Method: ${order.paymentMethod || "N/A"}`, 14, finalY + 10);
  doc.text(`Payment Status: ${order.isPaid ? "Paid" : "Pending"}`, 14, finalY + 16);

  doc.save(`LOFT_Invoice_${order.orderNumber || order._id?.slice(-6).toUpperCase() || order._id}.pdf`);
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#eee", color: "#555" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function PayBadge({ paid }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: paid ? "#E1F5EE" : "#FCEBEB",
        color: paid ? "#0F6E56" : "#A32D2D",
      }}
    >
      {paid ? "Paid" : "Unpaid"}
    </span>
  );
}


function SectionCard({ icon, title, children }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        borderRadius: 10,
        padding: "12px 14px",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6b7280",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueStyle = {} }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 13,
        padding: "3px 0",
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          textAlign: "right",
          maxWidth: "55%",
          ...valueStyle,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#e5e7eb", margin: "7px 0" }} />;
}


function DetailPanel({ order, onClose, onStatusUpdate, updating }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!order) return null;

  const STEPS = ["Pending", "Processing", "Shipped", "Delivered"];
  const stepIdx = STEPS.indexOf(order.status);
  const isCancelled = order.status === "Cancelled";
  const timeMap = {
    Pending: order.createdAt,
    Processing: order.paidAt || null,
    Shipped: null,
    Delivered: order.deliveredAt || null,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 200,
          animation: "fadeIn 0.18s ease",
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 500,
          maxWidth: "95vw",
          height: "100vh",
          overflowY: "auto",
          background: "#fff",
          borderLeft: "1px solid #e5e7eb",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.22s ease",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Order #{order.shortId || order._id?.slice(-6).toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {fmtDateTime(order.createdAt)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`badge ${STATUS_CONFIG[(order.status || "pending").toLowerCase()] || "badge-warning"}`}>{order.status}</span>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: 20,
                display: "flex",
                padding: 4,
                borderRadius: 6,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Customer + Shipping */}
          <SectionCard icon="👤" title="Customer">
            <InfoRow label="Name" value={order.user?.name || "—"} />
            <InfoRow
              label="Email"
              value={order.user?.email || "—"}
              valueStyle={{ color: "#2563eb" }}
            />
            <InfoRow label="Phone" value={order.user?.phone || "—"} />
            <Divider />
            <InfoRow
              label="Address"
              value={order.shippingAddress?.address || "—"}
            />
            <InfoRow
              label="City"
              value={`${order.shippingAddress?.city || ""}${order.shippingAddress?.postalCode ? ", " + order.shippingAddress.postalCode : ""}`}
            />
            <InfoRow
              label="Country"
              value={order.shippingAddress?.country || "—"}
            />
          </SectionCard>

          {/* Items */}
          <SectionCard icon="📦" title="Items Ordered">
            {order.orderItems?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom:
                    i < order.orderItems.length - 1
                      ? "1px solid #f3f4f6"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {isImageUrl(item.image) ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentNode.textContent = "📦";
                      }}
                    />
                  ) : (
                    item.image || "📦"
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    Qty: {item.qty} × {fmt(item.price)}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {fmt(item.price * item.qty)}
                </div>
              </div>
            ))}
          </SectionCard>

          {/* Price breakdown */}
          <SectionCard icon="🧾" title="Price Breakdown">
            <InfoRow label="Items subtotal" value={fmt(order.totalAmount)} />
            {order.couponApplied && order.discountAmount > 0 && (
              <InfoRow 
                label={`Coupon (${order.couponApplied})`} 
                value={`-${fmt(order.discountAmount)}`} 
                valueStyle={{ color: '#0F6E56' }} 
              />
            )}
            {order.giftCardApplied && order.giftCardDiscountAmount > 0 && (
              <InfoRow 
                label={`Gift Card (${order.giftCardApplied})`} 
                value={`-${fmt(order.giftCardDiscountAmount)}`} 
                valueStyle={{ color: '#0F6E56' }} 
              />
            )}
            <InfoRow label="GST" value={fmt(order.taxPrice)} />
            <InfoRow
              label="Shipping"
              value={
                order.shippingPrice === 0 ? "Free" : fmt(order.shippingPrice)
              }
            />
            <Divider />
            <InfoRow
              label="Total"
              value={fmt(order.totalAmount)}
              valueStyle={{ fontSize: 15, fontWeight: 700 }}
            />
            <Divider />
            <InfoRow label="Payment method" value={order.paymentMethod} />
            <InfoRow
              label="Payment status"
              value={<PayBadge paid={order.isPaid} />}
            />
            {order.isPaid && order.paidAt && (
              <InfoRow label="Paid on" value={fmtDate(order.paidAt)} />
            )}
          </SectionCard>

          {/* Tracking */}
          <SectionCard
            icon="🚚"
            title={
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Shipping Status
                {isCancelled && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      background: "#FCEBEB",
                      color: "#A32D2D",
                    }}
                  >
                    Cancelled
                  </span>
                )}
              </span>
            }
          >
            {STEPS.map((step, i) => {
              let dotType =
                i < stepIdx
                  ? "done"
                  : i === stepIdx && !isCancelled
                    ? "active"
                    : "pending";
              if (isCancelled) dotType = "pending";
              const ds = {
                done: { bg: "#E1F5EE", color: "#0F6E56" },
                active: { bg: "#E6F1FB", color: "#185FA5" },
                pending: {
                  bg: "#f3f4f6",
                  color: "#9ca3af",
                  border: "1px solid #e5e7eb",
                },
              }[dotType];
              return (
                <div key={step}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "6px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        marginTop: 1,
                        background: ds.bg,
                        color: ds.color,
                        border: ds.border || "none",
                        fontWeight: 700,
                      }}
                    >
                      {dotType === "done"
                        ? "✓"
                        : dotType === "active"
                          ? "●"
                          : "○"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {step}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: timeMap[step] ? "#6b7280" : "#d1d5db",
                          marginTop: 2,
                        }}
                      >
                        {timeMap[step] ? fmtDateTime(timeMap[step]) : "Pending"}
                      </div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        width: 1.5,
                        height: 20,
                        marginLeft: 10,
                        marginBottom: 2,
                        background: dotType === "done" ? "#5DCAA5" : "#e5e7eb",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </SectionCard>

          {/* Update Status */}
          <SectionCard icon="🔧" title="Update Status">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 4,
              }}
            >
              {["Processing", "Shipped", "Delivered", "Cancelled"].map((s) => (
                <button
                  key={s}
                  disabled={updating || order.status === s}
                  onClick={() => onStatusUpdate(order._id, s)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor:
                      order.status === s
                        ? "transparent"
                        : s === "Cancelled"
                          ? "#fca5a5"
                          : "#cbd5e1",
                    borderRadius: 8,
                    cursor:
                      order.status === s || updating
                        ? "default"
                        : "pointer",
                    background:
                      order.status === s
                        ? s === "Cancelled"
                          ? "#FCEBEB"
                          : "#f1f5f9"
                        : "#fff",
                    color: s === "Cancelled" ? "#dc2626" : "#1e293b",
                    opacity: updating ? 0.6 : 1,
                  }}
                >
                  {s === "Cancelled" ? "✕ " : ""}
                  {s}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  );
}




function VendorOrders() {
  const { vendorSlug } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [shopName, setShopName] = useState("Unknown");
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    API(`${BASE}/api/vendor/${vendorSlug}/me`)
      .then(d => setShopName(d?.vendor?.shopName || vendorSlug))
      .catch(() => {});
  }, [vendorSlug]);

  useEffect(() => {
    fetchOrders();
  }, [vendorSlug]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const resData = await API(`${BASE}/api/vendor/${vendorSlug}/orders`);
      const list = Array.isArray(resData) ? resData : resData?.data ?? resData?.orders ?? [];
      setOrders(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError("Failed to load orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order ID", "Date", "Customer Name", "Customer Email", "Items Count", "Vendor Total", "Status", "Payment Method"];
    const rows = filteredOrders.map(o => [
      o.orderNumber || o._id?.slice(-8),
      new Date(o.createdAt).toLocaleDateString("en-IN"),
      o.user?.name || "N/A",
      o.user?.email || "N/A",
      (o.orderItems || []).length,
      o.totalAmount || 0,
      o.status || "Unknown",
      o.paymentMethod || "N/A"
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
    ].join("\\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendor_orders_${vendorSlug}.csv`;
    link.click();
  };

  const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === "pending").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const deliveredOrders = orders.filter((o) => o.status?.toLowerCase() === "delivered").length;

  const getStatusBadgeClass = (status) => {
    return STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
  };

  const ALLOWED_TRANSITIONS = {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
  };

  const getAvailableStatuses = (currentStatus) => {
    const current = (currentStatus || "pending").toLowerCase();
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    return [current, ...allowed];
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await API(`${BASE}/api/vendor/${vendorSlug}/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (err) {
      alert(err.message || "Failed to update order status");
    }
  };

  return (
    <div className="vendor-page">
      {/* Header */}
      <div className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle">📦 Sales</div>
          <h1>Orders Management</h1>
          <p className="description">Track and manage all customer orders</p>
        </div>
        <div className="vendor-header-actions">
          <button onClick={exportToCSV} className="btn btn-secondary">
            <Printer size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value">{pendingOrders}</div>
            <div className="stat-label">Pending Orders</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="stat-value">{deliveredOrders}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="stat-value">₹{totalRevenue?.toLocaleString("en-IN") || "0"}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { value: "all", label: "All Orders" },
            { value: "pending", label: "Pending" },
            { value: "processing", label: "Processing" },
            { value: "shipped", label: "Shipped" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={statusFilter === btn.value ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>


      {detailOrder && (
        <DetailPanel 
          order={detailOrder} 
          onClose={() => setDetailOrder(null)} 
          onStatusUpdate={handleStatusChange} 
          updating={false} 
        />
      )}

      {/* Content */}
      {loading && (
        <div className="grid-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton skeleton-title" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card" style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--error)" }}>
          <AlertCircle size={20} style={{ display: "inline", marginRight: "8px" }} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && filteredOrders.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <ShoppingBag size={32} />
          </div>
          <h3 className="empty-state-title">No orders found</h3>
          <p className="empty-state-description">Orders will appear here once customers place them</p>
        </div>
      )}

      {!loading && !error && filteredOrders.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer Details</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const badgeClass = getStatusBadgeClass(order.status);
                return (
                  <tr key={order._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="stat-icon info" style={{ width: 32, height: 32 }}>
                          <ShoppingBag size={16} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                            Order #{order.orderNumber || order._id?.slice(-8)}
                          </h3>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={13} className="text-muted" /> 
                          {order.user?.name || order.user?.email || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                        {order.createdAt ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={13} />
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        ) : "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        ₹{order.totalAmount?.toLocaleString("en-IN") || "0"}
                      </div>
                    </td>
                    <td>
                      <select 
                        value={(order.status || "pending").toLowerCase()}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className={`badge ${badgeClass}`}
                        style={{ border: "none", cursor: "pointer", outline: "none", appearance: "auto" }}
                      >
                        {getAvailableStatuses(order.status).map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setDetailOrder(order)} className="btn btn-icon btn-secondary" title="View Details"><Eye size={16} /></button>
                        <button onClick={() => generateVendorInvoicePDF(order, shopName)} className="btn btn-icon btn-secondary" title="Print Invoice"><Printer size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={safePage} pages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default VendorOrders;
