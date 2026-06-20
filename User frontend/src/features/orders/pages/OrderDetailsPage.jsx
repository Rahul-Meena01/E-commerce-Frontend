import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Receipt, ShoppingBag, AlertTriangle } from "lucide-react";
import { useOrderActions } from "../context/OrderActionsContext";
import { formatPrice } from "../../../utils/pricing";
import OrderStatusBadge from "../components/OrderStatusBadge";
import OrderTimeline from "../components/OrderTimeline";
import RefundStatusCard from "../components/RefundStatusCard";
import CancelOrderModal from "../components/CancelOrderModal";
import ReturnOrderModal from "../components/ReturnOrderModal";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import "../styles/orders.css";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrderById, cancelOrder, requestReturn, canCancelOrder, canReturnOrder } = useOrderActions();

  // TODO: GET /api/orders/:id
  // When connecting backend, fetch single order via API or React Query hook.
  const order = getOrderById(orderId);
  const loading = false; // Mock data is loaded synchronously
  
  // Modals state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  if (loading) {
    return (
      <div className="loft-empty-state" style={{ minHeight: "60vh" }}>
        <ShoppingBag size={48} className="animate-pulse" />
        <h3>Loading Order Details...</h3>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="loft-empty-state" style={{ minHeight: "60vh" }}>
        <AlertTriangle size={48} style={{ color: "var(--ds-color-danger, #8B3A3A)" }} />
        <h3>Order Not Found</h3>
        <p>We couldn't retrieve the details for order ID: {orderId}. It may not exist or has been removed.</p>
        <button
          onClick={() => navigate("/profile?tab=Orders")}
          className="loft-btn loft-btn-primary"
        >
          Back to Order History
        </button>
      </div>
    );
  }

  const items = order.orderItems || order.items || [];
  const rawStatus = order.orderStatus || order.status || "Pending";
  const statusType = rawStatus.toLowerCase();
  const orderNum = order.orderNumber || `#${order._id?.slice(-8).toUpperCase() || ""}`;
  
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const handleCancelConfirm = (id, reason) => {
    // TODO: POST /api/orders/:id/cancel
    cancelOrder(id, reason);
  };

  const handleReturnConfirm = (id, payload) => {
    // TODO: POST /api/orders/:id/return
    requestReturn(id, payload);
  };

  const price = order.totalAmount ?? order.totalPrice ?? order.grandTotal ?? order.total ?? 0;

  return (
    <div className="profile-page" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <button
        className="profile-back-btn"
        onClick={() => navigate("/profile?tab=Orders")}
        id="order-details-back-button"
      >
        <ArrowLeft />
        Back to Orders
      </button>

      {/* Header Info */}
      <div className="order-details-top-card" style={{ marginBottom: "30px", borderBottom: "1px solid var(--ds-color-border, #E8E5DE)", paddingBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <span className="loft-modal-eyebrow">ORDER DETAILS</span>
            <h1 className="order-details-title" style={{ fontSize: "2.5rem", margin: "0 0 8px 0", fontFamily: "var(--ds-font-serif)" }}>
              {orderNum}
            </h1>
            <p className="order-card-date">Placed on {orderDate}</p>
          </div>
          <OrderStatusBadge status={rawStatus} style={{ fontSize: "12px", padding: "8px 16px" }} />
        </div>
      </div>

      {/* Main Grid: Sidebar Layout on Desktop */}
      <div className="order-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "40px" }}>
        
        {/* Responsive grid mapping for desktop (2 columns: 65% / 35%) */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 992px) {
            .order-details-grid {
              grid-template-columns: 1.8fr 1fr !important;
            }
          }
        `}} />

        {/* Left Column: Products, Timeline, Refund Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          
          {/* Products List */}
          <div className="order-details-card" style={{ backgroundColor: "#FAF8F5", padding: "30px", border: "1px solid var(--ds-color-border)" }}>
            <h2 className="section-title" style={{ fontSize: "1.5rem", margin: "0 0 20px 0", borderBottom: "1px solid var(--ds-color-border)", paddingBottom: "12px" }}>
              Ordered Items
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: "20px", borderBottom: idx < items.length - 1 ? "1px solid var(--ds-color-border-subtle)" : "none", paddingBottom: idx < items.length - 1 ? "20px" : "0" }}>
                  <div style={{ width: "80px", aspectRatio: "3/4", overflow: "hidden", border: "1px solid var(--ds-color-border)", backgroundColor: "var(--ds-color-canvas)" }}>
                    <OptimizedImage src={item.image} alt={item.name} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px 0", color: "var(--ds-color-text)" }}>
                      {item.name}
                    </h3>
                    <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--ds-color-text-muted)" }}>
                      {item.color && `Color: ${item.color}`} {item.size && ` | Size: ${item.size}`}
                    </p>
                    <p style={{ margin: "0", fontSize: "13px", color: "var(--ds-color-text)" }}>
                      Qty: {item.qty || item.quantity} &times; {formatPrice(item.price)}
                    </p>
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--ds-color-text)" }}>
                    {formatPrice(item.price * (item.qty || item.quantity))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Card (if applicable) */}
          {/* TODO: GET /api/orders/:id/refund-status */}
          {order.refundStatus && statusType !== "cancelled" && (
            <RefundStatusCard
              refundStatus={order.refundStatus}
              refundAmount={order.refundAmount || price}
              refundMethod={order.refundMethod}
              refundDate={order.refundDate}
              rejectReason={order.returnRequest?.rejectReason}
            />
          )}

          {/* Cancellation Info Card (if applicable) */}
          {statusType === "cancelled" && (
            <div className="refund-status-card refund-rejected" style={{ borderLeft: "3px solid var(--ds-color-danger, #8B3A3A)" }}>
              <div className="refund-card-header">
                <div className="refund-card-title-group">
                  <AlertTriangle size={20} style={{ color: "var(--ds-color-danger, #8B3A3A)" }} />
                  <h3 className="refund-card-title">Cancellation & Refund Details</h3>
                </div>
                <span className="refund-badge badge-refund-rejected">Cancelled</span>
              </div>
              
              <p className="refund-card-description">
                This order has been cancelled. If payment was made online, a refund will be processed to the original payment method.
              </p>

              <div className="refund-card-details-grid">
                {/* 1. Cancellation Reason */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Cancellation Reason</span>
                  <span className="refund-detail-value">
                    {order.cancellationReason || "Customer cancellation request"}
                  </span>
                </div>
                
                {/* 2. Cancellation Date */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Cancellation Date</span>
                  <span className="refund-detail-value">
                    {order.cancelledAt 
                      ? new Date(order.cancelledAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })
                      : new Date(order.updatedAt || order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                  </span>
                </div>

                {/* 3. Refund Status */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Refund Status</span>
                  <span className="refund-detail-value">
                    {order.refundStatus || (order.paymentMethod === "COD" ? "N/A" : "Processing")}
                  </span>
                </div>

                {/* 4. Refund Amount */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Refund Amount</span>
                  <span className="refund-detail-value font-highlight">
                    {order.refundAmount !== undefined 
                      ? formatPrice(order.refundAmount) 
                      : (order.paymentMethod === "COD" ? formatPrice(0) + " (COD Order)" : formatPrice(price))}
                  </span>
                </div>

                {/* 5. Refund Method */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Refund Method</span>
                  <span className="refund-detail-value">
                    {order.refundMethod || (order.paymentMethod === "COD" ? "N/A (COD Order)" : order.paymentMethod || "Razorpay")}
                  </span>
                </div>

                {/* 6. Expected Refund Date */}
                <div className="refund-detail-item">
                  <span className="refund-detail-label">Expected Refund Date</span>
                  <span className="refund-detail-value">
                    {order.expectedRefundDate 
                      ? (order.expectedRefundDate === "N/A" ? "N/A" : new Date(order.expectedRefundDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        }))
                      : (order.paymentMethod === "COD" 
                          ? "N/A" 
                          : new Date(new Date(order.updatedAt || order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            }))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="order-details-card" style={{ backgroundColor: "#FAF8F5", padding: "30px", border: "1px solid var(--ds-color-border)" }}>
            <OrderTimeline status={rawStatus} orderData={order} />
          </div>
        </div>

        {/* Right Column: Address, Summary, Action Block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          
          {/* Actions Block */}
          <div className="order-details-card" style={{ backgroundColor: "#FAF8F5", padding: "30px", border: "1px solid var(--ds-color-border)" }}>
            <h2 className="section-title" style={{ fontSize: "1.5rem", margin: "0 0 20px 0", borderBottom: "1px solid var(--ds-color-border)", paddingBottom: "12px" }}>
              Order Actions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {canCancelOrder(order) && (
                <button
                  onClick={() => setIsCancelOpen(true)}
                  className="loft-btn loft-btn-danger"
                  style={{ width: "100%" }}
                >
                  Cancel Order
                </button>
              )}
              {statusType === "delivered" && canReturnOrder(order) && (
                <button
                  onClick={() => setIsReturnOpen(true)}
                  className="loft-btn loft-btn-primary"
                  style={{ width: "100%" }}
                >
                  Request Return
                </button>
              )}
              {statusType === "delivered" && !canReturnOrder(order) && (
                <div className="return-window-closed-badge" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                  <AlertTriangle size={16} />
                  <span>Return Window Closed (7 Days Passed)</span>
                </div>
              )}
              {!canCancelOrder(order) && statusType !== "delivered" && (
                <p style={{ margin: "0", fontSize: "13px", color: "var(--ds-color-text-muted)", textAlign: "center" }}>
                  No further actions available for this order state.
                </p>
              )}
              <button
                onClick={() => navigate("/profile?tab=Orders")}
                className="loft-btn loft-btn-secondary"
                style={{ width: "100%" }}
              >
                Back to Order History
              </button>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="order-details-card" style={{ backgroundColor: "#FAF8F5", padding: "30px", border: "1px solid var(--ds-color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", borderBottom: "1px solid var(--ds-color-border)", paddingBottom: "12px" }}>
              <MapPin size={18} color="var(--ds-color-accent)" />
              <h2 className="section-title" style={{ fontSize: "1.5rem", margin: "0" }}>
                Delivery Address
              </h2>
            </div>
            {order.shippingAddress ? (
              <div style={{ fontSize: "13px", color: "var(--ds-color-text)", lineHeight: "1.6" }}>
                <p style={{ fontWeight: "600", margin: "0 0 6px 0" }}>Shipping Destination</p>
                <p style={{ margin: "0" }}>{order.shippingAddress.address}</p>
                <p style={{ margin: "0" }}>{order.shippingAddress.city} - {order.shippingAddress.postalCode}</p>
                <p style={{ margin: "0" }}>{order.shippingAddress.country}</p>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", fontSize: "13px", color: "var(--ds-color-text-muted)" }}>
                No shipping address recorded.
              </p>
            )}
          </div>

          {/* Payment & Price Summary */}
          <div className="order-details-card" style={{ backgroundColor: "#FAF8F5", padding: "30px", border: "1px solid var(--ds-color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", borderBottom: "1px solid var(--ds-color-border)", paddingBottom: "12px" }}>
              <Receipt size={18} color="var(--ds-color-accent)" />
              <h2 className="section-title" style={{ fontSize: "1.5rem", margin: "0" }}>
                Payment Summary
              </h2>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ds-color-text-muted)" }}>Subtotal</span>
                <span>{formatPrice(order.itemsPrice || price - (order.shippingPrice || 0))}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ds-color-success)" }}>
                  <span>Promo Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.giftCardDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ds-color-success)" }}>
                  <span>Gift Card Discount</span>
                  <span>-{formatPrice(order.giftCardDiscount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ds-color-text-muted)" }}>Shipping Fee</span>
                <span>{order.shippingPrice === 0 ? "Free" : formatPrice(order.shippingPrice || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ds-color-text-muted)" }}>Tax</span>
                <span>{formatPrice(order.taxPrice || 0)}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--ds-color-border)", paddingTop: "12px", fontWeight: "700", fontSize: "16px", marginTop: "6px" }}>
                <span>Grand Total</span>
                <span style={{ color: "var(--ds-color-text)" }}>{formatPrice(price)}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid var(--ds-color-border)", paddingTop: "16px", marginTop: "10px" }}>
                <CreditCard size={14} color="var(--ds-color-text-subtle)" />
                <span style={{ fontSize: "12px", color: "var(--ds-color-text-muted)" }}>
                  Paid via <strong>{order.paymentMethod || "Razorpay"}</strong>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        orderId={orderId}
      />

      {/* Return Order Modal */}
      <ReturnOrderModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        onConfirm={handleReturnConfirm}
        orderId={orderId}
      />
    </div>
  );
};

export default OrderDetailsPage;
