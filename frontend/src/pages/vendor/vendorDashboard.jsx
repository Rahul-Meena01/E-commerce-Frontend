import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Package,
  Tag,
  Clock,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  ChevronRight,
  User,
} from "lucide-react";

import API from "../../utils/api";
import "../../styles/vendor.css";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const PENDING_STATUSES = ["pending"];
const RECENT_ORDERS_LIMIT = 5;

// ─────────────────────────────────────────────────────────────
// Status Config
// ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-purple",
  delivered: "badge-success",
  cancelled: "badge-error",
};

const getStatusBadgeClass = (status = "") =>
  STATUS_CONFIG[status.toLowerCase()] || "badge-secondary";

// ─────────────────────────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────────────────────────
const Skeleton = ({ className = "skeleton-text", width, height }) => (
  <div className={`skeleton ${className}`} style={{ width, height }} />
);

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, loading, error, linkTo }) {
  const card = (
    <div className="stat-card">
      {/* Icon */}
      <div className={`stat-icon ${colorClass}`}>
        <Icon size={20} />
      </div>

      {/* Value */}
      {loading ? (
        <Skeleton width="80px" height="34px" className="skeleton-title" />
      ) : (
        <div className="stat-value">
          {error ? <span style={{ color: "#f87171" }}>—</span> : value ?? 0}
        </div>
      )}

      {/* Label */}
      {loading ? (
        <Skeleton width="100px" height="12px" />
      ) : (
        <div className={`stat-label ${error ? "error" : ""}`}>
          {error ? "Failed to load" : label}
        </div>
      )}
    </div>
  );

  return linkTo ? (
    <Link to={linkTo} style={{ textDecoration: "none", color: "inherit" }}>
      {card}
    </Link>
  ) : (
    card
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function VendorDashboard() {
  const { vendorSlug } = useParams();

  const [shopName, setShopName] = useState("");
  const [totalProducts, setTotalProducts] = useState(null);
  const [activeCoupons, setActiveCoupons] = useState(null);
  const [pendingOrders, setPendingOrders] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [errorProducts, setErrorProducts] = useState(false);
  const [errorCoupons, setErrorCoupons] = useState(false);
  const [errorOrders, setErrorOrders] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Fetch Data
  // ─────────────────────────────────────────────────────────
  const fetchAll = () => {
    setRefreshing(true);

    const p1 = API(`${BASE}/api/vendor/${vendorSlug}/me`)
      .then((d) => setShopName(d?.vendor?.shopName || vendorSlug))
      .catch(() => setShopName(vendorSlug))
      .finally(() => setLoadingProfile(false));

    const p2 = API(`${BASE}/api/vendor/${vendorSlug}/products`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data ?? d?.products ?? [];
        setTotalProducts(list.length);
        setErrorProducts(false);
      })
      .catch(() => setErrorProducts(true))
      .finally(() => setLoadingProducts(false));

    const p3 = API(`${BASE}/api/vendor/${vendorSlug}/coupons`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data ?? d?.coupons ?? [];
        setActiveCoupons(list.filter((c) => c.isActive === true).length);
        setErrorCoupons(false);
      })
      .catch(() => setErrorCoupons(true))
      .finally(() => setLoadingCoupons(false));

    const p4 = API(`${BASE}/api/vendor/${vendorSlug}/orders`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.data ?? d?.orders ?? [];
        setPendingOrders(
          list.filter((o) =>
            PENDING_STATUSES.includes((o.status || "").toLowerCase())
          ).length
        );
        setTotalRevenue(list.reduce((acc, o) => acc + (o.totalAmount || 0), 0));
        setRecentOrders(list.slice(0, RECENT_ORDERS_LIMIT));
        setErrorOrders(false);
      })
      .catch(() => setErrorOrders(true))
      .finally(() => setLoadingOrders(false));

    Promise.allSettled([p1, p2, p3, p4]).then(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchAll();
  }, [vendorSlug]);

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good Morning"
      : now.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";

  const displayName = shopName || vendorSlug;

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────
  return (
    <div className="vendor-page">
      {/* Header */}
      <div className="vendor-header">
        <div className="vendor-header-content">
          <div className="subtitle">Vendor Overview</div>
          <h1>
            {greeting}
            {loadingProfile ? "..." : `, ${displayName}`} 👋
          </h1>
          <p className="description">
            {now.toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="vendor-header-actions">
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "refresh-spin" : ""}
              style={refreshing ? { animation: "spin 1s linear infinite" } : {}}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Products"
          value={totalProducts}
          icon={Package}
          colorClass="primary"
          loading={loadingProducts}
          error={errorProducts}
          linkTo={`/vendor/${vendorSlug}/products`}
        />

        <StatCard
          label="Active Coupons"
          value={activeCoupons}
          icon={Tag}
          colorClass="success"
          loading={loadingCoupons}
          error={errorCoupons}
          linkTo={`/vendor/${vendorSlug}/coupons`}
        />

        <StatCard
          label="Pending Orders"
          value={pendingOrders}
          icon={Clock}
          colorClass="warning"
          loading={loadingOrders}
          error={errorOrders}
          linkTo={`/vendor/${vendorSlug}/orders`}
        />

        <StatCard
          label="Total Revenue"
          value={
            totalRevenue !== null
              ? `₹${Number(totalRevenue).toLocaleString("en-IN")}`
              : null
          }
          icon={TrendingUp}
          colorClass="purple"
          loading={loadingOrders}
          error={errorOrders}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginBottom: "40px" }}>
        {[
          {
            label: "Add Product",
            icon: Package,
            to: `/vendor/${vendorSlug}/products`, // usually there's a modal or new page, linking to list for now
            color: "#2563eb",
            bg: "#dbeafe"
          },
          {
            label: "Create Coupon",
            icon: Tag,
            to: `/vendor/${vendorSlug}/coupons`,
            color: "#16a34a",
            bg: "#dcfce7"
          },
          {
            label: "Manage Orders",
            icon: ShoppingBag,
            to: `/vendor/${vendorSlug}/orders`,
            color: "#d97706",
            bg: "#fef9c3"
          },
        ].map(({ label, icon: Icon, to, color, bg }) => (
          <Link key={label} to={to} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="item" style={{ background: "var(--primary-bg)", cursor: "pointer" }}>
              <div className="item-content">
                <div className="item-icon" style={{ background: bg, color: color }}>
                  <Icon size={18} />
                </div>
                <div className="item-text">
                  <h3 style={{ margin: 0, fontSize: "15px" }}>{label}</h3>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: "var(--spacing-xl)", marginBottom: 0, borderBottom: "1px solid var(--border-color)" }}>
          <h3 className="card-title">
            <ShoppingBag size={20} />
            Recent Orders
          </h3>
          <Link
            to={`/vendor/${vendorSlug}/orders`}
            style={{
              color: "var(--info)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            View All
          </Link>
        </div>

        {/* Error */}
        {!loadingOrders && errorOrders && (
          <div className="empty-state" style={{ minHeight: "200px" }}>
            <AlertCircle size={36} color="var(--error)" style={{ marginBottom: "16px" }} />
            <p className="text-secondary">Failed to load orders.</p>
          </div>
        )}

        {/* Empty */}
        {!loadingOrders && !errorOrders && recentOrders.length === 0 && (
          <div className="empty-state" style={{ minHeight: "200px" }}>
            <p className="text-secondary">No orders found.</p>
          </div>
        )}

        {/* Loading */}
        {loadingOrders && (
          <div style={{ padding: "var(--spacing-xl)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <Skeleton height="60px" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!loadingOrders && !errorOrders && recentOrders.length > 0 && (
          <div className="table-container" style={{ border: "none", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, idx) => {
                  const orderId = order._id || order.id || idx;
                  const shortId = String(orderId).slice(-6).toUpperCase();
                  const customer = order.user?.name || order.user?.email || "Unknown";
                  const itemCount = order.orderItems?.length || 0;
                  const total = order.totalAmount != null
                    ? `₹${Number(order.totalAmount).toLocaleString("en-IN")}`
                    : "—";
                  const status = order.status || "unknown";

                  return (
                    <tr key={orderId}>
                      <td style={{ color: "var(--info)", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                        #{shortId}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "30px", height: "30px", borderRadius: "50%",
                            background: "var(--tertiary-bg)", display: "flex",
                            alignItems: "center", justifyContent: "center"
                          }}>
                            <User size={14} className="text-muted" />
                          </div>
                          {customer}
                        </div>
                      </td>
                      <td>{itemCount} items</td>
                      <td style={{ fontWeight: 600 }}>{total}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(status)}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
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
  );
}

export default VendorDashboard;
