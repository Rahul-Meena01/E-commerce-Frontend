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

// module.exports = mongoose.model("GiftCard", giftCardSchema);
const GiftCard = mongoose.model("GiftCard", giftCardSchema);
export default GiftCard;