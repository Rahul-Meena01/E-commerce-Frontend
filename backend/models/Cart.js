/*
 * Handover note: Shopping cart schema.
 * Cart routes store one cart per user, each with product/variant lines, optional coupon data,
 * and cached totals calculated after every cart mutation.
 */
// const mongoose = require("mongoose");

// const cartSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     items: [
//       {
//         product: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Products",
//           required: true,
//         },
//         quantity: {
//           type: Number,
//           default: 1,
//           min: 1,
//         },
//       },
//     ],
//     coupon: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Coupon",
//       default: null,
//     },
//   },
//   { timestamps: true },
// );

// module.exports = mongoose.model("Cart", cartSchema);

// const mongoose = require("mongoose");
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "items.productModel",
      required: true,
    },
    productModel: {
      type: String,
      enum: ["Product", "VendorProduct"],
      default: "Product",
    },

    name: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
    },

    size: { type: String },
    color: { type: String },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variants",
    },

    image: {
      type: String,
    },

    sku: {
      type: String,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    price: {
      type: Number,
      required: true,
    },

    salePrice: {
      type: Number,
      default: 0,
    },

    finalPrice: {
      type: Number,
      required: true,
    },

    stock: {
      type: Number,
      default: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    giftCardDiscount: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    shipping: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    totalItems: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: [cartItemSchema],

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    couponCode: {
      type: String,
      default: null,
    },

    giftCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GiftCard",
      default: null,
    },

    giftCardCode: {
      type: String,
      default: null,
    },

    totals: totalsSchema,

    notes: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// module.exports = mongoose.model("Cart", cartSchema);
const Cart = mongoose.model("Cart", cartSchema);
export default Cart;