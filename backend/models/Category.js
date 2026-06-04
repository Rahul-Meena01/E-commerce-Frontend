/*
 * Handover note: Top-level product category schema.
 * Admin category screens manage this collection; product and subcategory records
 * reference category ids to build the catalog hierarchy.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true },
);

// module.exports = mongoose.model("Category", categorySchema);
const Category = mongoose.model("Category", categorySchema);
export default Category;
