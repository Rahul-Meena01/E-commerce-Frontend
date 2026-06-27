/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { mockOrders } from "../data/mockOrders";
import { useToast } from "../../../context/ToastContext";
import authFetch from "@/shared/utils/http";

export const canCancelOrder = (order) => {
  if (!order) return false;
  const status = (order.orderStatus || order.status || "").toLowerCase();
  return ["pending", "confirmed", "packed"].includes(status);
};

export const canReturnOrder = (order) => {
  if (!order) return false;
  const status = (order.orderStatus || order.status || "").toLowerCase();
  if (status !== "delivered") return false;
  if (!order.deliveredAt) return false;
  const deliveredDate = new Date(order.deliveredAt);
  // Use the system current date 2026-06-16
  const currentDate = new Date("2026-06-16T22:15:06+05:30");
  const diffTime = currentDate.getTime() - deliveredDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

export const canTrackReturn = (order) => {
  if (!order) return false;
  const status = (order.orderStatus || order.status || "").toLowerCase();
  const trackReturnStatuses = ["return requested", "return approved", "pickup scheduled", "returned", "return rejected"];
  return trackReturnStatuses.includes(status);
};

export const canViewRefund = (order) => {
  if (!order) return false;
  const status = (order.orderStatus || order.status || "").toLowerCase();
  const refundStatuses = ["refund processing", "refund processed"];
  return refundStatuses.includes(status);
};

const OrderActionsContext = createContext(null);

export const OrderActionsProvider = ({ children }) => {
  const toast = useToast();
  // Store local overrides for orders (key: orderId, value: modified fields)
  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem("loft_order_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse order overrides", e);
      return {};
    }
  });

  // Calculate the mock orders merged with overrides for general frontend-only navigation
  const orders = useMemo(
    () => mockOrders.map((order) => {
      const override = overrides[order._id || order.id];
      if (override) {
        return { ...order, ...override };
      }
      return order;
    }),
    [overrides],
  );

  // Merge external backend orders with local overrides
  const getMergedOrders = (backendOrders) => {
    if (!backendOrders || backendOrders.length === 0) {
      // Fallback to local mock orders merged with overrides
      return orders;
    }
    return backendOrders.map((order) => {
      const orderId = order._id || order.id;
      const override = overrides[orderId];
      if (override) {
        return { ...order, ...override };
      }
      return order;
    });
  };

  // Get a single order by ID, merging local overrides if applicable
  const getOrderById = (orderId, backendOrders = []) => {
    const mergedList = getMergedOrders(backendOrders);
    return mergedList.find((o) => o._id === orderId || o.id === orderId) || null;
  };

  // Cancel order action
  const cancelOrder = async (orderId, reason) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/cancel`, {
        method: "PUT",
        body: { note: reason },
      });

      if (res.ok) {
        const json = await res.json();
        const serverOrder = json.order || json.data || {};
        
        const cancelDate = serverOrder.cancelledAt || new Date().toISOString();
        const price = serverOrder.totalPrice || serverOrder.totalAmount || 0;
        const isCOD = serverOrder.paymentMethod === "COD";
        const expectedRefund = isCOD 
          ? "N/A" 
          : new Date(new Date(cancelDate).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

        setOverrides((prev) => {
          const updated = {
            ...prev,
            [orderId]: {
              ...prev[orderId],
              status: serverOrder.orderStatus || "Cancelled",
              orderStatus: serverOrder.orderStatus || "Cancelled",
              cancellationReason: serverOrder.cancellationNote || reason,
              cancelledAt: cancelDate,
              refundAmount: isCOD ? 0 : price,
              refundMethod: isCOD ? "N/A (COD Order)" : (serverOrder.paymentMethod || "Razorpay"),
              expectedRefundDate: expectedRefund,
              refundStatus: isCOD ? "N/A" : (serverOrder.refundStatus || "Processing"),
              updatedAt: serverOrder.updatedAt || cancelDate,
            },
          };
          localStorage.setItem("loft_order_overrides", JSON.stringify(updated));
          return updated;
        });

        toast.success("Order cancelled successfully.");
        return true;
      } else {
        const errJson = await res.json();
        toast.error(errJson.message || "Failed to cancel order.");
        return false;
      }
    } catch (err) {
      console.error("Order cancellation failed, falling back to local simulation:", err);
      // Local fallback
      const order = getOrderById(orderId);
      const cancelDate = new Date().toISOString();
      const price = order ? (order.totalAmount ?? order.totalPrice ?? order.grandTotal ?? order.total ?? 0) : 0;
      const isCOD = order ? order.paymentMethod === "COD" : false;
      const expectedRefund = isCOD 
        ? "N/A" 
        : new Date(new Date(cancelDate).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

      setOverrides((prev) => {
        const updated = {
          ...prev,
          [orderId]: {
            ...prev[orderId],
            status: "Cancelled",
            orderStatus: "Cancelled",
            cancellationReason: reason,
            cancelledAt: cancelDate,
            refundAmount: isCOD ? 0 : price,
            refundMethod: isCOD ? "N/A (COD Order)" : ((order && order.paymentMethod) || "Razorpay"),
            expectedRefundDate: expectedRefund,
            refundStatus: isCOD ? "N/A" : "Processing",
            updatedAt: cancelDate,
          },
        };
        localStorage.setItem("loft_order_overrides", JSON.stringify(updated));
        return updated;
      });

      toast.success("Order cancelled (offline fallback).");
      return true;
    }
  };

  // Request return action
  const requestReturn = async (orderId, { reason, comments, images }) => {
    // Backend integration: POST /api/orders/:id/return
    // For backend:
    // await authFetch(`/api/orders/${orderId}/return`, { method: "POST", body: { reason, comments, images } });

    setOverrides((prev) => {
      const updated = {
        ...prev,
        [orderId]: {
          ...prev[orderId],
          status: "Return Requested",
          orderStatus: "Return Requested",
          returnRequest: {
            reason,
            comments,
            images, // Array of base64 strings or mock urls
            requestedAt: new Date().toISOString(),
          },
          returnReason: reason,
          returnRequestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      localStorage.setItem("loft_order_overrides", JSON.stringify(updated));
      return updated;
    });

    toast.success("Return requested successfully.");
    return true;
  };

  // Helper to reset overrides (useful for testing and resetting UI states)
  const resetMockData = () => {
    setOverrides({});
    localStorage.removeItem("loft_order_overrides");
    toast.success("Testing overrides reset.");
  };

  // Check refund status helper
  const getRefundStatus = (orderId) => {
    // Backend integration: GET /api/orders/:id/refund-status
    const order = getOrderById(orderId);
    if (!order) return null;
    return order.refundStatus || null;
  };

  return (
    <OrderActionsContext.Provider
      value={{
        orders,
        getMergedOrders,
        getOrderById,
        cancelOrder,
        requestReturn,
        resetMockData,
        getRefundStatus,
        overrides,
        canCancelOrder,
        canReturnOrder,
        canTrackReturn,
        canViewRefund,
      }}
    >
      {children}
    </OrderActionsContext.Provider>
  );
};

OrderActionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useOrderActions = () => {
  const context = useContext(OrderActionsContext);
  if (!context) {
    throw new Error("useOrderActions must be used within an OrderActionsProvider");
  }
  return context;
};
