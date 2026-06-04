/*
 * models/User.js
 *
 * Changes from original:
 *  1. Added `adminStatusOverride` — lets admin manually pin Hot/Cold/Deactive
 *     (overrides the auto-derived status from order history).
 *  2. Added `address`, `city`, `pincode` — shown in the User Profile panel.
 *  3. Everything else is identical to your original schema.
 *
 * NOTE: `role` stays as "admin" | "user" — authMiddleware uses this.
 *       `isAdmin` is NOT used; admin check is always `user.role === "admin"`.
 */

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "user", "vendor"],
      default: "user",
      required: true,
    },

    // Links a vendor-role user to their Vendor profile document.
    // null for admin and regular users.
    vendorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    // ── NEW: Admin can manually pin a status tag ────────────────────────────
    // When set, this overrides the auto-derived Hot / Cold / Deactive label.
    // Set to null / "" to go back to auto-derived behaviour.
    adminStatusOverride: {
      type: String,
      enum: ["Hot", "Cold", "Deactive", ""],
      default: "",
    },

    // ── NEW: Optional address fields (populated from checkout / profile) ────
    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    // ── Addresses array for multiple saved delivery addresses ─────────────
    addresses: [
      {
        title: { type: String, default: "" },
        address: { type: String, default: "" },
        city: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        country: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
      },
    ],

    location: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);
export default User;
