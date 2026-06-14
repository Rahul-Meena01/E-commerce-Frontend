import { useEffect, useState } from "react";
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
import "../../styles/vendor.css";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const STATUS_CONFIG = {
  pending: "badge-warning",
  processing: "badge-info",
  shipped: "badge-purple",
  delivered: "badge-success",
  cancelled: "badge-error",
};

function VendorOrders() {
  const { vendorSlug } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

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

  const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === "pending").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const deliveredOrders = orders.filter((o) => o.status?.toLowerCase() === "delivered").length;

  const getStatusBadgeClass = (status) => {
    return STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
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
          <button className="btn btn-secondary">
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
            <div className="stat-value">₹{(totalRevenue / 100000).toFixed(1)}L</div>
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
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
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
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {order.customerName && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                            <User size={13} /> {order.customerName}
                          </span>
                        )}
                        {order.createdAt && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={13} />
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        ₹{order.totalAmount?.toLocaleString("en-IN") || "0"}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {(order.status || "Pending").charAt(0).toUpperCase() + (order.status || "Pending").slice(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-icon btn-secondary" title="View Details">
                          <Eye size={16} />
                        </button>
                        <button className="btn btn-icon btn-secondary" title="Print Invoice">
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)", fontSize: "13px", color: "var(--text-muted)" }}>
            Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorOrders;
