/*
 * middleware/vendor/vendorMiddleware.js
 *
 * This file contains TWO middleware functions that run on EVERY vendor route.
 * They act as security guards between the auth check and the actual controller.
 *
 * ─── How middleware works (quick recap for beginners) ────────────────────────
 * In Express, a "middleware" is just a function that runs between the request
 * arriving and the controller responding. It receives (req, res, next).
 *
 *   - req  → the incoming request (headers, body, params, etc.)
 *   - res  → the response object (used to send back errors early if needed)
 *   - next → a function you call to say "I'm done, pass to the next step"
 *
 * If something is wrong (vendor not found, account suspended, wrong slug),
 * we call res.status(...).json(...) and STOP — next() is never called,
 * so the controller never runs.
 *
 * ─── Full middleware chain on every vendor route ─────────────────────────────
 *
 *   1. protect             → from authMiddleware.js (verifies JWT, adds req.user)
 *   2. authorizeRoles("vendor") → confirms req.user.role === "vendor"
 *   3. attachVendorContext → (THIS FILE) finds the Vendor doc, checks status
 *   4. validateOwnership   → (THIS FILE) confirms the URL slug matches the token
 *   5. controller          → finally runs the actual logic
 *
 * So by the time a controller runs, we have GUARANTEED:
 *   ✓ Valid JWT token
 *   ✓ User role is "vendor"
 *   ✓ Vendor account is active (not pending/suspended)
 *   ✓ The :vendorSlug in the URL belongs to the logged-in vendor
 */

import Vendor from "../../models/VendorSchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE 1: attachVendorContext
//
// What it does:
//   - Looks up the Vendor document linked to the logged-in user (req.user._id)
//   - Blocks if the vendor account is pending or suspended
//   - Attaches the vendor document to req.vendor and req.vendorId
//
// Why it's needed:
//   - The JWT only stores user._id and role — it doesn't store vendor info.
//   - Every vendor controller needs req.vendor and req.vendorId to:
//       a) scope DB queries to only this vendor's data
//       b) do ownership checks on individual documents
//   - Rather than fetching the vendor in every single controller function,
//     we do it once here and attach it to the request object.
//
// What gets added to req:
//   req.vendor   → the full Vendor document (shopName, slug, status, etc.)
//   req.vendorId → shorthand for req.vendor._id (used in almost every query)
// ─────────────────────────────────────────────────────────────────────────────
export const attachVendorContext = async (req, res, next) => {
  try {
    // ── Find the Vendor document linked to the logged-in user ─────────────────
    // req.user is set by the `protect` middleware that runs before this.
    // req.user._id is the MongoDB _id of the User document.
    // We find the Vendor where the `user` field matches this _id.
    const vendor = await Vendor.findOne({ user: req.user._id });

    // ── If no Vendor document exists, something went wrong during registration ─
    // This should never happen in normal flow because register-vendor creates
    // both documents atomically in a transaction. But if data got corrupted
    // (e.g. manual DB edits), we catch it here instead of crashing later.
    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Vendor profile not found. Please contact support.",
      });
    }

    // ── Block pending vendors ─────────────────────────────────────────────────
    // After registration, vendor status is "pending" until an admin approves it.
    // Even if a pending vendor somehow gets a valid JWT, they can't access
    // any vendor routes until their account is approved.
    if (vendor.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your vendor account is awaiting admin approval.",
      });
    }

    // ── Block suspended vendors ───────────────────────────────────────────────
    // Admin can suspend a vendor at any time. If suspended, the vendor is
    // immediately locked out of all vendor routes, even mid-session.
    // Their JWT may still be valid, but this check stops them here.
    if (vendor.status === "suspended") {
      return res.status(403).json({
        success: false,
        message:
          "Your vendor account has been suspended. Please contact support.",
      });
    }

    // ── Attach vendor info to the request object ──────────────────────────────
    // Now that we know the vendor exists and is active, we attach it to `req`
    // so every downstream controller can use it without another DB call.
    //
    // req.vendor   → the full Mongoose document (can call .save() on it directly)
    // req.vendorId → just the _id, used as a shorthand in DB queries like:
    //                VendorProduct.find({ vendor: req.vendorId })
    req.vendor = vendor;
    req.vendorId = vendor._id;

    // ── All checks passed — move to the next middleware or controller ─────────
    next();
  } catch (error) {
    // Something unexpected happened (e.g. DB connection dropped mid-query).
    // Log it server-side and return a generic 500 to the client.
    console.error("attachVendorContext error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE 2: validateOwnership
//
// What it does:
//   - Compares the :vendorSlug from the URL with the slug on req.vendor
//   - Blocks if they don't match
//
// Why it's needed:
//   - Without this check, Vendor A could hit:
//       PUT /api/vendor/vendor-b-shop/products/:id
//     with their own valid JWT and potentially read or modify Vendor B's data.
//   - This is called an "Insecure Direct Object Reference" (IDOR) — a common
//     web security vulnerability. This middleware is what prevents it at the
//     route level.
//
// Note:
//   - The controllers also do ownership checks at the DB level (finding docs
//     with BOTH _id AND vendor: req.vendorId). That's the second layer of
//     defense. This middleware is the first layer.
//   - Both layers together make cross-vendor data access virtually impossible.
//
// Prerequisite:
//   - attachVendorContext must run BEFORE this, because we read req.vendor here.
//   - Route files must use { mergeParams: true } so :vendorSlug is accessible
//     inside nested routers via req.params.vendorSlug.
// ─────────────────────────────────────────────────────────────────────────────
export const validateOwnership = (req, res, next) => {
  // ── Compare URL slug vs the authenticated vendor's slug ───────────────────
  // req.params.vendorSlug → comes from the URL: /api/vendor/:vendorSlug/products
  // req.vendor.slug        → comes from the DB, set by attachVendorContext above
  //
  // Example:
  //   URL:   /api/vendor/nike-store/products
  //   Token: belongs to vendor with slug "adidas-shop"
  //   Result: BLOCKED — slugs don't match
  if (req.vendor.slug !== req.params.vendorSlug) {
    return res.status(403).json({
      success: false,
      // Generic message — we don't tell them WHICH vendor the slug belongs to
      message: "Access denied. You can only access your own vendor dashboard.",
    });
  }

  // ── Slugs match — this vendor owns this URL ───────────────────────────────
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORT: vendorGuard
//
// This combines both middleware functions into a single array.
// Instead of writing [attachVendorContext, validateOwnership] in every
// route file, you just import and spread vendorGuard.
//
// Usage in route files:
//   import { vendorGuard } from "../../middleware/vendor/vendorMiddleware.js";
//
//   const auth = [protect, authorizeRoles("vendor"), ...vendorGuard];
//   router.get("/", auth, getProducts);
//
// The order matters:
//   attachVendorContext runs first (fetches + validates the vendor)
//   validateOwnership runs second (uses req.vendor set by the first)
// ─────────────────────────────────────────────────────────────────────────────
export const vendorGuard = [attachVendorContext, validateOwnership];
