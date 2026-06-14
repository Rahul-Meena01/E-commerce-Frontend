import { ShoppingBag, CheckCircle } from "lucide-react";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "../../../utils/pricing";

const ProfileSectionOrders = ({ orders, ordersLoading, navigate }) => {
  return (
    <div className="profile-section-orders">
      <div className="profile-section-header">
        <h2 className="profile-section-title">Order History</h2>
        <p className="profile-section-subtitle">
          {orders.length > 0
            ? `${orders.length} order${orders.length > 1 ? "s" : ""}`
            : "Your recent purchases will appear here"}
        </p>
      </div>

      {ordersLoading ? (
        <div className="profile-empty-state">
          <ShoppingBag size={48} color="#d0d0d0" />
          <h3>Loading orders...</h3>
        </div>
      ) : orders.length > 0 ? (
        <div className="profile-orders-grid">
          {orders.map((order) => {
            const items = order.orderItems || order.items || [];
            const firstItem = items[0];
            const rawStatus = order.orderStatus || order.status || "processing";
            const statusType = rawStatus.toLowerCase();
            const statusText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
            const orderNum = order.orderNumber || `#${order._id?.slice(-8).toUpperCase() || ""}`;
            const orderDate = new Date(order.createdAt).toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            );
            const price = order.totalAmount ?? order.totalPrice ?? order.grandTotal ?? 0;

            return (
              <div key={order._id} className="profile-order-card">
                <div className="profile-order-image">
                  <OptimizedImage
                    src={firstItem?.image}
                    alt={firstItem?.name || "Order"}
                  />
                  <div className={`profile-order-status ${statusType}`}>
                    <CheckCircle />
                    {statusText}
                  </div>
                </div>
                <div className="profile-order-content">
                  <h4 className="profile-order-name">
                    {firstItem?.name || "Order"}
                    {items.length > 1
                      ? ` +${items.length - 1} more`
                      : ""}
                  </h4>
                  <p className="profile-order-id">{orderNum}</p>
                  <div className="profile-order-meta">
                    <span className="profile-order-date">{orderDate}</span>
                    <span className="profile-order-price">
                      {formatPrice(price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="profile-empty-state">
          <ShoppingBag size={48} color="#d0d0d0" />
          <h3>No orders yet</h3>
          <p>Once you place your first order, it will show up here.</p>
          <button
            className="profile-cta-btn"
            onClick={() => navigate("/shop/men")}
          >
            Start Shopping
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSectionOrders;
