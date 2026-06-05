import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    // The User document that owns this vendor profile.
    // This is the authoritative link — never store auth data here.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one vendor profile per user account
    },

    shopName: { type: String, required: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    banner: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "active",
      // Admin approves → "active", can suspend → "suspended"
    },

    commissionRate: {
      type: Number,
      default: 10, // platform's % cut — set per-vendor by admin
      min: 0,
      max: 100,
    },

    address: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },

    // Social / contact (separate from User.phone — this is business contact)
    businessPhone: { type: String, default: "" },
    businessEmail: { type: String, default: "" },
    websiteUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

VendorSchema.index({ slug: 1 });
VendorSchema.index({ user: 1 });
VendorSchema.index({ status: 1 });

export default mongoose.model("Vendor", VendorSchema);
