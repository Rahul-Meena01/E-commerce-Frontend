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
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },

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

    adminStatusOverride: {
      type: String,
      enum: ["Hot", "Cold", "Deactive", ""],
      default: "",
    },

    address: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

UserSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

export default mongoose.model("User", UserSchema);


// /*
//  * Handover note: User/admin account schema.
//  * Auth routes create and read these documents; role controls whether the frontend
//  * sends the person to the admin dashboard or the user shopping experience.
//  */
// // const mongoose = require("mongoose");
// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     password: {
//       type: String,
//       required: true,
//     },

//     phone: {
//       type: String,
//       default: "",
//     },

//     profileImage: {
//       type: String,
//       default: "",
//     },

//     role: {
//       type: String,
//       enum: ["admin", "user"],
//       default: "user",
//       required: true,
//     },
//   },
//   { timestamps: true },
// );

// // module.exports = mongoose.model("User", UserSchema);
// const User = mongoose.model("User", UserSchema);
// export default User;
