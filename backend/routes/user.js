// ─── routes/user.js ──────────────────────────────────────────────────────────
// Express router for all user-management endpoints (Admin Panel).
// Mount in your main app file:  app.use("/api/users", userRouter);
//
// Routes (specific before parameterised — same pattern as order.js):
//   GET    /api/users/stats            Dashboard counts: total, hot, cold, deactive
//   GET    /api/users                  All users — admin (paginated + search + filter)
//   GET    /api/users/:id              Single user profile + full order history
//   PUT    /api/users/:id/status       Admin manually overrides user status tag
//   DELETE /api/users/:id              Admin hard-deletes a user account
//
// Status logic:
//   If user.adminStatusOverride is set  →  use that (admin pinned it manually).
//   Otherwise derive from order count in the last HOT_DAYS_WINDOW days:
//     ≥ HOT_ORDER_THRESHOLD  orders  → "Hot"
//     ≥ COLD_ORDER_THRESHOLD orders  → "Cold"
//     otherwise                      → "Deactive"
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Thresholds (override in .env) ────────────────────────────────────────────
const HOT_ORDER_THRESHOLD  = Number(process.env.HOT_ORDER_THRESHOLD)  || 5;  // ≥5 → Hot
const COLD_ORDER_THRESHOLD = Number(process.env.COLD_ORDER_THRESHOLD) || 2;  // 2-4 → Cold
const HOT_DAYS_WINDOW      = Number(process.env.HOT_DAYS_WINDOW)      || 90; // look-back days

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Returns a status string for a user.
 * Respects adminStatusOverride if set; otherwise auto-derives from order history.
 */
const resolveStatus = async (user) => {
  // Admin pinned this manually — respect it
  if (user.adminStatusOverride) return user.adminStatusOverride;

  const since = new Date();
  since.setDate(since.getDate() - HOT_DAYS_WINDOW);

  const recentCount = await Order.countDocuments({
    user: user._id,
    createdAt: { $gte: since },
  });

  if (recentCount >= HOT_ORDER_THRESHOLD)  return "Hot";
  if (recentCount >= COLD_ORDER_THRESHOLD) return "Cold";
  return "Deactive";
};

/** Latest order date for a user, or null if no orders. */
const getLastOrderDate = async (userId) => {
  const o = await Order.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();
  return o ? o.createdAt : null;
};

/** Total order count for a user. */
const getTotalOrders = (userId) => Order.countDocuments({ user: userId });


// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  ROUTE ORDER: /stats MUST be above /:id — same rule as /myorders in order.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/users/stats ─────────────────────────────────────────────────────
// @desc    Aggregate dashboard counts — total / hot / cold / deactive
// @access  Private/Admin
router.get("/stats", protect, admin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("_id adminStatusOverride").lean();

    const counts = { total: 0, hot: 0, cold: 0, deactive: 0 };

    // Resolve status for all users in parallel
    const statuses = await Promise.all(users.map((u) => resolveStatus(u)));

    statuses.forEach((s) => {
      counts.total++;
      if      (s === "Hot")      counts.hot++;
      else if (s === "Cold")     counts.cold++;
      else                       counts.deactive++;
    });

    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ─── GET /api/users ───────────────────────────────────────────────────────────
// @desc    Get all non-admin users — paginated, searchable, status-filterable
// @access  Private/Admin
//
// Query params:
//   ?pageNumber=1
//   ?search=john           — matches name OR email (case-insensitive)
//   ?status=Hot|Cold|Deactive
router.get("/", protect, admin, async (req, res) => {
  try {
    const pageSize = Number(process.env.ADMIN_PAGE_SIZE) || 20;
    const page     = Math.max(1, Number(req.query.pageNumber) || 1);

    // ── Build DB filter ─────────────────────────────────────────────────────
    const filter = { role: "user" };

    if (req.query.search) {
      const re = new RegExp(req.query.search, "i");
      filter.$or = [{ name: re }, { email: re }];
    }

    const count = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean();

    // ── Enrich each user with computed fields ───────────────────────────────
    let enriched = await Promise.all(
      users.map(async (u) => {
        const [status, lastOrderDate, totalOrders] = await Promise.all([
          resolveStatus(u),
          getLastOrderDate(u._id),
          getTotalOrders(u._id),
        ]);
        return { ...u, status, lastOrderDate, totalOrders };
      }),
    );

    // Status filter is applied post-enrichment because status is computed
    if (req.query.status) {
      enriched = enriched.filter((u) => u.status === req.query.status);
    }

    res.json({
      users: enriched,
      page,
      pages: Math.ceil(count / pageSize),
      totalUsers: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ─── GET /api/users/:id ───────────────────────────────────────────────────────
// @desc    Single user profile — enriched with order history & computed status
// @access  Private/Admin
router.get("/:id", protect, admin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id).select("-password").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ── Order history (last 50) ─────────────────────────────────────────────
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("_id totalPrice orderStatus createdAt paymentMethod isPaid paidAt")
      .lean();

    // Attach shortId (last 6 chars of _id) to each order — mirrors order.js
    const formattedOrders = orders.map((o) => ({
      ...o,
      shortId: o._id.toString().slice(-6).toUpperCase(),
    }));

    const [status, totalOrders] = await Promise.all([
      resolveStatus(user),
      getTotalOrders(user._id),
    ]);

    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;
    const totalSpend    = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    res.json({
      ...user,
      status,
      lastOrderDate,
      totalOrders,
      totalSpend,
      orders: formattedOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ─── PUT /api/users/:id/status ────────────────────────────────────────────────
// @desc    Admin manually pins / overrides a user's status tag
// @access  Private/Admin
// Body:    { status: "Hot" | "Cold" | "Deactive" | "" }
//          Pass "" to clear the override and go back to auto-derived.
router.put("/:id/status", protect, admin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const validValues = ["Hot", "Cold", "Deactive", ""];
    const { status } = req.body;

    if (status === undefined || !validValues.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${validValues.filter(Boolean).join(", ")} (or empty string to clear override)`,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { adminStatusOverride: status },
      { new: true, select: "-password" },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resolvedStatus = await resolveStatus(user.toObject());
    res.json({ message: "Status updated", user, resolvedStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
// @desc    Hard-delete a user account (admin cannot be deleted)
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete an admin account" });
    }

    await user.deleteOne();
    res.json({ message: "User removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


export default router;