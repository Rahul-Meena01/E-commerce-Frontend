import client from "@/services/client";

export const createOrder = (data) => client.post("/orders", data);
export const createCheckoutSession = (orderId) => client.post("/payments/stripe/create-session", { orderId });
export const createRazorpayOrder = (orderItems, shippingMethod) => client.post("/payments/razorpay/create-order", { orderItems, shippingMethod });
export const verifyRazorpayPayment = (payload) => client.post("/payments/razorpay/verify-payment", payload);
