/*
 * routes/admin/adminVendorRoutes.js
 *
 * Admin-only routes for managing vendor accounts.
 * Admin can list, view, approve, suspend, set commission, and delete vendors.
 *
 * ─── Route overview ──────────────────────────────────────────────────────────
 *   GET    /api/admin/vendors                      → list all vendors (paginated)
 *   GET    /api/admin/vendors/:id                  → get single vendor detail
 *   PUT    /api/admin/vendors/:id/status           → approve or suspend vendor
 *   PUT    /api/admin/vendors/:id/commission       → set commission rate
 *   DELETE /api/admin/vendors/:id                  → delete vendor + user account
 *
 * ─── Middleware chain on every request ───────────────────────────────────────
 *   protect        → verifies JWT token, adds req.user
 *   requireAuth → confirms user role is "admin"
 *   controller     → runs the actual logic
 *
 * NOTE: There is NO vendorGuard here.
 * vendorGuard is only for vendor-role users accessing their own data.
 * Admins access any vendor by MongoDB _id — no slug ownership check needed.
 */

import express from "express";

import { protect, requireAuth } from "../middleware/authMiddleware.js";
import {
  getAllVendors,
  getVendorById,
  getVendorOrders,
  updateVendorStatus,
  updateVendorCommission,
  deleteVendor,
} from "../controllers/adminVendorController.js";

const router = express.Router();

// ── Auth guard (admin only) ───────────────────────────────────────────────────
// Composed into one array for reuse on every route below.
const adminAuth = [protect, requireAuth("admin")];

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/admin/vendors
// List all vendors with optional filters: ?status=pending|active|suspended
// Supports pagination: ?page=1&limit=10
router.get("/", adminAuth, getAllVendors);

// GET /api/admin/vendors/:id
// Get a single vendor's full details including their linked user info.
router.get("/:id", adminAuth, getVendorById);

// GET /api/admin/vendors/:id/orders
// Get vendor-specific order history and revenue summary.
router.get("/:id/orders", adminAuth, getVendorOrders);

// PUT /api/admin/vendors/:id/status
// Approve a pending vendor or suspend an active one.
// Body: { status: "active" | "suspended" }
router.put("/:id/status", adminAuth, updateVendorStatus);

// PUT /api/admin/vendors/:id/commission
// Set a custom platform commission rate for a specific vendor.
// Body: { commissionRate: number } (0–100)
router.put("/:id/commission", adminAuth, updateVendorCommission);

// DELETE /api/admin/vendors/:id
// Permanently deletes the vendor profile AND the linked user account.
// Uses a transaction — both are deleted together or neither is.
router.delete("/:id", adminAuth, deleteVendor);

export default router;
