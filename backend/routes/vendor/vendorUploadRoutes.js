/*
 * routes/vendor/vendorUploadRoutes.js
 *
 * Handles image upload for vendor-owned resources (products, profile logo, banner).
 *
 * ─── Route ────────────────────────────────────────────────────────────────────
 *
 *   POST /api/vendor/:vendorSlug/upload
 *
 * ─── Middleware chain ─────────────────────────────────────────────────────────
 *
 *   protect             → verify JWT, attach req.user
 *   requireAuth      → confirm role === "vendor"
 *   vendorGuard         → [attachVendorContext + validateOwnership] combined:
 *                           1. finds Vendor doc by req.user._id → req.vendor, req.vendorId
 *                           2. confirms :vendorSlug in URL matches req.vendor.slug
 *                              (prevents vendor A uploading under vendor B's URL)
 *   upload.single("image") → Multer processes the file:
 *                              - validates type (jpeg/png/webp/gif only)
 *                              - validates size (max 5 MB)
 *                              - saves to /uploads/
 *                              - attaches file info to req.file
 *   uploadVendorImage   → reads req.file, returns the public URL
 *
 * ─── Why { mergeParams: true }? ──────────────────────────────────────────────
 *   This router is mounted under /api/vendor/:vendorSlug in server.js.
 *   Without mergeParams: true, req.params.vendorSlug would be undefined here.
 *   All vendor route files must use this setting.
 *
 * ─── Postman test ─────────────────────────────────────────────────────────────
 *   POST http://localhost:3000/api/vendor/nike-store/upload
 *   Authorization: Bearer <VENDOR_TOKEN>
 *   Body: form-data
 *     key:   image   (type: File)
 *     value: [select any jpg/png/webp file]
 *
 *   Expected response:
 *   {
 *     "success": true,
 *     "message": "Image uploaded successfully",
 *     "url": "/uploads/1718000000000.jpg",
 *     "file": { "originalName": "shoe.jpg", "size": 204800, "mimetype": "image/jpeg" }
 *   }
 */

import express from "express";

import { protect, requireAuth } from "../../middleware/authMiddleware.js";
import { vendorGuard } from "../../middleware/Vendor/vendorMiddleware.js";
import upload from "../../middleware/upload.js";
import { uploadVendorImage } from "../../controllers/vendor/vendorUploadController.js";

// mergeParams: true is REQUIRED — makes :vendorSlug available from the parent router
const router = express.Router({ mergeParams: true });

// ── Auth + ownership guard ────────────────────────────────────────────────────
// vendorGuard = [attachVendorContext, validateOwnership] (defined in vendorMiddleware.js)
// Spreading it into the array keeps the chain flat and readable.
const vendorAuth = [
  protect, // 1. valid JWT → req.user
  requireAuth("vendor"), // 2. role must be "vendor"
  ...vendorGuard, // 3. fetch vendor doc + 4. verify slug ownership
];

// ── Upload route ──────────────────────────────────────────────────────────────
//
// upload.single("image") is placed AFTER the auth guards intentionally.
// No point running Multer (disk I/O) if the user isn't authenticated.
// If auth fails, the request is rejected before the file is even touched.
//
// "image" is the expected form-data field name on the frontend.
// If the frontend sends it under a different name (e.g. "file"), change it here.
//
router.post(
  "/",
  vendorAuth, // auth + ownership checks first
  upload.single("image"), // then process the file
  uploadVendorImage, // then return the URL
);

export default router;
