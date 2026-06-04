import mongoose from "mongoose";

// ─── Sub-schema for individual order items ────────────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    image: { type: String, required: true },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Products", // use "Products" since parent model uses "Products"
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variants",
      default: null,
    },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
  },
  { _id: false }, // sub-docs don't need their own _id
);

// ─── Main Order Schema ────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    // 1. The user who placed the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    // 2. The items purchased
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Order must contain at least one item",
      },
    },

    // 3. Delivery information
    shippingAddress: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },

    // 4. Payment details
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ["Stripe", "Razorpay", "PayPal", "COD"],
      default: null,
    },
    paymentSessionId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    paymentIntentId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    shippingMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    paymentResult: {
      // Filled in by PUT /api/orders/:id/pay after gateway callback
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },

    // 5. Price breakdown
    itemsPrice: { type: Number, required: true, default: 0.0 },
    discountPrice: { type: Number, required: true, default: 0.0 },
    couponCode: { type: String, default: null },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // 6. Order Status & Tracking
    orderStatus: {
      type: String,
      required: true,
      enum: {
        values: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
        message: "{VALUE} is not a valid order status",
      },
      default: "Pending",
    },

    // Payment flags
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

    // Delivery flags
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },

    // 7. Cancellation details
    cancelledBy: { type: String, enum: ["user", "admin"] }, // who cancelled
    cancellationNote: { type: String, trim: true }, // optional reason
    cancelledAt: { type: Date },
  },
  {
    timestamps: true, // auto adds createdAt + updatedAt
  },
);

// ─── Indexes for common query patterns ───────────────────────────────────────
// Speeds up "my orders" list and admin dashboard queries significantly
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Performance indexes — added in modernization v1.0
orderSchema.index({ orderStatus: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;

