import express from "express";
import { protect, requireAuth } from "../middleware/authMiddleware.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

const adminAuth = [protect, requireAuth("admin")];

// GET /api/admin/audit-logs
router.get("/", adminAuth, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("adminId", "name email")
      .sort({ timestamp: -1 })
      .limit(50);
      
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
