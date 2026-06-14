import mongoose from "mongoose";

const VendorCategorySchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    image: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

VendorCategorySchema.index({ vendor: 1, slug: 1 }, { unique: true }); // slug unique per vendor

export default mongoose.model("VendorCategory", VendorCategorySchema);
