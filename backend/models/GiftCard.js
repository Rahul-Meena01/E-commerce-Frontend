/*
 * Handover note: Gift card schema.
 * Admin gift card routes manage purchasable/issuable gift card records with code, value,
 * balance, validity, recipient data, and status.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const giftCardSchema = new mongoose.Schema(
  {
    receiverName: {
      type: String,
      required: true,
      trim: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    giftCardValue: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },

    balance: {
      type: Number,
      default: function () {
        return this.giftCardValue;
      },
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "expired", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

//
// INDEXES
//
giftCardSchema.index({ status: 1 });
giftCardSchema.index({ expiryDate: 1 });

//
// VIRTUALS
//
giftCardSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

//
// METHODS
//
giftCardSchema.methods.isValidGiftCard = function () {
  return (
    this.status === "active" &&
    this.expiryDate > new Date() &&
    this.balance > 0
  );
};

// module.exports = mongoose.model("GiftCard", giftCardSchema);
const GiftCard = mongoose.model("GiftCard", giftCardSchema);
export default GiftCard;