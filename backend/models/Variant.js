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

// module.exports = mongoose.model("Variants", VariantSchema);
const Variant = mongoose.model("Variants", VariantSchema);
export default Variant;
