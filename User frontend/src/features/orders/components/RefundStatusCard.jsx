import PropTypes from "prop-types";
import { CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatPrice } from "../../../utils/pricing";

const RefundStatusCard = ({ refundStatus, refundAmount, refundMethod, refundDate, rejectReason }) => {
  if (!refundStatus) return null;

  const normalized = refundStatus.toLowerCase().trim();

  const getStatusDetails = () => {
    switch (normalized) {
      case "processing":
        return {
          title: "Refund Processing",
          desc: "We have approved your return and are processing your refund. It will be credited back to your account shortly.",
          colorClass: "refund-processing",
          icon: <Clock size={20} className="refund-icon-processing" />
        };
      case "completed":
      case "processed":
        return {
          title: "Refund Completed",
          desc: "The refund has been successfully credited to your payment method. Please check your bank statement.",
          colorClass: "refund-completed",
          icon: <CheckCircle size={20} className="refund-icon-completed" />
        };
      case "rejected":
        return {
          title: "Refund Declined",
          desc: rejectReason || "Your return request did not meet our terms & conditions. The item will be sent back to you.",
          colorClass: "refund-rejected",
          icon: <AlertTriangle size={20} className="refund-icon-rejected" />
        };
      default:
        return {
          title: "Refund Status Update",
          desc: "We are updating your refund details.",
          colorClass: "refund-default",
          icon: <CreditCard size={20} />
        };
    }
  };

  const details = getStatusDetails();

  const formatDate = (dateStr) => {
    if (!dateStr) return "Pending inspection";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`refund-status-card ${details.colorClass}`}>
      <div className="refund-card-header">
        <div className="refund-card-title-group">
          {details.icon}
          <h3 className="refund-card-title">{details.title}</h3>
        </div>
        <span className={`refund-badge badge-${details.colorClass}`}>{refundStatus}</span>
      </div>

      <p className="refund-card-description">{details.desc}</p>

      <div className="refund-card-details-grid">
        <div className="refund-detail-item">
          <span className="refund-detail-label">Refund Amount</span>
          <span className="refund-detail-value font-highlight">
            {formatPrice(refundAmount)}
          </span>
        </div>
        <div className="refund-detail-item">
          <span className="refund-detail-label">Payment Method</span>
          <span className="refund-detail-value">{refundMethod || "Original payment method"}</span>
        </div>
        <div className="refund-detail-item">
          <span className="refund-detail-label">
            {normalized === "processing" ? "Estimated Date" : normalized === "rejected" ? "Declined Date" : "Refund Date"}
          </span>
          <span className="refund-detail-value">{formatDate(refundDate)}</span>
        </div>
      </div>
    </div>
  );
};

RefundStatusCard.propTypes = {
  refundStatus: PropTypes.string,
  refundAmount: PropTypes.number,
  refundMethod: PropTypes.string,
  refundDate: PropTypes.string,
  rejectReason: PropTypes.string,
};

export default RefundStatusCard;
