/*
 * models/vendor/VendorCoupon.js
 *
 * This is the Coupon schema for VENDORS only.
 * Each vendor can create their own coupon codes.
 * A coupon always belongs to ONE vendor.
 *
 * Example:
 *   Vendor "Nike Store" creates coupon "NIKE20" → 20% off
 *   Only applies to products from Nike Store.
 */

import mongoose from "mongoose";

const VendorCouponSchema = new mongoose.Schema(
  {
    // ── Who owns this coupon? ─────────────────────────────────────────────────
    // Every coupon must belong to a vendor.
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    // ── The coupon code customers enter at checkout ────────────────────────────
    // e.g. "NIKE20", "SUMMER50"
    // Stored in UPPERCASE always (enforced via `uppercase: true`).
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // ── Type of discount ──────────────────────────────────────────────────────
    // "flat"    → fixed amount off   e.g. ₹100 off
    // "percent" → percentage off     e.g. 20% off
    discountType: {
      type: String,
      enum: ["flat", "percent"],
      required: true,
    },

    // ── How much discount? ────────────────────────────────────────────────────
    // For "flat"    → value is in currency (e.g. 100 means ₹100 off)
    // For "percent" → value is percentage  (e.g. 20 means 20% off)
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Minimum order value to apply this coupon ──────────────────────────────
    // e.g. 500 means coupon only works if cart total is ₹500 or more.
    // 0 = no minimum required.
    minOrderValue: {
      type: Number,
      default: 0,
    },

    // ── Maximum number of times this coupon can be used (across all customers) ─
    // null = unlimited uses allowed.
    maxUses: {
      type: Number,
      default: null,
    },

    // ── How many times has this coupon been used so far? ─────────────────────
    // Incremented every time a customer successfully applies this coupon.
    usedCount: {
      type: Number,
      default: 0,
    },

    // ── When does this coupon expire? ─────────────────────────────────────────
    // null = never expires.
    expiresAt: {
      type: Date,
      default: null,
    },

    // ── Is this coupon currently active? ─────────────────────────────────────
    // Vendor can disable without deleting.
    isActive: {
      type: Boolean,
      default: true,
    },
  },

  // Adds `createdAt` and `updatedAt` automatically.
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Coupon code must be unique per vendor.
// e.g. Vendor A and Vendor B can both have "SAVE10" — no conflict.
VendorCouponSchema.index({ vendor: 1, code: 1 }, { unique: true });

// ── Export ────────────────────────────────────────────────────────────────────
export default mongoose.model("VendorCoupon", VendorCouponSchema);
