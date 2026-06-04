import express from "express";

import { protect, requireAuth } from "../../middleware/authMiddleware.js";
import { vendorGuard } from "../../middleware/vendor/vendorMiddleware.js";
import { getVendorOrders } from "../../controllers/vendor/vendorOrderController.js";

const router = express.Router({ mergeParams: true });

const auth = [protect, requireAuth("vendor"), ...vendorGuard];

// GET /api/vendor/:vendorSlug/orders
router.get("/", auth, getVendorOrders);

export default router;
