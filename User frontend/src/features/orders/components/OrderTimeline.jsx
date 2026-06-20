import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const OrderTimeline = ({ status, orderData = {} }) => {
  const normalized = (status || "").toLowerCase().trim();

  // Determine if this is a Return & Refund track or a Delivery track
  const isReturnTrack = [
    "return requested",
    "return requested",
    "returnapproved",
    "return approved",
    "returnrejected",
    "return rejected",
    "pickupscheduled",
    "pickup scheduled",
    "returned",
    "refundprocessing",
    "refund processing",
    "refundprocessed",
    "refund processed"
  ].includes(normalized);

  // Fulfillment track status index mapping
  const deliveryStatuses = [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "out for delivery",
    "delivered"
  ];
  const deliveryIndex = deliveryStatuses.indexOf(normalized);

  // Return track status index mapping
  const returnStatuses = [
    "delivered",
    "return requested",
    "return approved", // or return rejected
    "pickup scheduled",
    "returned",
    "refund processing",
    "refund processed"
  ];
  
  let returnIndex = returnStatuses.indexOf(normalized);
  if (normalized === "return rejected") {
    returnIndex = 2; // maps to the approval/rejection stage
  }

  // Generate timeline steps
  let steps = [];

  if (normalized === "cancelled") {
    // Cancelled timeline
    steps = [
      {
        title: "Order Placed",
        desc: "We received your order request",
        state: "completed",
        date: orderData.createdAt
      },
      {
        title: "Cancelled",
        desc: orderData.cancellationReason 
          ? `Reason: ${orderData.cancellationReason}` 
          : "Your order was cancelled",
        state: "cancelled",
        date: orderData.updatedAt || orderData.createdAt
      }
    ];
  } else if (isReturnTrack) {
    // Return & Refund track steps
    const reqDate = orderData.returnRequest?.requestedAt || orderData.updatedAt;
    const appDate = orderData.returnRequest?.approvedAt || orderData.updatedAt;
    const rejDate = orderData.returnRequest?.rejectedAt || orderData.updatedAt;
    const pickupDate = orderData.returnRequest?.pickupScheduledDate;
    const returnedDate = orderData.returnRequest?.returnedAt;
    const refundDate = orderData.refundDate;

    steps = [
      {
        title: "Item Delivered",
        desc: "Order was delivered successfully",
        state: "completed",
        date: orderData.deliveredAt
      },
      {
        title: "Return Requested",
        desc: `Reason: ${orderData.returnRequest?.reason || "Not specified"}`,
        state: returnIndex >= 1 ? (returnIndex === 1 ? "current" : "completed") : "future",
        date: reqDate
      },
      {
        title: normalized === "return rejected" ? "Return Declined" : "Return Approved",
        desc: normalized === "return rejected" 
          ? `Declined: ${orderData.returnRequest?.rejectReason || "Does not meet policy"}` 
          : "Return authorization granted",
        state: returnIndex >= 2 
          ? (normalized === "return rejected" 
              ? "rejected" 
              : (returnIndex === 2 ? "current" : "completed")) 
          : "future",
        date: normalized === "return rejected" ? rejDate : appDate
      }
    ];

    // Only add subsequent steps if not rejected
    if (normalized !== "return rejected") {
      steps.push(
        {
          title: "Pickup Scheduled",
          desc: pickupDate 
            ? `Courier scheduled for ${new Date(pickupDate).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}` 
            : "Awaiting courier scheduling",
          state: returnIndex >= 3 ? (returnIndex === 3 ? "current" : "completed") : "future",
          date: pickupDate ? `${pickupDate}T10:00:00.000Z` : null
        },
        {
          title: "Item Returned",
          desc: "Package received at our warehouse",
          state: returnIndex >= 4 ? (returnIndex === 4 ? "current" : "completed") : "future",
          date: returnedDate
        },
        {
          title: "Refund Processing",
          desc: "Inspecting item and initiating refund",
          state: returnIndex >= 5 ? (returnIndex === 5 ? "current" : "completed") : "future",
          date: returnIndex >= 5 ? orderData.updatedAt : null
        },
        {
          title: "Refund Processed",
          desc: orderData.refundMethod 
            ? `Refunded to ${orderData.refundMethod}` 
            : "Refund completed successfully",
          state: returnIndex >= 6 ? "completed" : "future",
          date: returnIndex >= 6 ? refundDate : null
        }
      );
    }
  } else {
    // Normal Delivery track steps
    const stepsData = [
      { title: "Order Placed", desc: "Your order has been submitted" },
      { title: "Order Confirmed", desc: "Seller has accepted your order" },
      { title: "Order Packed", desc: "Your items are packaged and ready" },
      { title: "Shipped", desc: "Package handed over to courier" },
      { title: "Out For Delivery", desc: "Courier is delivering today" },
      { title: "Delivered", desc: "Package delivered to your address" }
    ];

    steps = stepsData.map((step, idx) => {
      let state = "future";
      if (deliveryIndex > idx) {
        state = "completed";
      } else if (deliveryIndex === idx) {
        state = "current";
      }

      let date = null;
      if (idx === 0) date = orderData.createdAt;
      if (idx === 5) date = orderData.deliveredAt;

      return {
        ...step,
        state,
        date
      };
    });
  }

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const lineVariants = {
    hidden: { scaleY: 0 },
    show: { scaleY: 1, transition: { duration: 0.8, ease: "easeInOut" } },
  };

  const getIcon = (state) => {
    switch (state) {
      case "completed":
        return <Check size={12} className="timeline-check-icon" />;
      case "cancelled":
      case "rejected":
        return <X size={12} className="timeline-err-icon" />;
      case "current":
        return <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="timeline-pulse-dot" 
        />;
      default:
        return <div className="timeline-muted-dot" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="order-timeline-wrapper">
      <h3 className="timeline-title">Order Progress</h3>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="timeline-container"
      >
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          
          return (
            <motion.div 
              key={idx} 
              variants={itemVariants} 
              className={`timeline-step-row ${step.state}`}
            >
              {/* Node Column */}
              <div className="timeline-node-col">
                <div className={`timeline-node ${step.state}`}>
                  {getIcon(step.state)}
                </div>
                {!isLast && (
                  <motion.div
                    variants={lineVariants}
                    className={`timeline-line ${step.state}`}
                  />
                )}
              </div>

              {/* Content Column */}
              <div className="timeline-content-col">
                <div className="timeline-step-header">
                  <h4 className="timeline-step-title">{step.title}</h4>
                  {step.date && (
                    <span className="timeline-step-date">
                      {formatDate(step.date)}
                    </span>
                  )}
                </div>
                <p className="timeline-step-desc">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

OrderTimeline.propTypes = {
  status: PropTypes.string.isRequired,
  orderData: PropTypes.object,
};

export default OrderTimeline;
