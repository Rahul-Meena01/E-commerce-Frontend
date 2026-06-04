// backend/modules/order/order.routes.js
import express from "express";
import * as orderController from "./order.controller.js";
import { protect, admin } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Specific routes first, parameterized later
router.post("/", protect, orderController.createOrder);
router.get("/myorders", protect, orderController.getMyOrders);
router.get("/", protect, orderController.getOrders);
router.get("/:id", protect, orderController.getOrderById);
router.put("/:id/pay", protect, orderController.payOrder);
router.put("/:id/cancel", protect, orderController.cancelOrder);
router.put("/:id/status", protect, admin, orderController.updateOrderStatus);

export default router;
