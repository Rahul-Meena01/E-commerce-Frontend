import mongoose from "mongoose";

const VendorSubCategorySchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorCategory",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

VendorSubCategorySchema.index({ vendor: 1, slug: 1 }, { unique: true });

export default mongoose.model("VendorSubCategory", VendorSubCategorySchema);
