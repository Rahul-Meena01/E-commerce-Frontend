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
import { protect, requireAuth } from '../middleware/authMiddleware.js';

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

    if (dbProducts.length !== productIds.length) {
      return res
        .status(404)
        .json({ message: "One or more products not found" });
    }

    // ── Build server-authoritative order items ──────────────────────────────
    const dbOrderItems = orderItems.map((clientItem) => {
      const dbProduct = dbProducts.find(
        (p) => p._id.toString() === clientItem.product,
      );
      // Use discountPrice when set and > 0; otherwise use list price
      const actualPrice =
        dbProduct.discountPrice && dbProduct.discountPrice > 0
          ? dbProduct.discountPrice
          : dbProduct.price;

      return {
        name: dbProduct.name,
        image: dbProduct.image,
        product: dbProduct._id,
        qty: clientItem.qty,
        price: actualPrice,
      };
    });

    // ── Price totals ────────────────────────────────────────────────────────
    const itemsPrice = dbOrderItems.reduce(
      (acc, i) => acc + i.price * i.qty,
      0,
    );
    const shippingPrice =
      itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATE;
    const taxPrice = TAX_RATE * itemsPrice;
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    // ── Mongo Transaction: save order + deduct stock atomically ─────────────
    // Requires a MongoDB Replica Set (Atlas supports this out of the box).
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
          },
        ],
        { session },
      );

      // Atomic stock deduction — the $gte guard prevents overselling
      const bulkOps = dbOrderItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product, stock: { $gte: item.qty } },
          update: { $inc: { stock: -item.qty } },
        },
      }));

      const bulkResult = await Product.bulkWrite(bulkOps, { session });

      if (bulkResult.modifiedCount !== dbOrderItems.length) {
        throw Object.assign(
          new Error(
            "Insufficient stock for one or more items. Please review your cart.",
          ),
          { statusCode: 400 },
        );
      }

      await session.commitTransaction();
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
router.get("/", protect, requireAuth('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;

    // Optional date range: ?from=2026-01-01&to=2026-05-31
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)
        filter.createdAt.$lte = new Date(req.query.to + "T23:59:59.999Z");
    }

    const count = await Order.countDocuments(filter);

    let query = Order.find(filter)
      .populate("user", "id name email phone") // phone added for UI display
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

    // ── Transaction: cancel order + restore stock atomically ─────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.orderStatus = "Cancelled";
      order.cancelledBy = "user";
      order.cancelledAt = Date.now();
      order.cancellationNote = req.body.note || "";

      const restoreOps = order.orderItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: item.qty } },
        },
      }));

      await order.save({ session });
      await Product.bulkWrite(restoreOps, { session });
      await session.commitTransaction();

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
router.put("/:id/status", protect, requireAuth('admin'), async (req, res) => {
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

    // Terminal orders cannot be changed
    const terminalStatuses = ["Delivered", "Cancelled"];
    if (terminalStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Cannot change status of a ${order.orderStatus} order`,
      });
    }

    const newStatus = req.body.status;

    // ── Transaction: status + side-effects atomically ────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.orderStatus = newStatus;

      if (newStatus === "Delivered") {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        // Auto-mark COD as paid on delivery
        if (order.paymentMethod === "COD" && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = Date.now();
        }
      }

      if (newStatus === "Cancelled") {
        order.cancelledBy = "admin";
        order.cancelledAt = Date.now();
        order.cancellationNote = req.body.note || "";

        // Restore stock for all items
        const restoreOps = order.orderItems.map((item) => ({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { stock: item.qty } },
          },
        }));
        await Product.bulkWrite(restoreOps, { session });
      }

      const updatedOrder = await order.save({ session });
      await session.commitTransaction();
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

// import express from "express";
// import mongoose from "mongoose";
// import Order from "../models/Order.js";
// import Product from "../models/Product.js";
// import { protect, requireAuth } from '../middleware/authMiddleware.js';

// const router = express.Router();

// // ─── Pricing constants (override via .env anytime) ────────────────────────────
// const FREE_SHIPPING_THRESHOLD =
//   Number(process.env.FREE_SHIPPING_THRESHOLD) || 100;
// const SHIPPING_RATE = Number(process.env.SHIPPING_RATE) || 10;
// const TAX_RATE = Number(process.env.TAX_RATE) || 0.15;

// // ─── Shared Helpers ───────────────────────────────────────────────────────────

// // Returns last 6 chars of a Mongo ObjectId — safe regardless of ID length
// const getShortId = (objectId) => objectId.toString().slice(-6).toUpperCase();

// // Attaches shortId to any order object (works with Mongoose doc or plain object)
// const formatOrder = (order) => {
//   const obj = order.toObject ? order.toObject() : order;
//   return { ...obj, shortId: getShortId(obj._id) };
// };

// // Returns true when a string is a valid Mongo ObjectId — prevents CastError 500s
// const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// // ─────────────────────────────────────────────────────────────────────────────
// // ⚠️  ROUTE ORDER MATTERS:
// //     Specific paths (/myorders) MUST be declared before parameterised (/:id)
// //     paths, otherwise Express matches "myorders" as the :id param.
// // ─────────────────────────────────────────────────────────────────────────────

// // ─── POST /api/orders ─────────────────────────────────────────────────────────
// // @desc    Create new order + atomically deduct inventory
// // @access  Private
// router.post("/", protect, async (req, res) => {
//   try {
//     const { orderItems, shippingAddress, paymentMethod } = req.body;

//     // ── Input validation ────────────────────────────────────────────────────
//     if (!orderItems || orderItems.length === 0) {
//       // Bug fix: was && instead of ||
//       return res.status(400).json({ message: "No order items provided" });
//     }

//     if (!paymentMethod) {
//       return res.status(400).json({ message: "Payment method is required" });
//     }

//     const validPaymentMethods = ["Stripe", "PayPal", "Razorpay", "COD"];
//     if (!validPaymentMethods.includes(paymentMethod)) {
//       return res.status(400).json({
//         message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`,
//       });
//     }

//     if (
//       !shippingAddress?.address ||
//       !shippingAddress?.city ||
//       !shippingAddress?.postalCode ||
//       !shippingAddress?.country
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Complete shipping address is required" });
//     }

//     // ── Fetch real product data from DB — NEVER trust client-sent prices ────
//     const productIds = orderItems.map((i) => i.product);
//     const dbProducts = await Product.find({ _id: { $in: productIds } });

//     if (dbProducts.length !== productIds.length) {
//       return res
//         .status(404)
//         .json({ message: "One or more products not found" });
//     }

//     // ── Build server-authoritative order items ──────────────────────────────
//     const dbOrderItems = orderItems.map((clientItem) => {
//       const dbProduct = dbProducts.find(
//         (p) => p._id.toString() === clientItem.product,
//       );

//       // Use discountPrice when it's set and greater than zero; otherwise use price
//       const actualPrice =
//         dbProduct.discountPrice && dbProduct.discountPrice > 0
//           ? dbProduct.discountPrice
//           : dbProduct.price;

//       return {
//         name: dbProduct.name,
//         image: dbProduct.image,
//         product: dbProduct._id,
//         qty: clientItem.qty,
//         price: actualPrice,
//       };
//     });

//     // ── Price totals ────────────────────────────────────────────────────────
//     const itemsPrice = dbOrderItems.reduce(
//       (acc, item) => acc + item.price * item.qty,
//       0,
//     );
//     const shippingPrice =
//       itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATE;
//     const taxPrice = TAX_RATE * itemsPrice;
//     const totalPrice = itemsPrice + shippingPrice + taxPrice;

//     // ── Mongo Transaction — keeps order save + stock deduction atomic ───────
//     // If stock deduction fails, the order is automatically rolled back too.
//     // Requires MongoDB Replica Set (Atlas works out of the box).
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // 1. Save the order inside the transaction
//       const [createdOrder] = await Order.create(
//         [
//           {
//             user: req.user._id,
//             orderItems: dbOrderItems,
//             shippingAddress,
//             paymentMethod,
//             itemsPrice,
//             taxPrice,
//             shippingPrice,
//             totalPrice,
//           },
//         ],
//         { session },
//       );

//       // 2. Atomically deduct stock — the filter `stock: { $gte: qty }` means
//       //    the update only succeeds when stock is actually sufficient.
//       //    Two concurrent requests on the last item → only one wins.
//       const bulkOps = dbOrderItems.map((item) => ({
//         updateOne: {
//           filter: { _id: item.product, stock: { $gte: item.qty } },
//           update: { $inc: { stock: -item.qty } },
//         },
//       }));

//       const bulkResult = await Product.bulkWrite(bulkOps, { session });

//       // If modifiedCount doesn't match, at least one item was out of stock
//       if (bulkResult.modifiedCount !== dbOrderItems.length) {
//         throw Object.assign(
//           new Error(
//             "Insufficient stock for one or more items. Please review your cart.",
//           ),
//           { statusCode: 400 },
//         );
//       }

//       await session.commitTransaction();
//       return res.status(201).json(formatOrder(createdOrder));
//     } catch (txError) {
//       await session.abortTransaction(); // rolls back order + stock changes together
//       const status = txError.statusCode || 500;
//       return res.status(status).json({ message: txError.message });
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── GET /api/orders/myorders ─────────────────────────────────────────────────
// // @desc    Get logged-in user's orders with pagination
// // @access  Private
// // ⚠️  Must stay above GET /:id
// router.get("/myorders", protect, async (req, res) => {
//   try {
//     const pageSize = 10;
//     const page = Math.max(1, Number(req.query.pageNumber) || 1);

//     const filter = { user: req.user._id };
//     const count = await Order.countDocuments(filter);

//     const orders = await Order.find(filter)
//       .sort({ createdAt: -1 })
//       .limit(pageSize)
//       .skip(pageSize * (page - 1));

//     res.json({
//       orders: orders.map(formatOrder),
//       page,
//       pages: Math.ceil(count / pageSize),
//       totalOrders: count,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── GET /api/orders ──────────────────────────────────────────────────────────
// // @desc    Get ALL orders with pagination + optional ?status= filter (admin)
// // @access  Private/Admin
// router.get("/", protect, requireAuth('admin'), async (req, res) => {
//   try {
//     const pageSize = 20;
//     const page = Math.max(1, Number(req.query.pageNumber) || 1);

//     // Optional status filter: GET /api/orders?status=Shipped
//     const filter = {};
//     if (req.query.status) filter.orderStatus = req.query.status;

//     const count = await Order.countDocuments(filter);

//     const orders = await Order.find(filter)
//       .populate("user", "id name email")
//       .sort({ createdAt: -1 })
//       .limit(pageSize)
//       .skip(pageSize * (page - 1));

//     res.json({
//       orders: orders.map(formatOrder),
//       page,
//       pages: Math.ceil(count / pageSize),
//       totalOrders: count,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// // @desc    Get a single order by ID (owner or admin)
// // @access  Private
// router.get("/:id", protect, async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) {
//       return res.status(400).json({ message: "Invalid order ID format" });
//     }

//     const order = await Order.findById(req.params.id).populate(
//       "user",
//       "name email",
//     );

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Only the owner or an admin may view this order
//     const isOwner = order.user._id.toString() === req.user._id.toString();
//     if (!isOwner && !req.user.isAdmin) {
//       return res
//         .status(403)
//         .json({ message: "Not authorised to view this order" });
//     }

//     res.json(formatOrder(order));
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── PUT /api/orders/:id/pay ──────────────────────────────────────────────────
// // @desc    Mark order as paid after payment gateway callback
// // @access  Private
// router.put("/:id/pay", protect, async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) {
//       return res.status(400).json({ message: "Invalid order ID format" });
//     }

//     // Validate payment result payload
//     if (!req.body.id || !req.body.status || !req.body.update_time) {
//       return res.status(400).json({
//         message: "Payment result must include id, status, and update_time",
//       });
//     }

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     if (order.isPaid) {
//       return res
//         .status(400)
//         .json({ message: "Order is already marked as paid" });
//     }

//     // Only the owner can confirm their own payment
//     if (
//       order.user.toString() !== req.user._id.toString() &&
//       !req.user.isAdmin
//     ) {
//       return res
//         .status(403)
//         .json({ message: "Not authorised to update this order" });
//     }

//     order.isPaid = true;
//     order.paidAt = Date.now();
//     order.paymentResult = {
//       id: req.body.id,
//       status: req.body.status,
//       update_time: req.body.update_time,
//       email_address: req.body.email_address,
//     };

//     const updatedOrder = await order.save();
//     res.json(formatOrder(updatedOrder));
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── PUT /api/orders/:id/cancel ───────────────────────────────────────────────
// // @desc    User cancels their own order (only while Pending or Processing)
// //          Automatically restores stock for all items in the order
// // @access  Private
// router.put("/:id/cancel", protect, async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) {
//       return res.status(400).json({ message: "Invalid order ID format" });
//     }

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Ownership check — users can only cancel their own orders
//     if (order.user.toString() !== req.user._id.toString()) {
//       return res
//         .status(403)
//         .json({ message: "Not authorised to cancel this order" });
//     }

//     // Can only cancel before the order ships
//     const cancellableStatuses = ["Pending", "Processing"];
//     if (!cancellableStatuses.includes(order.orderStatus)) {
//       return res.status(400).json({
//         message: `Order cannot be cancelled once it is ${order.orderStatus}`,
//       });
//     }

//     // ── Transaction: update order status + restore stock atomically ─────────
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       order.orderStatus = "Cancelled";
//       order.cancelledBy = "user";
//       order.cancelledAt = Date.now();
//       order.cancellationNote = req.body.note || "";

//       // Restore stock for every item in the order
//       const restoreOps = order.orderItems.map((item) => ({
//         updateOne: {
//           filter: { _id: item.product },
//           update: { $inc: { stock: item.qty } },
//         },
//       }));

//       await order.save({ session });
//       await Product.bulkWrite(restoreOps, { session });

//       await session.commitTransaction();
//       res.json(formatOrder(order));
//     } catch (txError) {
//       await session.abortTransaction();
//       res.status(500).json({ message: txError.message });
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // ─── PUT /api/orders/:id/status ───────────────────────────────────────────────
// // @desc    Admin updates order status
// //          Handles: Delivered flag, COD auto-pay, Cancelled stock restore
// // @access  Private/Admin
// router.put("/:id/status", protect, requireAuth('admin'), async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) {
//       return res.status(400).json({ message: "Invalid order ID format" });
//     }

//     const validStatuses = [
//       "Pending",
//       "Processing",
//       "Shipped",
//       "Delivered",
//       "Cancelled",
//     ];
//     if (!req.body.status || !validStatuses.includes(req.body.status)) {
//       return res.status(400).json({
//         message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
//       });
//     }

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // Prevent changing status on already-terminal orders
//     const terminalStatuses = ["Delivered", "Cancelled"];
//     if (terminalStatuses.includes(order.orderStatus)) {
//       return res.status(400).json({
//         message: `Cannot change status of a ${order.orderStatus} order`,
//       });
//     }

//     const newStatus = req.body.status;

//     // ── Transaction: status update + any side effects atomically ────────────
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       order.orderStatus = newStatus;

//       if (newStatus === "Delivered") {
//         order.isDelivered = true;
//         order.deliveredAt = Date.now();

//         // Auto-mark COD orders as paid on delivery
//         if (order.paymentMethod === "COD" && !order.isPaid) {
//           order.isPaid = true;
//           order.paidAt = Date.now();
//         }
//       }

//       if (newStatus === "Cancelled") {
//         order.cancelledBy = "admin";
//         order.cancelledAt = Date.now();
//         order.cancellationNote = req.body.note || "";

//         // Restore stock for all items
//         const restoreOps = order.orderItems.map((item) => ({
//           updateOne: {
//             filter: { _id: item.product },
//             update: { $inc: { stock: item.qty } },
//           },
//         }));

//         await Product.bulkWrite(restoreOps, { session });
//       }

//       const updatedOrder = await order.save({ session });
//       await session.commitTransaction();
//       res.json(formatOrder(updatedOrder));
//     } catch (txError) {
//       await session.abortTransaction();
//       res.status(500).json({ message: txError.message });
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// export default router;

// // /*
// //  * Handover note: Order API.
// //  * Creates orders for authenticated users, returns the user's own orders, and lets admins list/update statuses.
// //  */
// // import express from "express";
// // import Order from "../models/Order.js";
// // import Product from "../models/Product.js";
// // import { protect, requireAuth } from '../middleware/authMiddleware.js';

// // const router = express.Router();

// // // Extracts the last 6 characters of the Mongo ID
// // const getShortId = (objectId) => {
// //   return objectId.toString().substring(18, 24).toUpperCase();
// // };

// // // Formats the order object to include the short ID
// // const formatOrderResponse = (order) => {
// //   const orderObj = order.toObject ? order.toObject() : order;
// //   return {
// //     ...orderObj,
// //     shortId: getShortId(orderObj._id),
// //   };
// // };

// // // @desc    Create new order & Deduct Inventory
// // // @route   POST /api/orders
// // // @access  Private (Logged-in Users)
// // router.post("/", protect, async (req, res) => {
// //   try {
// //     const { orderItems, shippingAddress, paymentMethod } = req.body;

// //     if (!orderItems && orderItems.length === 0) {
// //       return res.status(400).json({ message: "No order items" });
// //     }

// //     // Fetch actual product data from DB
// //     const itemsFromDB = await Product.find({
// //       _id: { $in: orderItems.map((x) => x.product) },
// //     });

// //     // 1. INVENTORY CHECK: Check against the user's 'stock' field
// //     for (const clientItem of orderItems) {
// //       const dbProduct = itemsFromDB.find(p => p._id.toString() === clientItem.product);

// //       if (!dbProduct || dbProduct.stock < clientItem.qty) {
// //         return res.status(400).json({
// //           message: `Insufficient stock for product: ${dbProduct ? dbProduct.name : clientItem.product}`
// //         });
// //       }
// //     }

// //     // 2. PRICE CALCULATION: Respect the discountPrice
// //     const dbOrderItems = orderItems.map((itemFromClient) => {
// //       const matchingItemFromDB = itemsFromDB.find(
// //         (dbItem) => dbItem._id.toString() === itemFromClient.product,
// //       );

// //       // If a discount price exists and is greater than 0, use it. Otherwise, use the standard price.
// //       const actualPrice = (matchingItemFromDB.discountPrice && matchingItemFromDB.discountPrice > 0)
// //         ? matchingItemFromDB.discountPrice
// //         : matchingItemFromDB.price;

// //       return {
// //         ...itemFromClient,
// //         product: itemFromClient.product,
// //         price: actualPrice,
// //         _id: undefined, // Remove frontend ID to prevent DB conflicts
// //       };
// //     });

// //     // Calculate totals based on the correct prices
// //     const itemsPrice = dbOrderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
// //     const shippingPrice = itemsPrice > 100 ? 0 : 10;
// //     const taxPrice = 0.15 * itemsPrice;
// //     const totalPrice = itemsPrice + shippingPrice + taxPrice;

// //     // Create the order
// //     const order = new Order({
// //       user: req.user._id,
// //       orderItems: dbOrderItems,
// //       shippingAddress,
// //       paymentMethod,
// //       itemsPrice,
// //       taxPrice,
// //       shippingPrice,
// //       totalPrice,
// //     });

// //     const createdOrder = await order.save();

// //     // 3. INVENTORY DEDUCTION: Update 'stock' using bulkWrite for performance
// //     const bulkOperations = dbOrderItems.map((item) => ({
// //       updateOne: {
// //         filter: { _id: item.product },
// //         update: { $inc: { stock: -item.qty } } // Deducts the exact quantity purchased
// //       }
// //     }));
// //     await Product.bulkWrite(bulkOperations);

// //     res.status(201).json(formatOrderResponse(createdOrder));
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });

// // // @desc    Get logged in user orders with Pagination
// // // @route   GET /api/orders/myorders
// // // @access  Private
// // router.get("/myorders", protect, async (req, res) => {
// //   try {
// //     // PAGINATION SETUP
// //     const pageSize = 10; // Number of orders per page
// //     const page = Number(req.query.pageNumber) || 1;

// //     const count = await Order.countDocuments({ user: req.user._id });

// //     // .skip() jumps over the previous pages' items
// //     const orders = await Order.find({ user: req.user._id })
// //       .sort({ createdAt: -1 })
// //       .limit(pageSize)
// //       .skip(pageSize * (page - 1));

// //     const formattedOrders = orders.map(formatOrderResponse);

// //     // Return orders alongside the pagination metadata for React
// //     res.json({
// //       orders: formattedOrders,
// //       page,
// //       pages: Math.ceil(count / pageSize),
// //       totalOrders: count,
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });

// // // @desc    Get order by ID
// // // @route   GET /api/orders/:id
// // // @access  Private
// // router.get("/:id", protect, async (req, res) => {
// //   try {
// //     const order = await Order.findById(req.params.id).populate(
// //       "user",
// //       "name email",
// //     );

// //     if (!order) {
// //       return res.status(404).json({ message: "Order not found" });
// //     }

// //     if (
// //       order.user._id.toString() !== req.user._id.toString() &&
// //       !req.user.isAdmin
// //     ) {
// //       return res
// //         .status(401)
// //         .json({ message: "Not authorized to view this order" });
// //     }

// //     res.json(formatOrderResponse(order));
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });

// // // @desc    Get all orders with Pagination
// // // @route   GET /api/orders
// // // @access  Private/Admin
// // router.get("/", protect, requireAuth('admin'), async (req, res) => {
// //   try {
// //     // PAGINATION SETUP
// //     const pageSize = 20; // Admins usually want to see more items per page
// //     const page = Number(req.query.pageNumber) || 1;

// //     const count = await Order.countDocuments({});

// //     const orders = await Order.find({})
// //       .populate("user", "id name")
// //       .sort({ createdAt: -1 })
// //       .limit(pageSize)
// //       .skip(pageSize * (page - 1));

// //     const formattedOrders = orders.map(formatOrderResponse);

// //     res.json({
// //       orders: formattedOrders,
// //       page,
// //       pages: Math.ceil(count / pageSize),
// //       totalOrders: count,
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });

// // // @desc    Update order status
// // // @route   PUT /api/orders/:id/status
// // // @access  Private/Admin
// // router.put("/:id/status", protect, requireAuth('admin'), async (req, res) => {
// //   try {
// //     const order = await Order.findById(req.params.id);

// //     if (order) {
// //       order.orderStatus = req.body.status || order.orderStatus;

// //       if (req.body.status === "Delivered") {
// //         order.isDelivered = true;
// //         order.deliveredAt = Date.now();
// //       }

// //       const updatedOrder = await order.save();
// //       res.json(formatOrderResponse(updatedOrder));
// //     } else {
// //       res.status(404).json({ message: "Order not found" });
// //     }
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });

// // export default router;
