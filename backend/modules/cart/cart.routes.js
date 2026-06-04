// backend/modules/cart/cart.routes.js
import express from "express";
import * as cartController from "./cart.controller.js";

const router = express.Router();

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/update/:productId", cartController.updateQuantity);
router.delete("/remove/:productId", cartController.removeItem);
router.delete("/clear", cartController.clearCart);
router.post("/apply-coupon", cartController.applyCoupon);
router.delete("/remove-coupon", cartController.removeCoupon);
router.put("/item/:id", cartController.updateItemById);
router.delete("/item/:id", cartController.removeItemById);
router.post("/merge", cartController.mergeCart);

export default router;
