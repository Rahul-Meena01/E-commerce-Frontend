import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useOrderActions } from "../../orders/context/OrderActionsContext";
import OrderCard from "../../orders/components/OrderCard";
import CancelOrderModal from "../../orders/components/CancelOrderModal";
import ReturnOrderModal from "../../orders/components/ReturnOrderModal";
import "../../orders/styles/orders.css";

const ProfileSectionOrders = ({ orders, ordersLoading, navigate }) => {
  const { getMergedOrders, cancelOrder, requestReturn } = useOrderActions();
  const mergedOrders = getMergedOrders(orders);

  const [activeOrderId, setActiveOrderId] = useState(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  const handleCancelClick = (orderId) => {
    setActiveOrderId(orderId);
    setIsCancelOpen(true);
  };

  const handleReturnClick = (orderId) => {
    setActiveOrderId(orderId);
    setIsReturnOpen(true);
  };

  const handleCancelConfirm = (orderId, reason) => {
    cancelOrder(orderId, reason);
  };

  const handleReturnConfirm = (orderId, payload) => {
    requestReturn(orderId, payload);
  };

  const handleViewDetails = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="profile-section-orders">
      <div className="profile-section-header">
        <h2 className="profile-section-title">Order History</h2>
        <p className="profile-section-subtitle">
          {mergedOrders.length > 0
            ? `${mergedOrders.length} order${mergedOrders.length > 1 ? "s" : ""}`
            : "Your recent purchases will appear here"}
        </p>
      </div>

      {ordersLoading ? (
        <div className="profile-empty-state">
          <ShoppingBag size={48} color="#d0d0d0" className="animate-pulse" />
          <h3>Loading orders...</h3>
        </div>
      ) : mergedOrders.length > 0 ? (
        <div className="profile-orders-grid" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {mergedOrders.map((order) => (
            <OrderCard
              key={order._id || order.id}
              order={order}
              onCancelClick={handleCancelClick}
              onReturnClick={handleReturnClick}
              onViewDetailsClick={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="loft-empty-state">
          <ShoppingBag size={48} />
          <h3>No Orders Found</h3>
          <p>Once you place your first order, it will show up here.</p>
          <button
            className="loft-btn loft-btn-primary"
            onClick={() => navigate("/shop")}
          >
            Start Shopping
          </button>
        </div>
      )}

      {activeOrderId && (
        <>
          <CancelOrderModal
            isOpen={isCancelOpen}
            onClose={() => {
              setIsCancelOpen(false);
              setActiveOrderId(null);
            }}
            onConfirm={handleCancelConfirm}
            orderId={activeOrderId}
          />
          <ReturnOrderModal
            isOpen={isReturnOpen}
            onClose={() => {
              setIsReturnOpen(false);
              setActiveOrderId(null);
            }}
            onConfirm={handleReturnConfirm}
            orderId={activeOrderId}
          />
        </>
      )}
    </div>
  );
};

export default ProfileSectionOrders;

