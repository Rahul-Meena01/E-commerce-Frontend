import mongoose from "mongoose";

const VendorProductSchema = new mongoose.Schema(
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
      default: null,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSubCategory",
      default: null,
    },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null },
    stock: { type: Number, default: 0, min: 0 },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
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

VendorProductSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});



VendorProductSchema.index({ vendor: 1, slug: 1 }, { unique: true });

export default mongoose.models.VendorProduct || mongoose.model("VendorProduct", VendorProductSchema);
// End Of Code
