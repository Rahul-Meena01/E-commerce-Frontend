/*
 * Handover note: Product variant schema.
 * Variant routes store alternate sizes/colors/SKUs/images against a parent product,
 * so inventory and presentation can vary without duplicating the base product.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema(
  {
    parentProduct: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Products",
    },

    image: {
      type: String,
      default: null,
    },

    image1: {
      type: String,
      default: null,
    },

    image2: {
      type: String,
      default: null,
    },

    image3: {
      type: String,
      default: null,
    },

    image4: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    discountPrice: {
      type: Number,
    },

    discountPercent: {
      type: Number,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      required: true,
      trim: true,
    },

    colorHex: {
      type: String,
      default: "#000000",
      trim: true,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

VariantSchema.index({ parentProduct: 1, status: 1 });

// Performance indexes — added in modernization v1.0
VariantSchema.index({ parentProduct: 1, color: 1, size: 1 });

// module.exports = mongoose.model("Variants", VariantSchema);
const Variant = mongoose.model("Variants", VariantSchema);
export default Variant;
