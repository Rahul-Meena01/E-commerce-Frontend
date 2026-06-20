import PropTypes from "prop-types";
import { ArrowRight, AlertCircle } from "lucide-react";
import { formatPrice } from "../../../utils/pricing";
import OrderStatusBadge from "./OrderStatusBadge";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { canCancelOrder, canReturnOrder, canTrackReturn, canViewRefund } from "../context/OrderActionsContext";

const OrderCard = ({ order, onCancelClick, onReturnClick, onViewDetailsClick }) => {
  const items = order.orderItems || order.items || [];
  const firstItem = items[0];
  const orderId = order._id || order.id;
  const orderNum = order.orderNumber || `#${orderId.slice(-8).toUpperCase()}`;
  
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const price = order.totalAmount ?? order.totalPrice ?? order.grandTotal ?? order.total ?? 0;
  const rawStatus = order.orderStatus || order.status || "Pending";
  const statusType = rawStatus.toLowerCase();

  const renderActionButtons = () => {
    if (canCancelOrder(order)) {
      return (
        <div className="order-card-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelClick(orderId);
            }}
            className="loft-btn loft-btn-secondary loft-btn-sm"
            style={{ color: "var(--ds-color-danger, #8B3A3A)" }}
            aria-label={`Cancel order ${orderNum}`}
          >
            Cancel Order
          </button>
          <button
            onClick={() => onViewDetailsClick(orderId)}
            className="loft-btn loft-btn-primary loft-btn-sm"
            aria-label={`View details for order ${orderNum}`}
          >
            View Details
            <ArrowRight size={14} style={{ marginLeft: "6px" }} />
          </button>
        </div>
      );
    }

    if (statusType === "delivered") {
      return (
        <div className="order-card-actions">
          {canReturnOrder(order) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReturnClick(orderId);
              }}
              className="loft-btn loft-btn-secondary loft-btn-sm"
              aria-label={`Return items in order ${orderNum}`}
            >
              Return Order
            </button>
          ) : (
            <div className="return-window-closed-badge" title="Returns are only eligible within 7 days of delivery.">
              <AlertCircle size={14} />
              <span>Return Window Closed</span>
            </div>
          )}
          <button
            onClick={() => onViewDetailsClick(orderId)}
            className="loft-btn loft-btn-primary loft-btn-sm"
            aria-label={`View details for order ${orderNum}`}
          >
            View Details
            <ArrowRight size={14} style={{ marginLeft: "6px" }} />
          </button>
        </div>
      );
    }

    if (canTrackReturn(order)) {
      return (
        <div className="order-card-actions">
          <button
            onClick={() => onViewDetailsClick(orderId)}
            className="loft-btn loft-btn-primary loft-btn-sm"
            aria-label={`Track return for order ${orderNum}`}
          >
            Track Return
            <ArrowRight size={14} style={{ marginLeft: "6px" }} />
          </button>
        </div>
      );
    }

    if (canViewRefund(order)) {
      return (
        <div className="order-card-actions">
          <button
            onClick={() => onViewDetailsClick(orderId)}
            className="loft-btn loft-btn-primary loft-btn-sm"
            aria-label={`View refund details for order ${orderNum}`}
          >
            View Refund
            <ArrowRight size={14} style={{ marginLeft: "6px" }} />
          </button>
        </div>
      );
    }

    // Default fallback
    return (
      <div className="order-card-actions">
        <button
          onClick={() => onViewDetailsClick(orderId)}
          className="loft-btn loft-btn-primary loft-btn-sm"
          aria-label={`View details for order ${orderNum}`}
        >
          View Details
          <ArrowRight size={14} style={{ marginLeft: "6px" }} />
        </button>
      </div>
    );
  };

  return (
    <div
      className="order-card-wrapper"
      onClick={() => onViewDetailsClick(orderId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onViewDetailsClick(orderId);
        }
      }}
      aria-label={`Order ${orderNum}, Placed on ${orderDate}. Status: ${rawStatus}`}
    >
      <div className="order-card-top">
        <div className="order-card-meta">
          <span className="order-card-num">{orderNum}</span>
          <span className="order-card-date">Ordered {orderDate}</span>
        </div>
        <OrderStatusBadge status={rawStatus} />
      </div>

      <div className="order-card-body">
        {firstItem && (
          <div className="order-card-item-row">
            <div className="order-card-item-img-container">
              <OptimizedImage
                src={firstItem.image}
                alt={firstItem.name}
                className="order-card-item-img"
              />
            </div>
            <div className="order-card-item-info">
              <h4 className="order-card-item-name">
                {firstItem.name}
                {items.length > 1 && <span className="item-count-label"> + {items.length - 1} other item{items.length > 2 ? 's' : ''}</span>}
              </h4>
              <p className="order-card-item-meta">
                {firstItem.color && `Color: ${firstItem.color}`} {firstItem.size && `| Size: ${firstItem.size}`}
              </p>
              <div className="order-card-price-row">
                <span className="order-card-total-label">Total Amount:</span>
                <span className="order-card-total-val">{formatPrice(price)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="order-card-footer" onClick={(e) => e.stopPropagation()}>
        {renderActionButtons()}
      </div>
    </div>
  );
};

OrderCard.propTypes = {
  order: PropTypes.object.isRequired,
  onCancelClick: PropTypes.func.isRequired,
  onReturnClick: PropTypes.func.isRequired,
  onViewDetailsClick: PropTypes.func.isRequired,
};

export default OrderCard;
