/*
 * controllers/vendor/vendorUploadController.js
 *
 * Handles file uploads for vendor-owned resources.
 * By the time any function here runs, Multer has already:
 *   1. Validated the file type (images only — enforced in middleware/upload.js)
 *   2. Validated the file size (max 5 MB — enforced in middleware/upload.js)
 *   3. Saved the file to /uploads/ on disk
 *   4. Attached the file info to req.file
 *
 * This controller just reads req.file and returns the public URL back to the client.
 * The client stores that URL in a form field and sends it with the product/profile request.
 *
 * ─── Flow ─────────────────────────────────────────────────────────────────────
 *
 *   Frontend sends:  POST /api/vendor/:vendorSlug/upload
 *                    Content-Type: multipart/form-data
 *                    Body field name: "image"  (must match upload.single("image") in routes)
 *
 *   Backend returns: { success: true, url: "/uploads/1718000000000.jpg" }
 *
 *   Frontend uses:   that URL as the value of the `images` or `logo` field
 *                    when creating/updating a product or vendor profile.
 *
 * ─── Why a separate upload endpoint instead of embedding in product routes? ───
 *
 *   Separating upload from create/update keeps things clean:
 *     - Product create/update stay JSON — simpler validation, simpler testing
 *     - Upload can be called independently (e.g. live preview before save)
 *     - One upload endpoint works for products, profile logo, banner — no duplication
 */

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/upload
// @desc    Upload a single image file.
//          Multer runs before this and saves the file.
//          This function just reads req.file and returns the accessible URL.
// @access  Private (vendor only — protect + authorizeRoles("vendor") in routes)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadVendorImage = (req, res) => {
  // req.file is set by Multer after a successful upload.
  // If it's undefined here, it means:
  //   a) The client didn't send a file field, OR
  //   b) The field name didn't match upload.single("image")
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Send a file under the field name "image".',
    });
  }

  // With Cloudinary Storage, the URL is stored in req.file.path
  const imageUrl = req.file.path;

  return res.status(200).json({
    success: true,
    message: "Image uploaded successfully",
    url: imageUrl,
    // Also return file metadata — useful for the frontend to show a preview
    file: {
      originalName: req.file.originalname,
      size: req.file.size, // in bytes
      mimetype: req.file.mimetype,
    },
  });
};
