/*
 * Handover note: Subcategory schema.
 * Each subcategory belongs to one Category and is used by products for finer catalog filtering.
 */
// const mongoose = require("mongoose");
import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
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
    image: {
      type: String,
      default: null,
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

// module.exports = mongoose.model("SubCategory", subCategorySchema);
const SubCategory = mongoose.model("SubCategory", subCategorySchema);
export default SubCategory;