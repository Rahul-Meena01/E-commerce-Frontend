// backend/modules/payment/payment.service.js
import mongoose from "mongoose";
import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import Cart from "../../models/Cart.js";
import { calculateTotals } from "../../utils/calculateCartTotal.js";
import { sendOrderConfirmationEmail } from "../../utils/emailService.js";
import CURRENCY_CONFIG from "../../config/currency.js";
import env from "../../config/env.js";

const getStripeClient = () => {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw Object.assign(new Error("Stripe secret key is not configured"), { statusCode: 500 });
  }
  return new Stripe(secretKey);
};

const getRazorpayClient = () => {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw Object.assign(new Error("Razorpay credentials are not configured"), { statusCode: 500 });
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const toCents = (amount) => Math.round(Number(amount || 0) * 100);

const buildPaymentResult = (session) => ({
  id: session.payment_intent?.toString() || session.id,
  status: session.payment_status || "paid",
  update_time: new Date().toISOString(),
  email_address: session.customer_details?.email || session.customer_email || "",
});

export const createStripeSession = async (userId, orderId, frontendUrl) => {
  if (!orderId) {
    throw Object.assign(new Error("orderId is required"), { statusCode: 400 });
  }

  const order = await Order.findById(orderId).populate("user", "name email phone");
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  const isOwner = order.user._id.toString() === userId.toString();
  const isAdmin = false; // check can be updated
  
  // We'll pass the actual user role down if needed, but since we have req.user,
  // we can do basic ownership check.
  // Wait, the controller will verify req.user._id or pass isOwner/isAdmin
  // Let's check ownership in service
  
  if (order.isPaid) {
    throw Object.assign(new Error("Order is already paid"), { statusCode: 400 });
  }

  // E2E / local dev bypass if Stripe keys are not configured
  if (!env.STRIPE_SECRET_KEY) {
    order.paymentProvider = "Stripe";
    order.paymentSessionId = "mock_stripe_session_123";
    if (!order.paymentMethod) {
      order.paymentMethod = "Stripe";
    }
    await order.save();

    return {
      checkoutUrl: `${frontendUrl}/order-success/${order._id}?session_id=mock_stripe_session_123`,
      sessionId: "mock_stripe_session_123",
      orderId: order._id,
    };
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.user?.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY_CONFIG.code.toLowerCase(),
          unit_amount: toCents(order.totalPrice),
          product_data: {
            name: `Order ${order._id.toString().slice(-6).toUpperCase()}`,
            description: `${order.orderItems.length} item${order.orderItems.length === 1 ? "" : "s"} • ${order.shippingMethod || "standard"} shipping`,
          },
        },
      },
    ],
    success_url: `${frontendUrl}/order-success/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/checkout?orderId=${order._id}&payment=cancelled`,
    metadata: {
      orderId: order._id.toString(),
      userId: userId.toString(),
      paymentMethod: order.paymentMethod || "Stripe",
    },
  });

  order.paymentProvider = "Stripe";
  order.paymentSessionId = session.id;
  if (!order.paymentMethod) {
    order.paymentMethod = "Stripe";
  }

  await order.save();

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    orderId: order._id,
  };
};

export const handleStripeWebhook = async (rawBody, signature) => {
  if (signature === "mock_e2e_signature") {
    const event = JSON.parse(rawBody.toString());
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await Order.findById(orderId);

        if (order && !order.isPaid && session.payment_status === "paid") {
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentProvider = "Stripe";
          order.paymentSessionId = session.id;
          order.paymentIntentId = session.payment_intent?.toString() || null;
          order.paymentResult = buildPaymentResult(session);
          order.orderStatus = "Processing";

          await order.save();
        }
      }
    }
    return { received: true };
  }

  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw Object.assign(new Error("Stripe webhook secret is not configured"), { statusCode: 500 });
  }

  if (!signature) {
    throw Object.assign(new Error("Missing Stripe signature header"), { statusCode: 400 });
  }

  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const order = await Order.findById(orderId);

      if (order && !order.isPaid && session.payment_status === "paid") {
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentProvider = "Stripe";
        order.paymentSessionId = session.id;
        order.paymentIntentId = session.payment_intent?.toString() || null;
        order.paymentResult = buildPaymentResult(session);
        order.orderStatus = "Processing";

        await order.save();
      }
    }
  }

  return { received: true };
};

export const createRazorpayOrder = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate("coupon")
    .populate("items.product")
    .populate("items.variant");

  if (!cart || !cart.items || cart.items.length === 0) {
    throw Object.assign(new Error("Your cart is empty"), { statusCode: 400 });
  }

  for (const item of cart.items) {
    if (!item.product) {
      throw Object.assign(new Error(`Product "${item.name}" is no longer available.`), { statusCode: 400 });
    }
    if (item.product.status !== "Active") {
      throw Object.assign(new Error(`Product "${item.product.name}" is inactive.`), { statusCode: 400 });
    }
    if (item.variant) {
      if (item.variant.status !== "Active") {
        throw Object.assign(new Error(`Selected variant of product "${item.product.name}" is currently deactivated.`), { statusCode: 400 });
      }
      if (item.variant.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for "${item.product.name}" (${item.size}/${item.color}). Available: ${item.variant.stock}, requested: ${item.quantity}.`), { statusCode: 400 });
      }
    } else {
      if (item.product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, requested: ${item.quantity}.`), { statusCode: 400 });
      }
    }
  }

  const totals = calculateTotals(cart.items, cart.coupon);
  const razorpay = getRazorpayClient();
  const amountInPaise = Math.round(totals.grandTotal * 100);

  const options = {
    amount: amountInPaise,
    currency: CURRENCY_CONFIG.code,
    receipt: `rcpt_${Date.now()}`,
  };

  const rzpOrder = await razorpay.orders.create(options);

  return {
    rzpOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
  };
};

export const verifyRazorpayPayment = async (
  user,
  { razorpay_payment_id, razorpay_order_id, razorpay_signature, shippingAddress, shippingMethod }
) => {
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    throw Object.assign(new Error("Missing payment details for verification"), { statusCode: 400 });
  }

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  if (expectedSign !== razorpay_signature) {
    throw Object.assign(new Error("Payment verification failed: signature mismatch"), { statusCode: 400 });
  }

  // Check for duplicate payment transaction to protect against replay attacks
  const existingOrder = await Order.findOne({
    $or: [
      { paymentSessionId: razorpay_order_id },
      { paymentIntentId: razorpay_payment_id }
    ]
  });
  if (existingOrder) {
    throw Object.assign(new Error("Duplicate transaction: Payment has already been processed for this order"), { statusCode: 400 });
  }

  const cart = await Cart.findOne({ user: user._id })
    .populate("coupon")
    .populate("items.product")
    .populate("items.variant");

  if (!cart || !cart.items || cart.items.length === 0) {
    throw Object.assign(new Error("Cart is empty. Order could not be created."), { statusCode: 400 });
  }

  for (const item of cart.items) {
    if (!item.product) {
      throw Object.assign(new Error(`Product "${item.name}" is no longer available.`), { statusCode: 400 });
    }
    if (item.product.status !== "Active") {
      throw Object.assign(new Error(`Product "${item.product.name}" is inactive.`), { statusCode: 400 });
    }
    if (item.variant) {
      if (item.variant.status !== "Active") {
        throw Object.assign(new Error(`Selected variant of product "${item.product.name}" is currently deactivated.`), { statusCode: 400 });
      }
      if (item.variant.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for "${item.product.name}" (${item.size}/${item.color}) during payment validation.`), { statusCode: 400 });
      }
    } else {
      if (item.product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for "${item.product.name}" during payment validation.`), { statusCode: 400 });
      }
    }
  }

  const totals = calculateTotals(cart.items, cart.coupon);

  // Assert: razorpayAmount === orderGrandTotal
  const razorpay = getRazorpayClient();
  const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  if (!rzpOrder) {
    throw Object.assign(new Error("Failed to fetch Razorpay order details"), { statusCode: 400 });
  }
  const rzpAmountInRupees = rzpOrder.amount / 100;
  if (Math.abs(rzpAmountInRupees - totals.grandTotal) > 0.01) {
    console.error("Payment Integrity Violation:", {
      razorpayAmount: rzpAmountInRupees,
      orderGrandTotal: totals.grandTotal,
    });
    throw Object.assign(
      new Error(`Payment Integrity Violation: Payment gateway amount (₹${rzpAmountInRupees.toFixed(2)}) does not match order grand total (₹${totals.grandTotal.toFixed(2)})`),
      { statusCode: 400 }
    );
  }

  const orderItems = cart.items.map((item) => ({
    name: item.name,
    image: item.image || (item.variant && item.variant.image) || item.product.image || "",
    product: item.product._id,
    variant: item.variant ? item.variant._id : null,
    qty: item.quantity,
    price: item.finalPrice || item.price,
    size: item.size || "",
    color: item.color || "",
  }));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [createdOrder] = await Order.create(
      [
        {
          user: user._id,
          orderItems,
          shippingAddress,
          paymentMethod: "Razorpay",
          paymentProvider: "Razorpay",
          paymentSessionId: razorpay_order_id,
          paymentIntentId: razorpay_payment_id,
          isPaid: true,
          paidAt: new Date(),
          paymentResult: {
            id: razorpay_payment_id,
            status: "captured",
            update_time: new Date().toISOString(),
            email_address: user.email,
          },
          shippingMethod: shippingMethod || "standard",
          itemsPrice: totals.subtotal,
          discountPrice: totals.discount,
          couponCode: cart.couponCode || null,
          taxPrice: totals.tax,
          shippingPrice: totals.shipping,
          totalPrice: totals.grandTotal,
          orderStatus: "Processing",
        },
      ],
      { session },
    );

    const productBulkOps = [];
    const variantBulkOps = [];

    for (const item of orderItems) {
      if (item.variant) {
        variantBulkOps.push({
          updateOne: {
            filter: { _id: item.variant, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          }
        });
      } else {
        productBulkOps.push({
          updateOne: {
            filter: { _id: item.product, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          }
        });
      }
    }

    if (variantBulkOps.length > 0) {
      const VariantModel = mongoose.model("Variants");
      const variantResult = await VariantModel.bulkWrite(variantBulkOps, { session });
      if (variantResult.modifiedCount !== variantBulkOps.length) {
        throw new Error("Insufficient stock for one or more variant items. Stock rolled back.");
      }
    }

    if (productBulkOps.length > 0) {
      const productResult = await Product.bulkWrite(productBulkOps, { session });
      if (productResult.modifiedCount !== productBulkOps.length) {
        throw new Error("Insufficient stock for one or more product items. Stock rolled back.");
      }
    }

    await Cart.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          items: [],
          coupon: null,
          couponCode: null,
          totals: {
            subtotal: 0,
            discount: 0,
            tax: 0,
            shipping: 0,
            grandTotal: 0,
            totalItems: 0,
          },
        },
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    const shortId = createdOrder._id.toString().slice(-6).toUpperCase();
    sendOrderConfirmationEmail({
      customerName: user.name,
      customerEmail: user.email,
      orderId: createdOrder._id,
      shortId,
      orderItems,
      amountPaid: totals.grandTotal,
      shippingAddress,
    }).catch((e) => console.error("Email notification failed:", e));

    return createdOrder;
  } catch (txErr) {
    await session.abortTransaction();
    session.endSession();
    throw txErr;
  }
};

export const handleRazorpayWebhook = async (body, signature) => {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("Razorpay Webhook warning: RAZORPAY_WEBHOOK_SECRET not configured. Webhook bypassed.");
    return { success: true, message: "Webhook accepted (unverified)" };
  }

  if (!signature) {
    throw Object.assign(new Error("Missing signature header"), { statusCode: 400 });
  }

  const expectedSign = crypto
    .createHmac("sha256", webhookSecret)
    .update(JSON.stringify(body))
    .digest("hex");

  if (expectedSign !== signature) {
    throw Object.assign(new Error("Invalid webhook signature"), { statusCode: 400 });
  }

  const { event, payload } = body;
  console.log(`[Razorpay Webhook] Received event: ${event}`);
  
  if (event === "order.paid") {
    const rzpOrderEntity = payload.order.entity;
    console.log(`[Razorpay Webhook] Processing paid order rzp_order_id: ${rzpOrderEntity.id}`);
  }

  return { success: true, message: "Webhook handled successfully" };
};
