// backend/modules/payment/payment.controller.js
import * as paymentService from "./payment.service.js";
import env from "../../config/env.js";
import asyncHandler from "../../utils/asyncHandler.js";

const getFrontendUrl = () => {
  const configuredUrl = env.CLIENT_URL || "http://localhost:5173";
  return configuredUrl.split(",")[0].trim().replace(/\/$/, "");
};

export const createStripeSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user._id || req.user.id;
  const frontendUrl = getFrontendUrl();
  const result = await paymentService.createStripeSession(userId, orderId, frontendUrl);
  return res.status(200).json({
    success: true,
    message: "Stripe checkout session created",
    ...result
  });
});

export const stripeWebhookHandler = async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    // Note: Stripe webhook receives req.body as a raw Buffer, which is parsed by express.raw middleware
    const result = await paymentService.handleStripeWebhook(req.body, signature);
    return res.json(result);
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(400).send(`Stripe webhook error: ${error.message}`);
  }
};

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const result = await paymentService.createRazorpayOrder(userId);
  return res.status(200).json({
    success: true,
    ...result
  });
});

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const user = req.user;
  const createdOrder = await paymentService.verifyRazorpayPayment(user, req.body);
  return res.status(201).json({
    success: true,
    message: "Payment verified and order created",
    orderId: createdOrder._id,
  });
});

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await paymentService.handleRazorpayWebhook(req.body, signature);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};
export default stripeWebhookHandler;
