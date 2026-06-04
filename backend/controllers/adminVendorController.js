/*
 * controllers/admin/adminVendorController.js
 *
 * Gives the admin full control over vendor accounts.
 * Admin can list all vendors, view details, approve/suspend them,
 * adjust commission rates, and delete vendor accounts entirely.
 *
 * Every function here runs AFTER:
 *   protect → authorizeRoles("admin")
 *
 * So req.user is always the verified admin user.
 * There is NO vendorGuard here — admin can access any vendor without slug checks.
 */

import mongoose from "mongoose";
import Vendor from "../models/VendorSchema.js";
import User from "../models/User.js";
import VendorProduct from "../models/vendor/vendorProduct.js";
import VendorCategory from "../models/vendor/vendorCategory.js";
import VendorSubCategory from "../models/vendor/vendorSubCategory.js";
import VendorCoupon from "../models/vendor/vendorCoupon.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/vendors
// @desc    Get ALL vendors with optional filtering and pagination
//          Query params:
//            ?status=pending|active|suspended  → filter by status
//            ?page=1                           → page number (default 1)
//            ?limit=10                         → results per page (default 10)
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllVendors = async (req, res) => {
  try {
    // ── Build filter object ───────────────────────────────────────────────────
    // Start with empty filter (returns all vendors).
    // Admin can optionally filter by status via query param.
    const filter = {};
    if (req.query.status) {
      // Only apply if a valid status is passed — prevents invalid DB queries
      const validStatuses = ["pending", "active", "suspended"];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    // ── Pagination ────────────────────────────────────────────────────────────
    // page  → which page of results (1-indexed)
    // limit → how many results per page
    // skip  → how many documents to skip = (page - 1) * limit
    // e.g. page=2, limit=10 → skip=10 (skip the first 10, return the next 10)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // ── Fetch vendors + total count in parallel ───────────────────────────────
    // Promise.all runs both DB queries at the same time instead of sequentially.
    // This is faster — no waiting for one to finish before starting the other.
    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .populate("user", "name email phone createdAt") // attach user info (name, email etc.)
        .sort({ createdAt: -1 }) // newest vendors first
        .skip(skip)
        .limit(limit),
      Vendor.countDocuments(filter), // total count for frontend pagination
    ]);

    return res.status(200).json({
      success: true,
      total, // total number of matching vendors
      page, // current page
      totalPages: Math.ceil(total / limit),
      count: vendors.length, // vendors returned in this page
      data: vendors,
    });
  } catch (error) {
    console.error("getAllVendors error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/vendors/:id
// @desc    Get a single vendor's full details by their Vendor document _id
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getVendorById = async (req, res) => {
  try {
    const [vendor, products, categories, subCategories, coupons] = await Promise.all([
      Vendor.findById(req.params.id).populate("user", "name email phone createdAt adminStatusOverride"),
      VendorProduct.find({ vendor: req.params.id }).populate("category", "name").populate("subCategory", "name"),
      VendorCategory.find({ vendor: req.params.id }),
      VendorSubCategory.find({ vendor: req.params.id }).populate("category", "name"),
      VendorCoupon.find({ vendor: req.params.id })
    ]);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    return res.status(200).json({ 
      success: true, 
      data: {
        ...vendor.toObject(),
        products,
        categories,
        subCategories,
        coupons
      } 
    });
  } catch (error) {
    console.error("getVendorById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/admin/vendors/:id/status
// @desc    Approve or suspend a vendor account
//          Body: { status: "active" | "suspended" }
//
//          "active"    → vendor can now log in and use their dashboard
//          "suspended" → vendor is immediately locked out of all vendor routes
//
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // ── Validate the status value ─────────────────────────────────────────────
    // Admin can only set "active" or "suspended" via this route.
    // "pending" is the initial state set on registration — admin never sets it manually.
    if (!status || !["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'suspended'",
      });
    }

    // ── Find and update the vendor ────────────────────────────────────────────
    // { new: true } → returns the updated document instead of the old one
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).populate("user", "name email");

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Vendor account ${status === "active" ? "approved" : "suspended"} successfully`,
      data: vendor,
    });
  } catch (error) {
    console.error("updateVendorStatus error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/admin/vendors/:id/commission
// @desc    Set a custom commission rate for a specific vendor
//          Body: { commissionRate: number } (0–100, represents percentage)
//
//          e.g. commissionRate: 15 means the platform takes 15% of each sale
//
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateVendorCommission = async (req, res) => {
  try {
    const { commissionRate } = req.body;

    // ── Validate commission rate ──────────────────────────────────────────────
    // Must be a number between 0 and 100.
    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({
        success: false,
        message: "commissionRate is required",
      });
    }

    if (
      typeof commissionRate !== "number" ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "commissionRate must be a number between 0 and 100",
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { commissionRate },
      { new: true },
    ).populate("user", "name email");

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Commission rate updated to ${commissionRate}%`,
      data: vendor,
    });
  } catch (error) {
    console.error("updateVendorCommission error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/admin/vendors/:id
// @desc    Permanently delete a vendor account and their linked User document
//
//          This uses a MongoDB transaction to ensure BOTH the Vendor document
//          AND the User document are deleted together.
//          If either deletion fails, both are rolled back — no orphaned data.
//
//          NOTE: This does NOT delete the vendor's products, categories, coupons.
//          You may want to add that cleanup here in the future.
//
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteVendor = async (req, res) => {
  // Start a MongoDB session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── Find the vendor first to get the linked user ID ───────────────────────
    const vendor = await Vendor.findById(req.params.id).session(session);

    if (!vendor) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // ── Delete the Vendor document ────────────────────────────────────────────
    await Vendor.findByIdAndDelete(vendor._id, { session });

    // ── Delete the linked User document ──────────────────────────────────────
    // vendor.user is the ObjectId of the User that owns this vendor profile.
    await User.findByIdAndDelete(vendor.user, { session });

    // ── Both deletions succeeded — commit the transaction ─────────────────────
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Vendor and associated user account deleted successfully",
    });
  } catch (error) {
    // Something failed — roll back both deletions so we don't end up
    // with a Vendor but no User, or a User with a dangling vendorProfile ref.
    await session.abortTransaction();
    console.error("deleteVendor error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  } finally {
    // Always end the session whether the transaction succeeded or failed
    session.endSession();
  }
};
