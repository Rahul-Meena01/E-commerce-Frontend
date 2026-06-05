/*
 * Handover note: Coupon definition schema.
 * Admin coupon routes manage discount rules, product/category targeting, date windows,
 * usage limits, and active/inactive status for checkout promotion logic.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    // Coupon Code
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Coupon Type
    // cart -> applies on whole cart
    // product -> applies on selected products
    type: {
      type: String,
      enum: ["cart", "product"],
      default: "cart",
    },

    // Discount Type
    // percentage -> 10%
    // fixed -> ₹500 OFF
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    // Discount Value
    // percentage => 10
    // fixed => 500
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },

    // Minimum order amount required
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Maximum discount allowed
    // useful for percentage coupons
    // Example:
    // 50% OFF upto ₹1000
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Product specific coupons
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
      },
    ],

    // Coupon usage limit
    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // How many times used
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Active / inactive
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Expiry
    expiryDate: {
      type: Date,
      required: true,
    },

    // Optional Description
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Optional Banner
    bannerImage: {
      type: String,
      default: "",
    },

    // For future frontend display
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

//
// INDEXES
//
couponSchema.index({ code: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ expiryDate: 1 });

//
// VIRTUALS
//
couponSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

//
// METHODS
//
couponSchema.methods.isValidCoupon = function () {
  return (
    this.status === "active" &&
    this.expiryDate > new Date() &&
    (this.usageLimit === 0 || this.usedCount < this.usageLimit)
  );
};

// module.exports = mongoose.model("Coupon", couponSchema);
const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;

