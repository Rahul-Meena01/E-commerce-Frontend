// ─── routes/order.js ─────────────────────────────────────────────────────────
// Express router for all order-related endpoints.
// Mount in your main app file:  app.use("/api/orders", orderRouter);
//
// Routes (in declaration order — specific before parameterised):
//   POST   /api/orders                 Create order + deduct stock (atomic)
//   GET    /api/orders/myorders        Current user's orders (paginated)
//   GET    /api/orders                 All orders — admin (paginated + filterable)
//   GET    /api/orders/:id             Single order (owner or admin)
//   PUT    /api/orders/:id/pay         Mark as paid (payment gateway callback)
//   PUT    /api/orders/:id/cancel      User cancels own order + stock restore
//   PUT    /api/orders/:id/status      Admin updates order status + side-effects
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import VendorProduct from "../models/vendor/vendorProduct.js";
import CouponUsage from "../models/CouponUsages.js";
import Coupon from "../models/Coupon.js";
import GiftCard from "../models/GiftCard.js";
import { protect, requireAuth } from "../middleware/authMiddleware.js";
import { getIO } from "../socket.js";

const router = express.Router();

// ─── Pricing constants (override via .env) ────────────────────────────────────
const FREE_SHIPPING_THRESHOLD =
  Number(process.env.FREE_SHIPPING_THRESHOLD) || 100;
const SHIPPING_RATE = Number(process.env.SHIPPING_RATE) || 10;
const TAX_RATE = Number(process.env.TAX_RATE) || 0.15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns last 6 chars of a Mongo ObjectId as uppercase string */
const getShortId = (objectId) => objectId.toString().slice(-6).toUpperCase();

/** Attaches shortId to any order doc or plain object */
const formatOrder = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  return { ...obj, shortId: getShortId(obj._id) };
};

/** Prevents CastError 500s from malformed IDs in URL params */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  ROUTE ORDER MATTERS:
//     /myorders MUST be declared before /:id, otherwise Express treats the
//     literal string "myorders" as the value of the :id param.
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// @desc    Create a new order & atomically deduct inventory
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const validPaymentMethods = ["Stripe", "PayPal", "Razorpay", "COD"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
      });
    }

    if (
      !shippingAddress?.address ||
      !shippingAddress?.city ||
      !shippingAddress?.postalCode ||
      !shippingAddress?.country
    ) {
      return res
        .status(400)
        .json({ message: "Complete shipping address is required" });
    }

    // ── Fetch authoritative product data — NEVER trust client-sent prices ───
    const productIds = orderItems.map((i) => i.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const vendorProducts = await VendorProduct.find({
      _id: { $in: productIds },
    });

    const allProducts = [...dbProducts, ...vendorProducts];

    if (allProducts.length !== productIds.length) {
      return res
        .status(404)
        .json({ message: "One or more products not found" });
    }

    const cart = await mongoose
      .model("Cart")
      .findOne({ user: req.user._id })
      .populate("coupon giftCard");
    let couponData = null;
    let giftCardData = null;

    if (cart?.coupon && cart.coupon.isValidCoupon()) {
      couponData = cart.coupon;
    }

    if (cart?.giftCard && cart.giftCard.isValidGiftCard()) {
      giftCardData = cart.giftCard;
    }

    // Build a mock cart object to feed into calculateCartTotals
    const mockCart = { items: [] };

    // ── Build server-authoritative order items ──────────────────────────────
    const dbOrderItems = orderItems.map((clientItem) => {
      const dbProduct = allProducts.find(
        (p) => p._id.toString() === clientItem.product,
      );
      const isVendor = vendorProducts.some(
        (vp) => vp._id.toString() === clientItem.product,
      );

      const salePrice = isVendor
        ? dbProduct.salePrice || 0
        : dbProduct.discountPrice || 0;
      const actualPrice = salePrice > 0 ? salePrice : dbProduct.price;

      mockCart.items.push({
        finalPrice: actualPrice,
        quantity: clientItem.qty,
      });

      return {
        name: dbProduct.name,
        image:
          dbProduct.image || (dbProduct.images && dbProduct.images[0]) || "",
        product: dbProduct._id,
        productModel: isVendor ? "VendorProduct" : "Product",
        qty: clientItem.qty,
        price: actualPrice,
      };
    });

    // ── Price totals (using shared logic) ───────────────────────────────────
    const { default: calculateCartTotals } =
      await import("../utils/calculateCartTotal.js");

    // Step 1: Calculate raw totals to check coupon validity
    let totals = calculateCartTotals(mockCart, null, null);

    // Step 2: Validate coupon minimum order amount and products
    if (couponData) {
      if (
        couponData.minimumOrderAmount &&
        totals.subtotal < couponData.minimumOrderAmount
      ) {
        couponData = null;
      } else if (couponData.type === "product") {
        const hasEligibleProduct = dbOrderItems.some((item) =>
          couponData.applicableProducts
            .map((id) => id.toString())
            .includes(item.product.toString()),
        );
        if (!hasEligibleProduct) {
          couponData = null;
        }
      }
    }

    // Step 3: Final calculation with validated coupon and gift card
    totals = calculateCartTotals(mockCart, couponData, giftCardData);

    const itemsPrice = totals.subtotal;
    const taxPrice = totals.tax;
    const shippingPrice = totals.shipping;
    const totalPrice = totals.grandTotal;

    // ── Mongo Transaction: save order + deduct stock atomically ─────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [createdOrder] = await Order.create(
        [
          {
            user: req.user._id,
            orderItems: dbOrderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
            coupon: couponData ? couponData._id : undefined,
            couponDiscount: totals.discount || 0,
            giftCard: giftCardData ? giftCardData._id : undefined,
            giftCardDiscount: totals.giftCardDiscount || 0,
          },
        ],
        { session },
      );

      // Atomic stock deduction
      const bulkOpsProduct = [];
      const bulkOpsVendorProduct = [];

      dbOrderItems.forEach((item) => {
        const op = {
          updateOne: {
            filter: { _id: item.product, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          },
        };
        if (item.productModel === "VendorProduct") {
          bulkOpsVendorProduct.push(op);
        } else {
          bulkOpsProduct.push(op);
        }
      });

      if (bulkOpsProduct.length > 0) {
        const bulkResult = await Product.bulkWrite(bulkOpsProduct, { session });
        if (bulkResult.modifiedCount !== bulkOpsProduct.length) {
          throw Object.assign(
            new Error(
              "Insufficient stock for one or more items. Please review your cart.",
            ),
            { statusCode: 400 },
          );
        }
      }

      if (bulkOpsVendorProduct.length > 0) {
        const bulkResultVendor = await VendorProduct.bulkWrite(
          bulkOpsVendorProduct,
          { session },
        );
        if (bulkResultVendor.modifiedCount !== bulkOpsVendorProduct.length) {
          throw Object.assign(
            new Error(
              "Insufficient stock for one or more items. Please review your cart.",
            ),
            { statusCode: 400 },
          );
        }
      }

      await session.commitTransaction();

      await createdOrder.populate("user", "id name email phone");

      // ── Confirm coupon usage ─────────────────────────────────────────────
      // FIX: Use findOneAndUpdate to safely handle all existing status cases.
      // The old code only updated records with status="applied" and created a new
      // one otherwise — but with the unique index removed, we must always upsert.
      // We also no longer touch usedCount here: it was already incremented when
      // the coupon was applied in cart.js, and confirmed status is just a state
      // transition.
      if (couponData) {
        try {
          await CouponUsage.findOneAndUpdate(
            { coupon: couponData._id, user: req.user._id },
            {
              $set: {
                status: "confirmed",
                order: createdOrder._id,
                // Refresh snapshots in case cart recalculated a different amount
                discountAmount: totals.discount ?? 0,
                cartTotal: totals.subtotal,
              },
              // Only set these fields if this is a brand-new insert (should not
              // happen in normal flow, but guards against edge cases where the
              // usage record was never written during apply)
              $setOnInsert: {
                couponCode: couponData.code,
                discountType: couponData.discountType,
                discountValue: couponData.discountValue,
                product:
                  couponData.type === "product"
                    ? (couponData.applicableProducts[0] ?? null)
                    : null,
              },
            },
            { upsert: true, new: true },
          );
        } catch (usageError) {
          // Non-fatal: order is already committed; just log
          console.error("Coupon usage confirmation failed:", usageError);
        }
      }

      // ── Deduct Gift Card Balance (COD only immediately) ───────────────────
      // If payment is online (Razorpay), deduction happens in payment.js on success.
      if (giftCardData && paymentMethod === "COD" && totals.giftCardDiscount > 0) {
        try {
          const discountAmt = totals.giftCardDiscount;
          const gc = await GiftCard.findById(giftCardData._id).session(session);
          if (gc) {
            gc.balance -= discountAmt;
            if (gc.balance <= 0) {
              gc.balance = 0;
              gc.status = "inactive";
            }
            await gc.save({ session });
          }
        } catch (gcError) {
          console.error("Gift card deduction failed on COD:", gcError);
        }
      }

      try {
        const io = getIO();
        io.emit("newOrder", formatOrder(createdOrder));
      } catch (err) {
        console.error("Socket error on new order:", err);
      }

      return res.status(201).json(formatOrder(createdOrder));
    } catch (txError) {
      await session.abortTransaction();
      return res
        .status(txError.statusCode || 500)
        .json({ message: txError.message });
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/orders/myorders ─────────────────────────────────────────────────
// @desc    Get logged-in user's orders with pagination
// @access  Private
// ⚠️  Must stay above GET /:id
router.get("/myorders", protect, async (req, res) => {
  try {
    const pageSize = 10;
    const page = Math.max(1, Number(req.query.pageNumber) || 1);
    const filter = { user: req.user._id };
    const count = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      orders: orders.map(formatOrder),
      page,
      pages: Math.ceil(count / pageSize),
      totalOrders: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// @desc    Get ALL orders — admin — with pagination + optional ?status= filter
// @access  Private/Admin
router.get("/", protect, requireAuth("admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)
        filter.createdAt.$lte = new Date(req.query.to + "T23:59:59.999Z");
    }

    const count = await Order.countDocuments(filter);

    let query = Order.find(filter)
      .populate("user", "id name email phone")
      .sort({ createdAt: -1 });

    const isAll = req.query.limit === "all";
    const pageSize = isAll ? count : 10;
    const page = isAll ? 1 : Math.max(1, Number(req.query.pageNumber) || 1);

    if (!isAll) {
      query = query.limit(pageSize).skip(pageSize * (page - 1));
    }

    const orders = await query;

    res.json({
      orders: orders.map(formatOrder),
      page,
      pages: isAll ? 1 : Math.ceil(count / (pageSize || 1)),
      totalOrders: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// @desc    Get a single order by ID — owner or admin
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone",
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorised to view this order" });
    }

    res.json(formatOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/orders/:id/pay ──────────────────────────────────────────────────
// @desc    Mark order as paid after payment gateway callback
// @access  Private
router.put("/:id/pay", protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    if (!req.body.id || !req.body.status || !req.body.update_time) {
      return res.status(400).json({
        message: "Payment result must include id, status, and update_time",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.isPaid)
      return res
        .status(400)
        .json({ message: "Order is already marked as paid" });

    if (
      order.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorised to update this order" });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    await updatedOrder.populate("user", "id name email phone");

    try {
      const io = getIO();
      io.emit("orderUpdated", formatOrder(updatedOrder));
    } catch (err) {
      console.error("Socket error on order pay:", err);
    }

    res.json(formatOrder(updatedOrder));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/orders/:id/cancel ───────────────────────────────────────────────
// @desc    User cancels their own order (only Pending / Processing)
//          Atomically restores stock for all items
// @access  Private
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorised to cancel this order" });
    }

    const cancellableStatuses = ["Pending", "Processing"];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Order cannot be cancelled once it is ${order.orderStatus}`,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.orderStatus = "Cancelled";
      order.cancelledBy = "user";
      order.cancelledAt = Date.now();
      order.cancellationNote = req.body.note || "";

      const restoreOpsProduct = [];
      const restoreOpsVendorProduct = [];

      order.orderItems.forEach((item) => {
        const op = {
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { stock: item.qty } },
          },
        };
        if (item.productModel === "VendorProduct") {
          restoreOpsVendorProduct.push(op);
        } else {
          restoreOpsProduct.push(op);
        }
      });

      await order.save({ session });
      if (restoreOpsProduct.length > 0) {
        await Product.bulkWrite(restoreOpsProduct, { session });
      }
      if (restoreOpsVendorProduct.length > 0) {
        await VendorProduct.bulkWrite(restoreOpsVendorProduct, { session });
      }
      await session.commitTransaction();

      await order.populate("user", "id name email phone");

      // Mark coupon usage as cancelled and decrement usedCount
      try {
        const usage = await CouponUsage.findOne({
          order: order._id,
          user: order.user._id,
          status: "confirmed",
        });

        if (usage) {
          usage.status = "cancelled";
          await usage.save();

          await Coupon.findByIdAndUpdate(usage.coupon, {
            $inc: { usedCount: -1 },
          });
        }
      } catch (usageError) {
        console.error("Coupon usage cancellation failed:", usageError);
      }

      // Restore gift card balance
      if (order.giftCard && order.giftCardDiscount > 0) {
        try {
          const gc = await GiftCard.findById(order.giftCard);
          if (gc) {
            gc.balance += order.giftCardDiscount;
            // Reactivate if it was inactive
            if (gc.status === "inactive" && gc.balance > 0 && new Date() < gc.expiryDate) {
              gc.status = "active";
            }
            await gc.save();
          }
        } catch (gcError) {
          console.error("Gift card restore failed:", gcError);
        }
      }

      try {
        const io = getIO();
        io.emit("orderUpdated", formatOrder(order));
      } catch (err) {
        console.error("Socket error on order cancel:", err);
      }

      res.json(formatOrder(order));
    } catch (txError) {
      await session.abortTransaction();
      res.status(500).json({ message: txError.message });
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/orders/:id/status ───────────────────────────────────────────────
// @desc    Admin updates order status
//          Side-effects: delivered flag, COD auto-pay, cancelled stock restore
// @access  Private/Admin
router.put("/:id/status", protect, requireAuth("admin"), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!req.body.status || !validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const terminalStatuses = ["Delivered", "Cancelled"];
    if (terminalStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Cannot change status of a ${order.orderStatus} order`,
      });
    }

    const newStatus = req.body.status;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.orderStatus = newStatus;

      if (newStatus === "Delivered") {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        if (order.paymentMethod === "COD" && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = Date.now();
        }
      }

      if (newStatus === "Cancelled") {
        order.cancelledBy = "admin";
        order.cancelledAt = Date.now();
        order.cancellationNote = req.body.note || "";

        const restoreOpsProduct = [];
        const restoreOpsVendorProduct = [];

        order.orderItems.forEach((item) => {
          const op = {
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: item.qty } },
            },
          };
          if (item.productModel === "VendorProduct") {
            restoreOpsVendorProduct.push(op);
          } else {
            restoreOpsProduct.push(op);
          }
        });

        if (restoreOpsProduct.length > 0) {
          await Product.bulkWrite(restoreOpsProduct, { session });
        }
        if (restoreOpsVendorProduct.length > 0) {
          await VendorProduct.bulkWrite(restoreOpsVendorProduct, { session });
        }
      }

      const updatedOrder = await order.save({ session });
      await session.commitTransaction();

      await updatedOrder.populate("user", "id name email phone");

      // Mark coupon usage as cancelled if admin cancels the order
      if (newStatus === "Cancelled") {
        try {
          const usage = await CouponUsage.findOne({
            order: updatedOrder._id,
            status: "confirmed",
          });

          if (usage) {
            usage.status = "cancelled";
            await usage.save();

            await Coupon.findByIdAndUpdate(usage.coupon, {
              $inc: { usedCount: -1 },
            });
          }
        } catch (usageError) {
          console.error("Coupon usage cancellation failed:", usageError);
        }

        // Restore gift card balance
        if (updatedOrder.giftCard && updatedOrder.giftCardDiscount > 0) {
          try {
            const gc = await GiftCard.findById(updatedOrder.giftCard).session(session);
            if (gc) {
              gc.balance += updatedOrder.giftCardDiscount;
              if (gc.status === "inactive" && gc.balance > 0 && new Date() < gc.expiryDate) {
                gc.status = "active";
              }
              await gc.save({ session });
            }
          } catch (gcError) {
            console.error("Gift card restore failed on admin cancel:", gcError);
          }
        }
      }

      try {
        const io = getIO();
        io.emit("orderUpdated", formatOrder(updatedOrder));
      } catch (err) {
        console.error("Socket error on order status update:", err);
      }

      res.json(formatOrder(updatedOrder));
    } catch (txError) {
      await session.abortTransaction();
      res.status(500).json({ message: txError.message });
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
