/*
 * routes/vendor/vendorProductRoutes.js
 *
 * Handles all CRUD routes for a vendor's own products,
 * plus the dedicated image-upload helper endpoint.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   POST   /api/vendor/:vendorSlug/products/upload-image  → upload 1 image, get URL back
 *   GET    /api/vendor/:vendorSlug/products               → get all (supports query filters)
 *   GET    /api/vendor/:vendorSlug/products/:id           → get single product
 *   POST   /api/vendor/:vendorSlug/products               → create new product
 *   PUT    /api/vendor/:vendorSlug/products/:id           → update a product
 *   DELETE /api/vendor/:vendorSlug/products/:id           → delete a product
 *
 * ─── Image upload flow ───────────────────────────────────────────────────────
 *   1. Client picks a file in the UI.
 *   2. Client POSTs it to  /upload-image  as multipart/form-data, field "image".
 *   3. Server saves the file via multer and returns { success, url }.
 *   4. Client stores the URL in its local state.
 *   5. On form submit, client sends images: [url0, url1, ...] in the JSON body
 *      of the normal POST /products or PUT /products/:id request.
 *
 *   Slot convention (enforced by controller, not here):
 *     images[0] → thumbnail shown in product listings
 *     images[1..4] → carousel images shown on product detail page
 *
 * ─── Supported query filters on GET / ────────────────────────────────────────
 *   ?category=<id>       → filter by category
 *   ?subCategory=<id>    → filter by sub-category
 *   ?isActive=true/false → filter by active status
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
import upload from "../../middleware/upload.js";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "../../controllers/vendor/vendorProductController.js";

// mergeParams: true → allows :vendorSlug from the parent app.js mount
// to flow into this router and the middleware that reads it.
const router = express.Router({ mergeParams: true });

// Full auth + vendor security guard composed into one reusable array.
const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// ── Image upload ───────────────────────────────────────────────────────────────
//
// IMPORTANT: This route MUST be declared before  /:id  routes.
// Express matches routes in declaration order; if /:id came first, the literal
// string "upload-image" would be captured as the :id param instead.
//
// POST /api/vendor/:vendorSlug/products/upload-image
// Accepts a single file in the "image" field (multipart/form-data).
// Returns: { success: true, url: "https://…/uploads/filename.jpg" }
// Max file size: 5 MB (enforced by multer config in upload.js).
// Allowed types: image/jpeg, image/png, image/webp, image/gif.
router.post(
  "/upload-image",
  auth,
  upload.single("image"), // multer middleware — processes the file, populates req.file
  uploadProductImage,
);

// ── Product CRUD ───────────────────────────────────────────────────────────────

// GET /api/vendor/:vendorSlug/products
// Returns all products for this vendor.
// Supports optional query filters: ?category=id, ?subCategory=id, ?isActive=true
router.get("/", auth, getProducts);

// GET /api/vendor/:vendorSlug/products/:id
// Returns a single product by its MongoDB _id (must belong to this vendor).
router.get("/:id", auth, getProductById);

// POST /api/vendor/:vendorSlug/products
// Creates a new product for this vendor.
// Body: { name, price, description?, salePrice?, stock?,
//         images?: string[], category?, subCategory?, isActive? }
// Note: images[] should contain URLs already returned by the upload-image route.
//       images[0] = thumbnail, images[1-4] = carousel (max 5 total).
router.post("/", auth, createProduct);

// PUT /api/vendor/:vendorSlug/products/:id
// Updates an existing product (must belong to this vendor).
// Any subset of product fields can be sent — only provided fields are updated.
// images: undefined → no change | images: [] → clear all | images: [...] → replace
router.put("/:id", auth, updateProduct);

// DELETE /api/vendor/:vendorSlug/products/:id
// Permanently deletes a product (must belong to this vendor).
router.delete("/:id", auth, deleteProduct);

export default router;
