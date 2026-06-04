/*
 * controllers/vendor/vendorCouponController.js
 *
 * Handles CRUD operations for a vendor's own coupon codes.
 * Each vendor manages their own coupons — completely isolated from admin coupons
 * and other vendors' coupons.
 *
 * Every function runs AFTER the full middleware chain:
 *   protect → authorizeRoles("vendor") → attachVendorContext → validateOwnership
 *
 * So by the time we get here:
 *   - req.vendor   = full Vendor document
 *   - req.vendorId = vendor's _id
 */

import VendorCoupon from "../../models/vendor/vendorCoupon.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/coupons
// @desc    Get ALL coupons for this vendor
//          Optional filter: ?isActive=true/false
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getCoupons = async (req, res) => {
  try {
    // Always scope to this vendor's coupons only
    const filter = { vendor: req.vendorId };

    // ── Optional: filter by active status ────────────────────────────────────
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true"; // convert string to boolean
    }

    const coupons = await VendorCoupon.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    console.error("getCoupons error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/coupons/:id
// @desc    Get a single coupon by ID (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getCouponById = async (req, res) => {
  try {
    // Find by BOTH _id AND vendor — prevents cross-vendor data access
    const coupon = await VendorCoupon.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    console.error("getCouponById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/coupons
// @desc    Create a new coupon for this vendor
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      expiresAt,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!code?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code is required" });
    }

    if (!discountType || !["flat", "percent"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be 'flat' or 'percent'",
      });
    }

    if (discountValue === undefined || discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid discount value is required",
      });
    }

    // ── Extra validation for percent type ────────────────────────────────────
    // A percentage discount above 100 doesn't make sense
    if (discountType === "percent" && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    // ── Normalize the code to uppercase ───────────────────────────────────────
    // e.g. "nike20" → "NIKE20"
    // The schema also has `uppercase: true` but we normalize here for the duplicate check below.
    const normalizedCode = code.trim().toUpperCase();

    // ── Check for duplicate code under this vendor ────────────────────────────
    // Two different vendors can both have "SAVE10" — that's fine.
    // But the same vendor can't have two "SAVE10" coupons.
    const existing = await VendorCoupon.findOne({
      vendor: req.vendorId,
      code: normalizedCode,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a coupon with this code",
      });
    }

    // ── Create the coupon ─────────────────────────────────────────────────────
    const coupon = await VendorCoupon.create({
      vendor: req.vendorId, // always from token — never from body
      code: normalizedCode,
      discountType,
      discountValue,
      minOrderValue: minOrderValue ?? 0, // default 0 = no minimum
      maxUses: maxUses ?? null, // default null = unlimited
      expiresAt: expiresAt ?? null, // default null = never expires
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }
    console.error("createCoupon error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/vendor/:vendorSlug/coupons/:id
// @desc    Update a coupon (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateCoupon = async (req, res) => {
  try {
    // ── Find and verify ownership ─────────────────────────────────────────────
    const coupon = await VendorCoupon.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      expiresAt,
      isActive,
    } = req.body;

    // ── Update code if provided ───────────────────────────────────────────────
    if (code && code.trim().toUpperCase() !== coupon.code) {
      const normalizedCode = code.trim().toUpperCase();

      // Make sure the new code isn't already used by another of this vendor's coupons
      const conflict = await VendorCoupon.findOne({
        vendor: req.vendorId,
        code: normalizedCode,
        _id: { $ne: coupon._id }, // exclude current document from check
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "You already have a coupon with this code",
        });
      }

      coupon.code = normalizedCode;
    }

    // ── Validate and update discountType if provided ──────────────────────────
    if (discountType !== undefined) {
      if (!["flat", "percent"].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: "Discount type must be 'flat' or 'percent'",
        });
      }
      coupon.discountType = discountType;
    }

    // ── Validate and update discountValue if provided ─────────────────────────
    if (discountValue !== undefined) {
      const typeToCheck = discountType || coupon.discountType;
      if (typeToCheck === "percent" && discountValue > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount cannot exceed 100%",
        });
      }
      coupon.discountValue = discountValue;
    }

    // ── Update remaining fields if provided ───────────────────────────────────
    if (minOrderValue !== undefined) coupon.minOrderValue = minOrderValue;
    if (maxUses !== undefined) coupon.maxUses = maxUses;
    if (expiresAt !== undefined) coupon.expiresAt = expiresAt;
    if (isActive !== undefined) coupon.isActive = isActive;

    const updated = await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }
    console.error("updateCoupon error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/vendor/:vendorSlug/coupons/:id
// @desc    Delete a coupon (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCoupon = async (req, res) => {
  try {
    // ── Find and verify ownership in one query ────────────────────────────────
    const coupon = await VendorCoupon.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    await coupon.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("deleteCoupon error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
