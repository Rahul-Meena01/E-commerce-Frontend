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
    image: { type: String, default: "" },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "productModel",
    },
    productModel: {
      type: String,
      enum: ["Product", "VendorProduct"],
      default: "Product",
    },
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
    paymentResult: {
      // Filled in by PUT /api/orders/:id/pay after gateway callback
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },

    // 5. Price breakdown
    itemsPrice: { type: Number, required: true, default: 0.0 },
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

    // Razorpay specific fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
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

const Order = mongoose.model("Order", orderSchema);

export default Order;

// /*
//  * Handover note: Order schema.
//  * Checkout creates order documents from cart/product data; admin order routes read and update
//  * payment/order status while user routes expose a customer's own order history.
//  */
// import mongoose from "mongoose";

// const orderSchema = mongoose.Schema(
//   {
//     // 1. The user who placed the order
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: "User", // References your User model
//     },

//     // 2. The items purchased
//     orderItems: [
//       {
//         name: { type: String, required: true },
//         qty: { type: Number, required: true },
//         // image: { type: String, required: true },
//         price: { type: Number, required: true },
//         product: {
//           type: mongoose.Schema.Types.ObjectId,
//           required: true,
//           ref: "Product", // References your Product model
//         },
//       },
//     ],

//     // 3. Delivery information
//     shippingAddress: {
//       address: { type: String, required: true },
//       city: { type: String, required: true },
//       postalCode: { type: String, required: true },
//       country: { type: String, required: true },
//     },

//     // 4. Payment details
//     paymentMethod: {
//       type: String,
//       required: true,
//       // e.g., 'Stripe', 'PayPal', 'Razorpay', 'COD'
//     },
//     paymentResult: {
//       // This holds the response payload from your payment gateway
//       id: { type: String },
//       status: { type: String },
//       update_time: { type: String },
//       email_address: { type: String },
//     },

//     // 5. Price breakdown
//     itemsPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     taxPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     shippingPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     totalPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },

//     // 6. Order Tracking & Status
//     orderStatus: {
//       type: String,
//       required: true,
//       enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
//       default: "Pending",
//     },
//     isPaid: {
//       type: Boolean,
//       required: true,
//       default: false,
//     },
//     paidAt: {
//       type: Date,
//     },
//     isDelivered: {
//       type: Boolean,
//       required: true,
//       default: false,
//     },
//     deliveredAt: {
//       type: Date,
//     },
//   },
//   {
//     // Automatically adds 'createdAt' and 'updatedAt' fields
//     timestamps: true,
//   },
// );

// const Order = mongoose.model("Order", orderSchema);

// export default Order;
