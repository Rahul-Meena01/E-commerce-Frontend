/*
 * routes/vendor/vendorCouponRoutes.js
 *
 * Handles all CRUD routes for a vendor's own coupon codes.
 * Each vendor manages their own coupons, completely isolated from admin coupons.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   GET    /api/vendor/:vendorSlug/coupons         → get all (optional ?isActive=true)
 *   GET    /api/vendor/:vendorSlug/coupons/:id     → get single coupon
 *   POST   /api/vendor/:vendorSlug/coupons         → create new coupon
 *   PUT    /api/vendor/:vendorSlug/coupons/:id     → update a coupon
 *   DELETE /api/vendor/:vendorSlug/coupons/:id     → delete a coupon
 *
 * ─── Middleware chain on every request ───────────────────────────────────────
 *   protect            → verifies JWT token, adds req.user
 *   requireAuth     → confirms user role is "vendor"
 *   ...vendorGuard     → attachVendorContext + validateOwnership
 *   controller         → runs the actual logic
 */

import express from "express";

import { protect, requireAuth } from "../../middleware/authMiddleware.js";
import { vendorGuard } from "../../middleware/vendor/vendorMiddleware.js";
import {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../controllers/vendor/vendorCouponController.js";

// mergeParams: true → allows :vendorSlug from the parent app.js mount
// to be accessible inside this router and all middleware that reads it.
const router = express.Router({ mergeParams: true });

// Full auth + vendor security guard composed into one reusable array.
const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/vendor/:vendorSlug/coupons
// Returns all coupons for this vendor.
// Optional filter: ?isActive=true or ?isActive=false
router.get("/", auth, getCoupons);

// GET /api/vendor/:vendorSlug/coupons/:id
// Returns a single coupon by its MongoDB _id (must belong to this vendor).
router.get("/:id", auth, getCouponById);

// POST /api/vendor/:vendorSlug/coupons
// Creates a new coupon for this vendor.
// Body: { code, discountType: "flat"|"percent", discountValue,
//          minOrderValue?, maxUses?, expiresAt? }
router.post("/", auth, createCoupon);

// PUT /api/vendor/:vendorSlug/coupons/:id
// Updates an existing coupon (must belong to this vendor).
// Any subset of coupon fields can be sent — only provided fields are updated.
router.put("/:id", auth, updateCoupon);

// DELETE /api/vendor/:vendorSlug/coupons/:id
// Permanently deletes a coupon (must belong to this vendor).
router.delete("/:id", auth, deleteCoupon);

export default router;
