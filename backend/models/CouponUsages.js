/*
 * Handover note: Coupon usage audit schema.
 * Coupon/cart routes write these records when a coupon is applied, released, or confirmed,
 * allowing per-user limits and admin usage history to be enforced and reviewed.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

/**
 * CouponUsage Model
 *
 * Tracks every time a user applies a coupon at checkout.
 * Used for:
 *   - Preventing duplicate usage per user
 *   - Admin analytics (who used which coupon, when, and on which product)
 */
const couponUsageSchema = new mongoose.Schema(
  {
    // Which coupon was used
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },

    // Coupon code snapshot (for quick display without populate)
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // Who used it
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The order this coupon was applied to (set after order is placed)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // Product this coupon was applied on (only for type=product coupons)
    // null for cart-type coupons
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      default: null,
    },

    // Discount amount actually saved by the user (in ₹)
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Snapshot of discount type at time of use
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    // Snapshot of discount value at time of use
    discountValue: {
      type: Number,
      required: true,
    },

    // Current status of this usage record
    // "applied"  -> coupon applied at checkout, order not yet placed
    // "confirmed" -> order placed successfully
    // "cancelled" -> order was cancelled / coupon released
    status: {
      type: String,
      enum: ["applied", "confirmed", "cancelled"],
      default: "applied",
    },

    // Cart value at time of coupon application
    cartTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt = when coupon was applied
  },
);

//
// INDEXES
//
// Fast lookup: did this user already use this coupon?
couponUsageSchema.index({ coupon: 1, user: 1 }, { unique: true });

// Admin queries: all usages for a coupon
couponUsageSchema.index({ coupon: 1 });

// Admin queries: all coupons used by a user
couponUsageSchema.index({ user: 1 });

// Filter by status
couponUsageSchema.index({ status: 1 });

const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
export default CouponUsage;