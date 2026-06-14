/*
 * routes/vendor/vendorSubCategoryRoutes.js
 *
 * Handles all CRUD routes for a vendor's own sub-categories.
 * A sub-category always belongs to both a Vendor AND a VendorCategory.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   GET    /api/vendor/:vendorSlug/subcategories           → get all (optional ?category=id)
 *   GET    /api/vendor/:vendorSlug/subcategories/:id       → get single sub-category
 *   POST   /api/vendor/:vendorSlug/subcategories           → create new sub-category
 *   PUT    /api/vendor/:vendorSlug/subcategories/:id       → update a sub-category
 *   DELETE /api/vendor/:vendorSlug/subcategories/:id       → delete a sub-category
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
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../../controllers/vendor/vendorSubCategoryController.js";

// mergeParams: true → allows :vendorSlug from the parent app.js mount
// to be available inside this router and the middleware that reads it.
const router = express.Router({ mergeParams: true });

// Full auth + vendor security guard composed into one array.
const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/vendor/:vendorSlug/subcategories
// Returns all sub-categories for this vendor.
// Optional query filter: ?category=<categoryId> → filter by parent category
router.get("/", auth, getSubCategories);

// GET /api/vendor/:vendorSlug/subcategories/:id
// Returns a single sub-category by its MongoDB _id (must belong to this vendor).
router.get("/:id", auth, getSubCategoryById);

// POST /api/vendor/:vendorSlug/subcategories
// Creates a new sub-category under one of this vendor's categories.
// Body: { name: string, category: string (categoryId) }
router.post("/", auth, createSubCategory);

// PUT /api/vendor/:vendorSlug/subcategories/:id
// Updates an existing sub-category (must belong to this vendor).
// Body: { name?: string, category?: string, isActive?: boolean }
router.put("/:id", auth, updateSubCategory);

// DELETE /api/vendor/:vendorSlug/subcategories/:id
// Permanently deletes a sub-category (must belong to this vendor).
router.delete("/:id", auth, deleteSubCategory);

export default router;
