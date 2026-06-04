// backend/modules/auth/auth.routes.js
import express from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: "Too many registration attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, authController.register);
router.post("/register-admin", authController.registerAdmin);
router.post("/register-vendor", registerLimiter, authController.registerVendor);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.put("/profile", protect, authController.updateProfile);

export default router;
