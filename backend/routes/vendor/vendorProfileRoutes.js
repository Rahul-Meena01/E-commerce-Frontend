/*
 * routes/vendor/vendorProfileRoutes.js
 *
 * Handles routes for a vendor's own shop profile.
 * A vendor can view and update their own shop details here.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   GET  /api/vendor/:vendorSlug/me  → get own profile
 *   PUT  /api/vendor/:vendorSlug/me  → update own profile
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
  getMyProfile,
  updateMyProfile,
} from "../../controllers/vendor/vendorProfileController.js";

// ── mergeParams: true ─────────────────────────────────────────────────────────
// This router is mounted UNDER /api/vendor/:vendorSlug in app.js.
// Without mergeParams: true, req.params.vendorSlug would be UNDEFINED here
// because Express doesn't pass parent route params into child routers by default.
// mergeParams: true fixes that — now req.params.vendorSlug is accessible
// in this router AND in the vendorMiddleware that reads it.
const router = express.Router({ mergeParams: true });

// ── Auth guard ────────────────────────────────────────────────────────────────
// Compose the full middleware chain into one array for reuse on every route.
// protect + requireAuth run first (from your existing authMiddleware),
// then vendorGuard (attachVendorContext + validateOwnership) runs after.
const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/vendor/:vendorSlug/me
// Returns the logged-in vendor's own shop profile document.
router.get("/me", auth, getMyProfile);

// PUT /api/vendor/:vendorSlug/me
// Updates allowed fields on the vendor's shop profile.
// Fields like status and commissionRate are NOT updatable here (admin-only).
router.put("/me", auth, updateMyProfile);

export default router;
