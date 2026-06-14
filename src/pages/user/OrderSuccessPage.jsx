import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  ShoppingBag,
  Truck,
  Mail,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { orderApi } from "@/features/checkout/services/checkout.service";
import "../../styles/OrderSuccessPage.css";
import { formatPrice } from "@/utils/pricing";
import { motion } from "framer-motion";
import logger from "@/shared/utils/logger";

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderApi.getOrder(orderId);
        if (res.ok) {
          const data = await res.json();
          const orderData = data && data.success === undefined ? data : (data?.data || data);
          setOrder(orderData || null);
        }
      } catch (err) {
        logger.error("Error fetching order details for success screen:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    fetchOrder();

    if (order?.isPaid || order?.orderStatus === "Delivered" || order?.orderStatus === "Cancelled") {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchOrder();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [orderId, order?.isPaid, order?.orderStatus]);

  const getDeliveryEstimate = (createdAt, method) => {
    const date = createdAt ? new Date(createdAt) : new Date();
    const minDays = method === "express" ? 1 : 3;
    const maxDays = method === "express" ? 3 : 7;

    const minDate = new Date(date);
    minDate.setDate(date.getDate() + minDays);
    const maxDate = new Date(date);
    maxDate.setDate(date.getDate() + maxDays);

    const options = { month: "short", day: "numeric" };
    return `${minDate.toLocaleDateString("en-US", options)} and ${maxDate.toLocaleDateString("en-US", options)}`;
  };

  if (loading) {
    return (
      <div className="loft-osp-loading">
        <div className="loft-osp-shimmer"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  const orderNum = order?.orderNumber || `#${orderId?.slice(-8).toUpperCase()}`;
  const totalAmount = order?.totalAmount ?? order?.totalPrice ?? order?.grandTotal ?? 0;
  const shippingMethod = order?.shippingMethod || "standard";
  const emailRecipient =
    order?.user?.email || order?.shippingDetails?.email || "your inbox";

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const checkRingVariants = {
    hidden: { scale: 0.6, opacity: 0, rotate: -45 },
    show: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 140,
        damping: 12,
        delay: 0.2,
      },
    },
  };

  if (order && !order.isPaid && order.paymentMethod !== "COD") {
    return (
      <div className="loft-osp-wrapper">
        <div className="loft-osp-container">
          <div className="loft-osp-check-ring">
            <div
              className="loft-osp-check-icon"
              style={{ background: "#f6f6f6", color: "#1a1a1a" }}
            >
              <LoaderCircle size={36} className="loft-osp-spin" />
            </div>
          </div>

          <span className="loft-osp-brand">LOFT PREMIUM</span>
          <h1 className="loft-osp-title">Payment is being confirmed</h1>
          <p className="loft-osp-subtitle">
            We have received your order and are waiting for Razorpay to confirm
            the payment. This page refreshes automatically.
          </p>

          <div className="loft-osp-card">
            <div className="loft-osp-row">
              <div className="loft-osp-col">
                <span className="loft-osp-lbl">ORDER NUMBER</span>
                <span className="loft-osp-val highlight">{orderNum}</span>
              </div>
              <div className="loft-osp-col text-right">
                <span className="loft-osp-lbl">PAYMENT STATUS</span>
                <span className="loft-osp-val">Pending confirmation</span>
              </div>
            </div>

            <div className="loft-osp-divider"></div>

            <div className="loft-osp-row align-center">
              <Mail className="loft-osp-card-icon" size={20} />
              <div className="loft-osp-col">
                <span className="loft-osp-lbl">EMAIL CONFIRMATION</span>
                <span className="loft-osp-val">
                  We will email {emailRecipient} once payment is verified.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loft-osp-wrapper">
      <motion.div
        className="loft-osp-container"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Animated Checkmark */}
        <motion.div className="loft-osp-check-ring" variants={checkRingVariants}>
          <motion.div
            className="loft-osp-check-icon"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ yoyo: Infinity, duration: 1.5 }}
          >
            <Check size={40} strokeWidth={3} />
          </motion.div>
        </motion.div>

        <motion.span className="loft-osp-brand" variants={itemVariants}>
          LOFT PREMIUM
        </motion.span>
        <motion.h1 className="loft-osp-title" variants={itemVariants}>
          Thank you for your order
        </motion.h1>
        <motion.p className="loft-osp-subtitle" variants={itemVariants}>
          Your order has been placed successfully. A confirmation email has been
          dispatched to <strong>{emailRecipient}</strong>.
        </motion.p>

        {/* Order Card */}
        <motion.div className="loft-osp-card" variants={itemVariants}>
          <div className="loft-osp-row">
            <div className="loft-osp-col">
              <span className="loft-osp-lbl">ORDER NUMBER</span>
              <span className="loft-osp-val highlight">{orderNum}</span>
            </div>
            <div className="loft-osp-col text-right">
              <span className="loft-osp-lbl">TOTAL AMOUNT</span>
              <span className="loft-osp-val">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          <div className="loft-osp-divider"></div>

          <div className="loft-osp-row align-center">
            <Truck className="loft-osp-card-icon" size={20} />
            <div className="loft-osp-col">
              <span className="loft-osp-lbl">DELIVERY ESTIMATE</span>
              <span className="loft-osp-val">
                Expected between{" "}
                {getDeliveryEstimate(order?.createdAt, shippingMethod)}
              </span>
            </div>
          </div>

          <div className="loft-osp-divider"></div>

          <div className="loft-osp-row align-center">
            <Mail className="loft-osp-card-icon" size={20} />
            <div className="loft-osp-col">
              <span className="loft-osp-lbl">EMAIL CONFIRMATION</span>
              <span className="loft-osp-val italic font-sm">
                {order?.paymentMethod === "COD"
                  ? "A confirmation email has been dispatched for your records."
                  : "A confirmation email will be sent once Razorpay verification completes."}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div className="loft-osp-actions" variants={itemVariants}>
          <button
            onClick={() => navigate("/")}
            className="loft-osp-btn secondary"
          >
            <ShoppingBag size={16} />
            <span>CONTINUE SHOPPING</span>
          </button>

          <button
            onClick={() => navigate("/profile?tab=Orders")}
            className="loft-osp-btn primary"
          >
            <span>VIEW MY ORDERS</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OrderSuccessPage;
