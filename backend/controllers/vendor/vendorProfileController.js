/*
 * controllers/vendor/vendorProfileController.js
 *
 * Handles everything related to a vendor's OWN shop profile.
 * (shop name, description, logo, banner, contact info, etc.)
 *
 * IMPORTANT: By the time any function here runs, the middleware chain has already:
 *   1. Verified the JWT token (protect)
 *   2. Confirmed the user has role "vendor" (authorizeRoles)
 *   3. Attached the vendor document to req.vendor (attachVendorContext)
 *   4. Confirmed the :vendorSlug in the URL matches the logged-in vendor (validateOwnership)
 *
 * So inside these controllers, req.vendor is ALWAYS the correct, verified vendor.
 * We never need to re-query or re-verify ownership here.
 */

import Vendor from "../../models/VendorSchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/me
// @desc    Get the logged-in vendor's own shop profile
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    // req.vendor is already attached by vendorMiddleware — no DB call needed here.
    // We just send it back to the frontend.
    return res.status(200).json({
      success: true,
      data: req.vendor,
    });
  } catch (error) {
    console.error("getMyProfile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/vendor/:vendorSlug/me
// @desc    Update the logged-in vendor's shop profile
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateMyProfile = async (req, res) => {
  try {
    // ── Whitelist of fields a vendor is ALLOWED to update ────────────────────
    // We never trust raw req.body directly — someone could send { status: "active" }
    // or { commissionRate: 0 } and accidentally (or maliciously) change restricted fields.
    // Only fields in this array will be applied.
    const allowedFields = [
      "shopName",
      "description",
      "logo",
      "banner",
      "address",
      "city",
      "pincode",
      "businessPhone",
      "businessEmail",
      "websiteUrl",
    ];

    // ── Apply only the allowed fields from the request body ───────────────────
    // For each allowed field, if the vendor sent it in the body, update it on the document.
    // If a field is missing from the body, we leave the existing value untouched.
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        req.vendor[field] = req.body[field];
      }
    });

    // ── Save the updated vendor document to the database ─────────────────────
    const updatedVendor = await req.vendor.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("updateMyProfile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
