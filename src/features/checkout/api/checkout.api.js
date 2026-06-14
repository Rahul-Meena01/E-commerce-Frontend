import client from "@/services/client";

export const createOrder = (data) => client.post("/orders", data);
export const createCheckoutSession = (orderId) => client.post("/payments/stripe/create-session", { orderId });
export const createRazorpayOrder = (payload) => client.post("/payment/create-order", payload);
export const verifyRazorpayPayment = (payload) => client.post("/payment/verify", payload);
