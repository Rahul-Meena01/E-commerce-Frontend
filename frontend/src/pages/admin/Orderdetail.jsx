// src/pages/admin/Orderdetail.jsx
// Admin Orders List — search, filter, pagination, inline status update, slide-over detail panel

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSocket } from "../../context/SocketContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const PAGE_SIZE = 10;



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
const generateInvoicePDF = (order) => {
  if (!order) return;
  const doc = new jsPDF();

  const fmtPlain = (n) =>
    "Rs. " +
    Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("Invoice / Order Receipt", 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Order ID: ${order.shortId || order._id?.slice(-6).toUpperCase() || order._id}`, 14, 30);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, 36);

  // Customer Details
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Customer Details", 14, 50);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Name: ${order.user?.name || "N/A"}`, 14, 58);
  doc.text(`Email: ${order.user?.email || "N/A"}`, 14, 64);
  doc.text(`Phone: ${order.user?.phone || "N/A"}`, 14, 70);

  // Shipping Details
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Shipping Address", 100, 50);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${order.shippingAddress?.address || ""}`, 100, 58);
  doc.text(`${order.shippingAddress?.city || ""}, ${order.shippingAddress?.postalCode || ""}`, 100, 64);
  doc.text(`${order.shippingAddress?.country || ""}`, 100, 70);

  // Items Table
  const tableColumn = ["Item", "Quantity", "Price", "Total"];
  const tableRows = [];

  if (order.orderItems && order.orderItems.length > 0) {
    order.orderItems.forEach((item) => {
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
    startY: 85,
    head: [tableColumn],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59] },
  });

  // Price Breakdown
  const finalY = doc.lastAutoTable.finalY || 85;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Subtotal:`, 130, finalY + 10);
  
  let currentY = finalY + 16;

  if (order.couponApplied && order.discountAmount > 0) {
    doc.text(`Coupon (${order.couponApplied}):`, 130, currentY);
    doc.setTextColor(15, 110, 86); // Greenish
    doc.text(`-${fmtPlain(order.discountAmount)}`, 160, currentY);
    doc.setTextColor(100); // Reset
    currentY += 6;
  }

  if (order.giftCardApplied && order.giftCardDiscountAmount > 0) {
    doc.text(`Gift Card (${order.giftCardApplied}):`, 130, currentY);
    doc.setTextColor(15, 110, 86); // Greenish
    doc.text(`-${fmtPlain(order.giftCardDiscountAmount)}`, 160, currentY);
    doc.setTextColor(100); // Reset
    currentY += 6;
  }

  doc.text(`Tax:`, 130, currentY);
  doc.text(`${fmtPlain(order.taxPrice || 0)}`, 160, currentY);
  currentY += 6;
  
  doc.text(`Shipping:`, 130, currentY);
  doc.text(`${order.shippingPrice === 0 ? "Free" : fmtPlain(order.shippingPrice || 0)}`, 160, currentY);
  currentY += 8;

  doc.setTextColor(0);
  doc.text(`${fmtPlain(order.itemsPrice || 0)}`, 160, finalY + 10);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total:`, 130, currentY);
  doc.text(`${fmtPlain(order.totalPrice || 0)}`, 160, currentY);

  // Save the PDF
  doc.save(`Invoice_Order_${order.shortId || order._id?.slice(-6).toUpperCase() || order._id}.pdf`);
};

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Pending: { bg: "#FAEEDA", color: "#854F0B" },
  Processing: { bg: "#E6F1FB", color: "#185FA5" },
  Shipped: { bg: "#EAF3DE", color: "#3B6D11" },
  Delivered: { bg: "#E1F5EE", color: "#0F6E56" },
  Cancelled: { bg: "#FCEBEB", color: "#A32D2D" },
};

// ── Badges ────────────────────────────────────────────────────────────────────
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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────
function PgBtn({ children, active, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid",
        borderColor: active ? "#1e293b" : "#d1d5db",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        fontSize: 12,
        background: active ? "#1e293b" : "transparent",
        color: active ? "#fff" : "#374151",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Section card (used inside detail panel) ───────────────────────────────────
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

// ── Detail slide-over panel ───────────────────────────────────────────────────
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
  const stepIdx = STEPS.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === "Cancelled";
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
            <StatusBadge status={order.orderStatus} />
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
            <InfoRow label="Items subtotal" value={fmt(order.itemsPrice)} />
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
              value={fmt(order.totalPrice)}
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
                  disabled={updating || order.orderStatus === s}
                  onClick={() => onStatusUpdate(order._id, s)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor:
                      order.orderStatus === s
                        ? "transparent"
                        : s === "Cancelled"
                          ? "#fca5a5"
                          : "#cbd5e1",
                    borderRadius: 8,
                    cursor:
                      order.orderStatus === s || updating
                        ? "default"
                        : "pointer",
                    background:
                      order.orderStatus === s
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

// ── Main component ────────────────────────────────────────────────────────────
export default function Orderdetails() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const { socket } = useSocket();

  // ── Socket event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => {
        // Prevent duplicates
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      setDetailOrder((prev) =>
        prev && prev._id === updatedOrder._id ? updatedOrder : prev
      );
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderUpdated", handleOrderUpdated);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("orderUpdated", handleOrderUpdated);
    };
  }, [socket]);

  // ── Fetch all orders ───────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await API(`/api/orders?limit=all`);
      setOrders(data.orders || []);
    } catch (err) {
      const msg = err.message || "Failed to fetch orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Inline status update ───────────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    try {
      setUpdating(true);
      await API(`/api/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      const patch = (o) => {
        if (o._id !== id) return o;
        const isDeliveredNow = status === "Delivered";
        return {
          ...o,
          orderStatus: status,
          isDelivered: isDeliveredNow ? true : o.isDelivered,
          deliveredAt: isDeliveredNow ? new Date().toISOString() : o.deliveredAt,
          // COD orders are auto-marked paid on delivery (matches backend logic)
          isPaid: isDeliveredNow && o.paymentMethod === "COD" ? true : o.isPaid,
          paidAt: isDeliveredNow && o.paymentMethod === "COD" && !o.isPaid
            ? new Date().toISOString()
            : o.paidAt,
        };
      };
      setOrders((prev) => prev.map(patch));
      setDetailOrder((prev) => (prev ? patch(prev) : prev));

      if (status === "Delivered") {
        const targetOrder = orders.find((o) => o._id === id);
        if (targetOrder) {
          generateInvoicePDF({ ...targetOrder, orderStatus: "Delivered" });
        }
      }
    } catch (err) {
      console.error("Error in status update or PDF generation:", err);
      alert(err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // ── Filtered + paginated slice ─────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      (o.shortId || "").toLowerCase().includes(q) ||
      (o.user?.name || "").toLowerCase().includes(q) ||
      (o.user?.email || "").toLowerCase().includes(q) ||
      (o.user?.phone || "").includes(q);
    const matchS = !statusFilter || o.orderStatus === statusFilter;
    const matchP = !payFilter || (payFilter === "paid" ? o.isPaid : !o.isPaid);
    const matchM = !methodFilter || o.paymentMethod === methodFilter;
    return matchQ && matchS && matchP && matchM;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.orderStatus === "Pending").length,
    processing: orders.filter((o) => o.orderStatus === "Processing").length,
    shipped: orders.filter((o) => o.orderStatus === "Shipped").length,
    delivered: orders.filter((o) => o.orderStatus === "Delivered").length,
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPayFilter("");
    setMethodFilter("");
    setPage(1);
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70vh",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 32 }}>⏳</div>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Loading orders…</p>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "70vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 32 }}>⚠️</div>
        <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p>
        <button
          onClick={fetchOrders}
          style={{
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            background: "#1e293b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "20px 24px",
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Heading */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Orders Management
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          {orders.length} total orders
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Total" value={stats.total} color="#1e293b" />
        <StatCard label="Pending" value={stats.pending} color="#854F0B" />
        <StatCard label="Processing" value={stats.processing} color="#185FA5" />
        <StatCard label="Shipped" value={stats.shipped} color="#3B6D11" />
        <StatCard label="Delivered" value={stats.delivered} color="#0F6E56" />
      </div>

      {/* Table card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid #e5e7eb",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "#9ca3af",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by order ID, customer, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "7px 10px 7px 32px",
                width: "100%",
                fontSize: 13,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#f9fafb",
                color: "#111",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={selStyle}
          >
            <option value="">All statuses</option>
            {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          <select
            value={payFilter}
            onChange={(e) => {
              setPayFilter(e.target.value);
              setPage(1);
            }}
            style={selStyle}
          >
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            style={selStyle}
          >
            <option value="">All methods</option>
            {["Stripe", "PayPal", "Razorpay", "COD"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          {(search || statusFilter || payFilter || methodFilter) && (
            <button
              onClick={clearFilters}
              style={{
                ...selStyle,
                cursor: "pointer",
                color: "#dc2626",
                borderColor: "#fca5a5",
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {[
                  "Order ID",
                  "Customer",
                  "Items",
                  "Total",
                  "Phone",
                  "Date",
                  "Payment",
                  "Status",
                  "View",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "9px 12px",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                slice.map((order) => (
                  <tr
                    key={order._id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "9px 12px",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      #{order.shortId || order._id?.slice(-6).toUpperCase()}
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {order.user?.name || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {order.user?.email || ""}
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", color: "#6b7280" }}>
                      {order.orderItems?.length || 0} item
                      {order.orderItems?.length !== 1 ? "s" : ""}
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(order.totalPrice)}
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        fontSize: 12,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.user?.phone || "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        fontSize: 12,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(order.createdAt)}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <PayBadge paid={order.isPaid} />
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <select
                        value={order.orderStatus}
                        onChange={(e) =>
                          handleStatusUpdate(order._id, e.target.value)
                        }
                        disabled={updating}
                        style={{
                          fontSize: 11,
                          padding: "3px 7px",
                          border: "1px solid #d1d5db",
                          borderRadius: 20,
                          background: "#fff",
                          color: "#1e293b",
                          cursor: "pointer",
                          maxWidth: 120,
                          outline: "none",
                        }}
                        aria-label="Update order status"
                      >
                        {(() => {
                          const currentStatus = order.orderStatus;
                          let available = [];
                          if (currentStatus === "Delivered" || currentStatus === "Cancelled") {
                            available = [currentStatus];
                          } else if (currentStatus === "Pending") {
                            available = ["Pending", "Processing", "Cancelled"];
                          } else if (currentStatus === "Processing") {
                            available = ["Processing", "Shipped", "Cancelled"];
                          } else if (currentStatus === "Shipped") {
                            available = ["Shipped", "Delivered"];
                          } else {
                            available = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
                          }
                          return available.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ));
                        })()}
                      </select>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => setDetailOrder(order)}
                        title="View order details"
                        style={{
                          background: "transparent",
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          padding: "4px 10px",
                          cursor: "pointer",
                          color: "#6b7280",
                          fontSize: 14,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        👁
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderTop: "1px solid #e5e7eb",
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          <span>
            {filtered.length === 0
              ? "No orders found"
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} orders`}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PgBtn
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              ‹
            </PgBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  totalPages <= 7 ||
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - safePage) <= 1,
              )
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <PgBtn key={`e${i}`} disabled>
                    …
                  </PgBtn>
                ) : (
                  <PgBtn
                    key={p}
                    active={p === safePage}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </PgBtn>
                ),
              )}
            <PgBtn
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              ›
            </PgBtn>
          </div>
        </div>
      </div>

      {/* Detail slide-over */}
      {detailOrder && (
        <DetailPanel
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          updating={updating}
        />
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const selStyle = {
  fontSize: 13,
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#f9fafb",
  color: "#111",
  cursor: "pointer",
  outline: "none",
};