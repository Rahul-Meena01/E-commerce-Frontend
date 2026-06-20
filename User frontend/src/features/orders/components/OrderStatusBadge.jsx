import PropTypes from "prop-types";

/**
 * Returns text labels and style class mappings for order statuses
 * Supporting future API status structures as well.
 */
const getStatusConfig = (status) => {
  const normalized = (status || "").toLowerCase().trim();
  switch (normalized) {
    case "pending":
      return { label: "Pending", className: "status-pending" };
    case "confirmed":
      return { label: "Confirmed", className: "status-confirmed" };
    case "packed":
      return { label: "Packed", className: "status-packed" };
    case "shipped":
      return { label: "Shipped", className: "status-shipped" };
    case "out for delivery":
    case "outfordelivery":
      return { label: "Out For Delivery", className: "status-out-for-delivery" };
    case "delivered":
      return { label: "Delivered", className: "status-delivered" };
    case "cancelled":
      return { label: "Cancelled", className: "status-cancelled" };
    case "return requested":
    case "returnrequested":
      return { label: "Return Requested", className: "status-return-requested" };
    case "return approved":
    case "returnapproved":
      return { label: "Return Approved", className: "status-return-approved" };
    case "return rejected":
    case "returnrejected":
      return { label: "Return Rejected", className: "status-return-rejected" };
    case "pickup scheduled":
    case "pickupscheduled":
      return { label: "Pickup Scheduled", className: "status-pickup-scheduled" };
    case "returned":
      return { label: "Returned", className: "status-returned" };
    case "refund processing":
    case "refundprocessing":
      return { label: "Refund Processing", className: "status-refund-processing" };
    case "refund processed":
    case "refundprocessed":
      return { label: "Refund Processed", className: "status-refund-processed" };
    default:
      return { label: status, className: "status-default" };
  }
};

const OrderStatusBadge = ({ status, className = "" }) => {
  const config = getStatusConfig(status);
  return (
    <span className={`order-status-badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

OrderStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default OrderStatusBadge;
