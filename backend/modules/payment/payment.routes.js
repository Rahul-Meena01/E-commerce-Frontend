// backend/modules/payment/payment.routes.js
import express from "express";
import * as paymentController from "./payment.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/stripe/create-session", protect, paymentController.createStripeSession);
router.post("/razorpay/create-order", protect, paymentController.createRazorpayOrder);
router.post("/razorpay/verify-payment", protect, paymentController.verifyRazorpayPayment);
router.post("/razorpay/webhook", paymentController.handleRazorpayWebhook);

export const stripeWebhookHandler = paymentController.stripeWebhookHandler;
export default router;
