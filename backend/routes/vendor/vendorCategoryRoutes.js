/*
 * routes/vendor/vendorCategoryRoutes.js
 *
 * Handles all CRUD routes for a vendor's own categories.
 * These categories are completely separate from admin categories.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   GET    /api/vendor/:vendorSlug/categories         → get all categories
 *   GET    /api/vendor/:vendorSlug/categories/:id     → get single category
 *   POST   /api/vendor/:vendorSlug/categories         → create new category
 *   PUT    /api/vendor/:vendorSlug/categories/:id     → update a category
 *   DELETE /api/vendor/:vendorSlug/categories/:id     → delete a category
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
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/vendor/vendorCategoryController.js";

// mergeParams: true → allows req.params.vendorSlug to flow in from the parent
// router mounted in app.js. Without this, :vendorSlug would be undefined here.
const router = express.Router({ mergeParams: true });

// Compose the full auth + vendor guard into one reusable array.
const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/vendor/:vendorSlug/categories
// Returns all categories belonging to this vendor.
router.get("/", auth, getCategories);

// GET /api/vendor/:vendorSlug/categories/:id
// Returns a single category by its MongoDB _id (must belong to this vendor).
router.get("/:id", auth, getCategoryById);

// POST /api/vendor/:vendorSlug/categories
// Creates a new category for this vendor.
// Body: { name: string, image?: string }
router.post("/", auth, createCategory);

// PUT /api/vendor/:vendorSlug/categories/:id
// Updates an existing category (must belong to this vendor).
// Body: { name?: string, image?: string, isActive?: boolean }
router.put("/:id", auth, updateCategory);

// DELETE /api/vendor/:vendorSlug/categories/:id
// Permanently deletes a category (must belong to this vendor).
router.delete("/:id", auth, deleteCategory);

export default router;
