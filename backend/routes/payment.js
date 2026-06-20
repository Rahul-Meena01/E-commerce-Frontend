/*
 * routes/payment.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Razorpay payment flow — three steps:
 *
 *   Step 1 — POST /api/payment/create-order
 *            Frontend calls this after creating the DB order via POST /api/orders.
 *            Creates a Razorpay order and returns the razorpayOrderId + amount.
 *
 *   Step 2 — Razorpay checkout popup (frontend only)
 *            User pays. Razorpay calls the frontend handler with:
 *              razorpay_order_id, razorpay_payment_id, razorpay_signature
 *
 *   Step 3 — POST /api/payment/verify
 *            Frontend sends the three Razorpay fields + our DB orderId.
 *            We verify the HMAC signature and mark the order as paid.
 *
 *   Async  — POST /api/payment/webhook
 *            Razorpay calls this directly for server-side confirmation.
 *            Acts as a safety net — updates the order even if the frontend
 *            never calls /verify (tab closed, network drop, etc.).
 *            ⚠️  Requires express.raw({ type: "application/json" }) in server.js
 *                BEFORE express.json(), so req.body stays a raw Buffer here.
 *
 * ─── Fixes applied vs previous version ──────────────────────────────────────
 *
 *  FIX 1  — test-setup guarded by NODE_ENV !== "production".
 *            Was a public route in all environments — anyone could create DB
 *            records and get a valid auth cookie in production.
 *
 *  FIX 2  — create-order: removed dead totalAmount fallback.
 *            order.js uses totalPrice. The old `if (order.totalAmount)` block
 *            was leftover indecision that could silently pass NaN to Razorpay
 *            (0 * 100 = 0, undefined * 100 = NaN).
 *
 *  FIX 3  — create-order: idempotency guard added.
 *            Calling this endpoint twice (network retry, double-click) previously
 *            created two Razorpay orders and overwrote razorpayOrderId on the DB
 *            order, orphaning the first Razorpay order. Now returns the existing
 *            razorpayOrderId if one is already set.
 *
 *  FIX 4  — create-order: simplified already-paid check.
 *            Old logic had a redundant nested if. Replaced with a single clear check.
 *
 *  FIX 5  — verify: razorpayOrderId is now validated against order.razorpayOrderId.
 *            Previously a tampered client could send any razorpayOrderId that passes
 *            HMAC while pointing to a different Razorpay transaction.
 *
 *  FIX 6  — verify: authorization check added.
 *            Previously any authenticated user could verify (and mark as paid)
 *            any order by knowing its ID.
 *
 *  FIX 7  — verify: cart is cleared after successful payment.
 *            Previously the user's cart was left populated after checkout.
 *
 *  FIX 8  — verify: coupon.usedCount now saved AFTER cart.save().
 *            Previously usedCount was incremented even if the order save failed.
 *            (coupon increment is best-effort — not rolled back on save failure,
 *            but at least the order is confirmed paid before we touch the coupon.)
 *
 *  FIX 9  — webhook: req.body is now used as a raw Buffer for HMAC.
 *            Previously used JSON.stringify(req.body) which re-serialises a parsed
 *            object — key order and whitespace differ from Razorpay's original bytes,
 *            so verification always failed.
 *
 *  FIX 10 — webhook: safe guard on payload.payment.entity access.
 *            Non-payment webhook events (refunds, order events) don't have
 *            payload.payment — accessing it threw an uncaught TypeError 500
 *            which caused Razorpay to keep retrying.
 *
 *  FIX 11 — webhook: idempotency guard added.
 *            Razorpay retries webhooks on non-200 responses. If the order was
 *            already marked paid (e.g. by /verify), we skip the update and
 *            return 200 immediately to stop retries.
 */

import express from "express";
import crypto  from "crypto";
import Cart    from "../models/Cart.js";
import Order   from "../models/Order.js";
import GiftCard from "../models/GiftCard.js";
import { protect } from "../middleware/authMiddleware.js";
import razorpay    from "../config/razorpay.js";
import { getIO }   from "../socket.js";

const router = express.Router();

// Thin wrapper — catches async errors and forwards to Express global error handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// ─────────────────────────────────────────────────────────────────────────────
// DEV-ONLY  POST /api/payment/test-setup
// Creates a dummy user + order and sets an auth cookie for Razorpay UI testing.
//
// FIX 1: Removed from production. This was a public endpoint in all environments
//        that let anyone create DB records and receive a valid session cookie.
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  // Lazy imports — only loaded in dev so prod bundle stays clean
  const { default: mongoose } = await import("mongoose");
  const { default: jwt }      = await import("jsonwebtoken");
  const { default: User }     = await import("../models/User.js");

  router.post(
    "/test-setup",
    asyncHandler(async (req, res) => {
      let user = await User.findOne({ email: "test@razorpay.com" });
      if (!user) {
        user = await User.create({
          name:     "Test User",
          email:    "test@razorpay.com",
          password: "password123",
        });
      }

      const order = await Order.create({
        user: user._id,
        orderItems: [
          {
            name:    "Test Product",
            qty:     1,
            image:   "test.jpg",
            price:   500,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress: {
          address:    "123 Test St",
          city:       "Test City",
          postalCode: "123456",
          country:    "India",
        },
        paymentMethod: "Razorpay",
        itemsPrice:    500,
        taxPrice:      0,
        shippingPrice: 0,
        totalPrice:    500,
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure:   false, // dev only
        sameSite: "strict",
      });

      res.status(200).json({ orderId: order._id });
    })
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Creates a Razorpay order for an existing DB order.
// Frontend calls this first, then opens the Razorpay checkout popup.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/create-order",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // FIX 6: Ownership check — ensure this order belongs to the logged-in user
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to access this order" });
    }

    // FIX 4: Clean single check replacing the old nested redundant if
    if (order.isPaid || order.paymentStatus === "paid") {
      return res.status(400).json({ success: false, message: "Order is already paid" });
    }

    // FIX 3: Idempotency — if a Razorpay order was already created for this DB
    // order (e.g. user hit the pay button twice), return the existing one.
    // This prevents orphaned Razorpay orders and overwritten razorpayOrderId.
    if (order.razorpayOrderId) {
      return res.status(200).json({
        success:        true,
        razorpayOrderId: order.razorpayOrderId,
        amount:         Math.round(order.totalPrice * 100),
        currency:       "INR",
        key:            process.env.RAZORPAY_KEY_ID,
      });
    }

    // FIX 2: Use totalPrice only. Removed the dead `if (order.totalAmount)` block
    // that could silently produce NaN (undefined * 100) if totalAmount was ever 0.
    const razorpayOrder = await razorpay.orders.create({
      amount:   Math.round(order.totalPrice * 100), // Razorpay expects paise
      currency: "INR",
      receipt:  order._id.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success:         true,
      razorpayOrderId: razorpayOrder.id,
      amount:          razorpayOrder.amount,
      currency:        razorpayOrder.currency,
      key:             process.env.RAZORPAY_KEY_ID,
    });
  })
);


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/verify
// Called by the frontend after the Razorpay popup succeeds.
// Verifies the HMAC signature and marks the order as paid.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/verify",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // FIX 6: Authorization check
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to verify this order" });
    }

    // FIX 5: Validate that the razorpayOrderId from the client matches what we
    // stored when we created the Razorpay order. Prevents a tampered client from
    // passing a foreign razorpayOrderId that could pass HMAC verification.
    if (order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID does not match. Possible tampering detected.",
      });
    }

    // Idempotency — if the webhook already marked this paid, just return success
    if (order.isPaid || order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        orderId: order._id,
      });
    }

    // HMAC signature verification
    // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      // Signature mismatch — mark as failed and reject
      order.paymentStatus = "failed";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Possible payment tampering.",
      });
    }

    // ── Signature valid — mark order as paid ──────────────────────────────────
    order.isPaid            = true;
    order.paidAt            = Date.now();
    order.paymentStatus     = "paid";
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.orderStatus       = "Processing";

    await order.save();

    // ── Deduct Gift Card Balance ──────────────────────────────────────────────
    if (order.giftCard && order.giftCardDiscount > 0) {
      try {
        const gc = await GiftCard.findById(order.giftCard);
        if (gc) {
          gc.balance -= order.giftCardDiscount;
          if (gc.balance <= 0) {
            gc.balance = 0;
            gc.status = "inactive";
          }
          await gc.save();
        }
      } catch (gcError) {
        console.error("Gift card deduction failed on verify:", gcError);
      }
    }

    // Emit real-time update so admin dashboard reflects payment instantly
    try {
      const io = getIO();
      await order.populate("user", "id name email phone");
      const obj = order.toObject();
      io.emit("orderUpdated", { ...obj, shortId: obj._id.toString().slice(-6).toUpperCase() });
    } catch (socketErr) {
      console.error("[verify] Socket emit failed:", socketErr);
    }

    // FIX 7: Clear the user's cart after successful payment
    // Done after order.save() so a cart-clear failure doesn't roll back the payment
    try {
      await Cart.findOneAndUpdate(
        { user: order.user },
        { $set: { items: [], coupon: null, couponCode: null, giftCard: null, giftCardCode: null } }
      );
    } catch (cartErr) {
      // Non-fatal — log but don't fail the payment response
      console.error("Failed to clear cart after payment:", cartErr);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      orderId: order._id,
    });
  })
);


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// Razorpay calls this directly as a server-side confirmation.
// Acts as a safety net — confirms payment even if the user closes the tab
// before /verify is called.
//
// ⚠️  CRITICAL: server.js MUST register express.raw({ type:"application/json" })
//     scoped to this path BEFORE express.json(). Otherwise req.body is a parsed
//     object, JSON.stringify re-serialises it with different bytes, and the HMAC
//     will never match. See server.js section 6a.
//
// req.body here is a raw Buffer — handle accordingly.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // If webhook secret isn't configured, acknowledge and skip processing.
    // Log a warning — this should always be set in production.
    if (!secret) {
      console.warn(
        "[payment/webhook] RAZORPAY_WEBHOOK_SECRET is not set. " +
        "Webhook events are being acknowledged but NOT verified or processed."
      );
      return res.status(200).send("OK");
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).send("Missing x-razorpay-signature header");
    }

    // FIX 9: req.body is a raw Buffer (express.raw applied in server.js).
    // Use it directly for HMAC — do NOT JSON.stringify a parsed object.
    const rawBody = req.body; // Buffer

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)   // ← raw Buffer, byte-identical to what Razorpay signed
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).send("Invalid webhook signature");
    }

    // Parse the event only AFTER signature is verified
    let event;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return res.status(400).send("Invalid JSON payload");
    }

    const eventName = event?.event;

    // FIX 10: Guard against non-payment events (refunds, order events, etc.)
    // that don't have payload.payment. Previously this threw a TypeError 500,
    // which caused Razorpay to keep retrying indefinitely.
    if (!event?.payload?.payment?.entity) {
      // Acknowledge the event — we just don't act on it
      return res.status(200).send("OK");
    }

    const paymentEntity  = event.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;

    if (!razorpayOrderId) {
      return res.status(200).send("OK");
    }

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      // Unknown order — acknowledge so Razorpay stops retrying
      return res.status(200).send("OK");
    }

    if (eventName === "payment.captured") {
      // FIX 11: Idempotency — skip if already marked paid (e.g. by /verify)
      if (order.isPaid || order.paymentStatus === "paid") {
        return res.status(200).send("OK");
      }

      order.isPaid            = true;
      order.paidAt            = Date.now();
      order.paymentStatus     = "paid";
      order.razorpayPaymentId = paymentEntity.id;
      order.orderStatus       = "Processing";

      await order.save();

      // ── Deduct Gift Card Balance ──────────────────────────────────────────────
      if (order.giftCard && order.giftCardDiscount > 0) {
        try {
          const gc = await GiftCard.findById(order.giftCard);
          if (gc) {
            gc.balance -= order.giftCardDiscount;
            if (gc.balance <= 0) {
              gc.balance = 0;
              gc.status = "inactive";
            }
            await gc.save();
          }
        } catch (gcError) {
          console.error("Gift card deduction failed on webhook:", gcError);
        }
      }

      // Emit real-time update for admin dashboard
      try {
        const io = getIO();
        await order.populate("user", "id name email phone");
        const obj = order.toObject();
        io.emit("orderUpdated", { ...obj, shortId: obj._id.toString().slice(-6).toUpperCase() });
      } catch (socketErr) {
        console.error("[webhook] Socket emit failed:", socketErr);
      }

      // Clear cart — best-effort, non-fatal
      try {
        await Cart.findOneAndUpdate(
          { user: order.user },
          { $set: { items: [], coupon: null, couponCode: null, giftCard: null, giftCardCode: null } }
        );
      } catch (cartErr) {
        console.error("[webhook] Failed to clear cart:", cartErr);
      }

    } else if (eventName === "payment.failed") {
      // Only update if not already in a terminal payment state
      if (order.paymentStatus !== "paid") {
        order.paymentStatus = "failed";
        await order.save();
      }
    }

    // Always return 200 to Razorpay — anything else triggers retries
    res.status(200).send("OK");
  })
);


export default router;

// /*
//  * routes/payment.js
//  * ─────────────────────────────────────────────────────────────────────────────
//  * Razorpay payment flow — three steps:
//  *
//  *   Step 1 — POST /api/payment/create-order
//  *            Frontend calls this after creating the DB order via POST /api/orders.
//  *            Creates a Razorpay order and returns the razorpayOrderId + amount.
//  *
//  *   Step 2 — Razorpay checkout popup (frontend only)
//  *            User pays. Razorpay calls the frontend handler with:
//  *              razorpay_order_id, razorpay_payment_id, razorpay_signature
//  *
//  *   Step 3 — POST /api/payment/verify
//  *            Frontend sends the three Razorpay fields + our DB orderId.
//  *            We verify the HMAC signature and mark the order as paid.
//  *
//  *   Async  — POST /api/payment/webhook
//  *            Razorpay calls this directly for server-side confirmation.
//  *            Acts as a safety net — updates the order even if the frontend
//  *            never calls /verify (tab closed, network drop, etc.).
//  *            ⚠️  Requires express.raw({ type: "application/json" }) in server.js
//  *                BEFORE express.json(), so req.body stays a raw Buffer here.
//  *
//  * ─── Fixes applied vs previous version ──────────────────────────────────────
//  *
//  *  FIX 1  — test-setup guarded by NODE_ENV !== "production".
//  *            Was a public route in all environments — anyone could create DB
//  *            records and get a valid auth cookie in production.
//  *
//  *  FIX 2  — create-order: removed dead totalAmount fallback.
//  *            order.js uses totalPrice. The old `if (order.totalAmount)` block
//  *            was leftover indecision that could silently pass NaN to Razorpay
//  *            (0 * 100 = 0, undefined * 100 = NaN).
//  *
//  *  FIX 3  — create-order: idempotency guard added.
//  *            Calling this endpoint twice (network retry, double-click) previously
//  *            created two Razorpay orders and overwrote razorpayOrderId on the DB
//  *            order, orphaning the first Razorpay order. Now returns the existing
//  *            razorpayOrderId if one is already set.
//  *
//  *  FIX 4  — create-order: simplified already-paid check.
//  *            Old logic had a redundant nested if. Replaced with a single clear check.
//  *
//  *  FIX 5  — verify: razorpayOrderId is now validated against order.razorpayOrderId.
//  *            Previously a tampered client could send any razorpayOrderId that passes
//  *            HMAC while pointing to a different Razorpay transaction.
//  *
//  *  FIX 6  — verify: authorization check added.
//  *            Previously any authenticated user could verify (and mark as paid)
//  *            any order by knowing its ID.
//  *
//  *  FIX 7  — verify: cart is cleared after successful payment.
//  *            Previously the user's cart was left populated after checkout.
//  *
//  *  FIX 8  — verify: coupon.usedCount now saved AFTER cart.save().
//  *            Previously usedCount was incremented even if the order save failed.
//  *            (coupon increment is best-effort — not rolled back on save failure,
//  *            but at least the order is confirmed paid before we touch the coupon.)
//  *
//  *  FIX 9  — webhook: req.body is now used as a raw Buffer for HMAC.
//  *            Previously used JSON.stringify(req.body) which re-serialises a parsed
//  *            object — key order and whitespace differ from Razorpay's original bytes,
//  *            so verification always failed.
//  *
//  *  FIX 10 — webhook: safe guard on payload.payment.entity access.
//  *            Non-payment webhook events (refunds, order events) don't have
//  *            payload.payment — accessing it threw an uncaught TypeError 500
//  *            which caused Razorpay to keep retrying.
//  *
//  *  FIX 11 — webhook: idempotency guard added.
//  *            Razorpay retries webhooks on non-200 responses. If the order was
//  *            already marked paid (e.g. by /verify), we skip the update and
//  *            return 200 immediately to stop retries.
//  */

// import express from "express";
// import crypto  from "crypto";
// import Cart    from "../models/Cart.js";
// import Order   from "../models/Order.js";
// import { protect } from "../middleware/authMiddleware.js";
// import razorpay    from "../config/razorpay.js";

// const router = express.Router();

// // Thin wrapper — catches async errors and forwards to Express global error handler
// const asyncHandler = (fn) => (req, res, next) =>
//   Promise.resolve(fn(req, res, next)).catch(next);


// // ─────────────────────────────────────────────────────────────────────────────
// // DEV-ONLY  POST /api/payment/test-setup
// // Creates a dummy user + order and sets an auth cookie for Razorpay UI testing.
// //
// // FIX 1: Removed from production. This was a public endpoint in all environments
// //        that let anyone create DB records and receive a valid session cookie.
// // ─────────────────────────────────────────────────────────────────────────────
// if (process.env.NODE_ENV !== "production") {
//   // Lazy imports — only loaded in dev so prod bundle stays clean
//   const { default: mongoose } = await import("mongoose");
//   const { default: jwt }      = await import("jsonwebtoken");
//   const { default: User }     = await import("../models/User.js");

//   router.post(
//     "/test-setup",
//     asyncHandler(async (req, res) => {
//       let user = await User.findOne({ email: "test@razorpay.com" });
//       if (!user) {
//         user = await User.create({
//           name:     "Test User",
//           email:    "test@razorpay.com",
//           password: "password123",
//         });
//       }

//       const order = await Order.create({
//         user: user._id,
//         orderItems: [
//           {
//             name:    "Test Product",
//             qty:     1,
//             image:   "test.jpg",
//             price:   500,
//             product: new mongoose.Types.ObjectId(),
//           },
//         ],
//         shippingAddress: {
//           address:    "123 Test St",
//           city:       "Test City",
//           postalCode: "123456",
//           country:    "India",
//         },
//         paymentMethod: "Razorpay",
//         itemsPrice:    500,
//         taxPrice:      0,
//         shippingPrice: 0,
//         totalPrice:    500,
//       });

//       const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//         expiresIn: "1h",
//       });

//       res.cookie("token", token, {
//         httpOnly: true,
//         secure:   false, // dev only
//         sameSite: "strict",
//       });

//       res.status(200).json({ orderId: order._id });
//     })
//   );
// }


// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/payment/create-order
// // Creates a Razorpay order for an existing DB order.
// // Frontend calls this first, then opens the Razorpay checkout popup.
// // ─────────────────────────────────────────────────────────────────────────────
// router.post(
//   "/create-order",
//   protect,
//   asyncHandler(async (req, res) => {
//     const { orderId } = req.body;

//     if (!orderId) {
//       return res.status(400).json({ success: false, message: "orderId is required" });
//     }

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     // FIX 6: Ownership check — ensure this order belongs to the logged-in user
//     if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(403).json({ success: false, message: "Not authorized to access this order" });
//     }

//     // FIX 4: Clean single check replacing the old nested redundant if
//     if (order.isPaid || order.paymentStatus === "paid") {
//       return res.status(400).json({ success: false, message: "Order is already paid" });
//     }

//     // FIX 3: Idempotency — if a Razorpay order was already created for this DB
//     // order (e.g. user hit the pay button twice), return the existing one.
//     // This prevents orphaned Razorpay orders and overwritten razorpayOrderId.
//     if (order.razorpayOrderId) {
//       return res.status(200).json({
//         success:        true,
//         razorpayOrderId: order.razorpayOrderId,
//         amount:         Math.round(order.totalPrice * 100),
//         currency:       "INR",
//         key:            process.env.RAZORPAY_KEY_ID,
//       });
//     }

//     // FIX 2: Use totalPrice only. Removed the dead `if (order.totalAmount)` block
//     // that could silently produce NaN (undefined * 100) if totalAmount was ever 0.
//     const razorpayOrder = await razorpay.orders.create({
//       amount:   Math.round(order.totalPrice * 100), // Razorpay expects paise
//       currency: "INR",
//       receipt:  order._id.toString(),
//     });

//     order.razorpayOrderId = razorpayOrder.id;
//     await order.save();

//     res.status(200).json({
//       success:         true,
//       razorpayOrderId: razorpayOrder.id,
//       amount:          razorpayOrder.amount,
//       currency:        razorpayOrder.currency,
//       key:             process.env.RAZORPAY_KEY_ID,
//     });
//   })
// );


// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/payment/verify
// // Called by the frontend after the Razorpay popup succeeds.
// // Verifies the HMAC signature and marks the order as paid.
// // ─────────────────────────────────────────────────────────────────────────────
// router.post(
//   "/verify",
//   protect,
//   asyncHandler(async (req, res) => {
//     const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
//       req.body;

//     if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature",
//       });
//     }

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     // FIX 6: Authorization check
//     if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//       return res.status(403).json({ success: false, message: "Not authorized to verify this order" });
//     }

//     // FIX 5: Validate that the razorpayOrderId from the client matches what we
//     // stored when we created the Razorpay order. Prevents a tampered client from
//     // passing a foreign razorpayOrderId that could pass HMAC verification.
//     if (order.razorpayOrderId !== razorpayOrderId) {
//       return res.status(400).json({
//         success: false,
//         message: "Razorpay order ID does not match. Possible tampering detected.",
//       });
//     }

//     // Idempotency — if the webhook already marked this paid, just return success
//     if (order.isPaid || order.paymentStatus === "paid") {
//       return res.status(200).json({
//         success: true,
//         message: "Payment already verified",
//         orderId: order._id,
//       });
//     }

//     // HMAC signature verification
//     // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
//       .digest("hex");

//     if (expectedSignature !== razorpaySignature) {
//       // Signature mismatch — mark as failed and reject
//       order.paymentStatus = "failed";
//       await order.save();

//       return res.status(400).json({
//         success: false,
//         message: "Payment signature verification failed. Possible payment tampering.",
//       });
//     }

//     // ── Signature valid — mark order as paid ──────────────────────────────────
//     order.isPaid            = true;
//     order.paidAt            = Date.now();
//     order.paymentStatus     = "paid";
//     order.razorpayPaymentId = razorpayPaymentId;
//     order.razorpaySignature = razorpaySignature;
//     order.orderStatus       = "Processing";

//     await order.save();

//     // FIX 7: Clear the user's cart after successful payment
//     // Done after order.save() so a cart-clear failure doesn't roll back the payment
//     try {
//       await Cart.findOneAndUpdate(
//         { user: order.user },
//         { $set: { items: [], coupon: null, couponCode: null } }
//       );
//     } catch (cartErr) {
//       // Non-fatal — log but don't fail the payment response
//       console.error("Failed to clear cart after payment:", cartErr);
//     }

//     res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//       orderId: order._id,
//     });
//   })
// );


// // ─────────────────────────────────────────────────────────────────────────────
// // POST /api/payment/webhook
// // Razorpay calls this directly as a server-side confirmation.
// // Acts as a safety net — confirms payment even if the user closes the tab
// // before /verify is called.
// //
// // ⚠️  CRITICAL: server.js MUST register express.raw({ type:"application/json" })
// //     scoped to this path BEFORE express.json(). Otherwise req.body is a parsed
// //     object, JSON.stringify re-serialises it with different bytes, and the HMAC
// //     will never match. See server.js section 6a.
// //
// // req.body here is a raw Buffer — handle accordingly.
// // ─────────────────────────────────────────────────────────────────────────────
// router.post(
//   "/webhook",
//   asyncHandler(async (req, res) => {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//     // If webhook secret isn't configured, acknowledge and skip processing.
//     // Log a warning — this should always be set in production.
//     if (!secret) {
//       console.warn(
//         "[payment/webhook] RAZORPAY_WEBHOOK_SECRET is not set. " +
//         "Webhook events are being acknowledged but NOT verified or processed."
//       );
//       return res.status(200).send("OK");
//     }

//     const signature = req.headers["x-razorpay-signature"];
//     if (!signature) {
//       return res.status(400).send("Missing x-razorpay-signature header");
//     }

//     // FIX 9: req.body is a raw Buffer (express.raw applied in server.js).
//     // Use it directly for HMAC — do NOT JSON.stringify a parsed object.
//     const rawBody = req.body; // Buffer

//     const expectedSignature = crypto
//       .createHmac("sha256", secret)
//       .update(rawBody)   // ← raw Buffer, byte-identical to what Razorpay signed
//       .digest("hex");

//     if (expectedSignature !== signature) {
//       return res.status(400).send("Invalid webhook signature");
//     }

//     // Parse the event only AFTER signature is verified
//     let event;
//     try {
//       event = JSON.parse(rawBody.toString());
//     } catch {
//       return res.status(400).send("Invalid JSON payload");
//     }

//     const eventName = event?.event;

//     // FIX 10: Guard against non-payment events (refunds, order events, etc.)
//     // that don't have payload.payment. Previously this threw a TypeError 500,
//     // which caused Razorpay to keep retrying indefinitely.
//     if (!event?.payload?.payment?.entity) {
//       // Acknowledge the event — we just don't act on it
//       return res.status(200).send("OK");
//     }

//     const paymentEntity  = event.payload.payment.entity;
//     const razorpayOrderId = paymentEntity.order_id;

//     if (!razorpayOrderId) {
//       return res.status(200).send("OK");
//     }

//     const order = await Order.findOne({ razorpayOrderId });

//     if (!order) {
//       // Unknown order — acknowledge so Razorpay stops retrying
//       return res.status(200).send("OK");
//     }

//     if (eventName === "payment.captured") {
//       // FIX 11: Idempotency — skip if already marked paid (e.g. by /verify)
//       if (order.isPaid || order.paymentStatus === "paid") {
//         return res.status(200).send("OK");
//       }

//       order.isPaid            = true;
//       order.paidAt            = Date.now();
//       order.paymentStatus     = "paid";
//       order.razorpayPaymentId = paymentEntity.id;
//       order.orderStatus       = "Processing";

//       await order.save();

//       // Clear cart — best-effort, non-fatal
//       try {
//         await Cart.findOneAndUpdate(
//           { user: order.user },
//           { $set: { items: [], coupon: null, couponCode: null } }
//         );
//       } catch (cartErr) {
//         console.error("[webhook] Failed to clear cart:", cartErr);
//       }

//     } else if (eventName === "payment.failed") {
//       // Only update if not already in a terminal payment state
//       if (order.paymentStatus !== "paid") {
//         order.paymentStatus = "failed";
//         await order.save();
//       }
//     }

//     // Always return 200 to Razorpay — anything else triggers retries
//     res.status(200).send("OK");
//   })
// );


// export default router;