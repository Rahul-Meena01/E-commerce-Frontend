/*
 * Handover note: Product catalog schema.
 * Admin product routes create/update these records with images, category links, stock,
 * pricing, and status; public product endpoints read active records for shoppers.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "SubCategory",
    },
    image: {
      type: String,
      default: null, // Main Hero Image
    },
    image1: {
      type: String,
      default: null, // Carousel 1
    },
    image2: {
      type: String,
      default: null, // Carousel 2
    },
    image3: {
      type: String,
      default: null, // Carousel 3
    },
    image4: {
      type: String,
      default: null, // Carousel 4
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
    stock:{
      type: Number,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

ProductSchema.index({ name: 'text', brand: 'text' });
ProductSchema.index({ subCategory: 1 });
ProductSchema.index({ status: 1, isDeleted: 1 });

// module.exports = mongoose.model("Products", ProductSchema);
const Product = mongoose.model("Products", ProductSchema);
export default Product;
