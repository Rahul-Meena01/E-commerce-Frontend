/*
 * Backend Application Entry
 * Fully corrected version with:
 * ✅ Proper CORS
 * ✅ JWT auth support
 * ✅ Cookie support
 * ✅ Protected routes
 * ✅ Static uploads
 * ✅ Global error handling
 * ✅ Order routes fixed
 * ✅ No duplicate middleware execution
 */

import "dotenv/config";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "crypto";
import mongoSanitize from "express-mongo-sanitize";
// ─────────────────────────────────────────────────────────────
// LOCAL IMPORTS
// ─────────────────────────────────────────────────────────────
import connectDB from "./config/db.js";
import { protect } from "./middleware/authMiddleware.js";
import env from "./config/env.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import categoryRoutes from "./routes/category.js";
import subCategoryRoutes from "./routes/subCategory.js";
import productRoutes from "./modules/product/product.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import couponRoutes from "./routes/coupon.js";
import variantRoutes from "./routes/variant.js";
import profileRoutes from "./routes/profile.js";
import addressesRoutes from "./routes/addresses.js";
import giftCardRoutes from "./routes/giftCard.js";
import orderRoutes from "./modules/order/order.routes.js";
import userRoutes from "./routes/user.js";
import paymentRoutes, { stripeWebhookHandler } from "./modules/payment/payment.routes.js";
import wishlistRoutes from "./routes/wishlist.js";

// Admin Vendor Management
import adminVendorRoutes from "./routes/adminVendorRoutes.js";

// Vendor-scoped Catalog Management
import vendorProfileRoutes from "./routes/vendor/vendorProfileRoutes.js";
import vendorCategoryRoutes from "./routes/vendor/vendorCategoryRoutes.js";
import vendorSubCategoryRoutes from "./routes/vendor/vendorSubCategoryRoutes.js";
import vendorProductRoutes from "./routes/vendor/vendorProductRoutes.js";
import vendorCouponRoutes from "./routes/vendor/vendorCouponRoutes.js";
import vendorOrderRoutes from "./routes/vendor/vendorOrderRoutes.js";
import vendorUploadRoutes from "./routes/vendor/vendorUploadRoutes.js";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
dotenv.config();

const app = express();

const port = env.PORT;

// Frontend URLs allowed
const allowedOrigins = env.CLIENT_URL
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ─────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────

app.set("trust proxy", 1);

app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

// ✅ PRODUCTION-GRADE SECURITY HEADERS (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // CSP initially disabled per user request to avoid blocking Stripe/Razorpay
  hsts: env.IS_PRODUCTION
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // Required for Stripe/Razorpay iframe compatibility
}));

// ✅ REQUEST TRACING MIDDLEWARE
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  console.log(`[Request ID: ${req.id}] ${req.method} ${req.url}`);
  next();
});

// ✅ CORS FIXED (Allows localhost:5174 via .env)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman/mobile/curl/no-origin requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ✅ BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strip $ and . from request body, query, and params to prevent NoSQL injection
// Custom implementation to avoid "TypeError: Cannot set property query of #<IncomingMessage>" in Express 5
app.use((req, res, next) => {
  const options = { replaceWith: '_' };
  ['body', 'params', 'query', 'headers'].forEach((key) => {
    if (req[key]) {
      const hasProhibited = mongoSanitize.has(req[key]);
      if (hasProhibited) {
        mongoSanitize.sanitize(req[key], options);
        console.warn(`[SECURITY] Sanitized NoSQL injection attempt: key=${key} ip=${req.ip}`);
      }
    }
  });
  next();
});

// ✅ COOKIE PARSER
app.use(cookieParser());

// ✅ STATIC FOLDERS
app.use("/uploads", express.static("uploads"));
app.use(express.static("frontend"));

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// PUBLIC
app.use("/api/auth", authRoutes);

// PROTECTED
// PUBLIC CATALOG & PROTECTED MUTATIONS (protect applied inside routers)
app.use("/api/category", categoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subCategory", subCategoryRoutes);
app.use("/api/subCategories", subCategoryRoutes);
app.use("/api/product", productRoutes);
app.use("/api/products", productRoutes);

// PROTECTED ROUTES
app.use("/api/variant", protect, variantRoutes);
app.use("/api/cart", protect, cartRoutes);
app.use("/api/coupon", protect, couponRoutes);
app.use("/api/wishlist", protect, wishlistRoutes);
app.use("/api", protect, profileRoutes);
app.use("/api/giftCard", protect, giftCardRoutes);
app.use("/api/addresses", protect, addressesRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);

/*
 * IMPORTANT:
 * Order routes already use protect/admin
 * inside routes/order.js
 *
 * DO NOT APPLY protect HERE AGAIN
 */
app.use("/api/orders", orderRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/users", userRoutes);

// Admin Vendor Management
app.use("/api/admin/vendors", adminVendorRoutes);

// Vendor-scoped Catalog Management
app.use("/api/vendor/:vendorSlug", vendorProfileRoutes);
app.use("/api/vendor/:vendorSlug/categories", vendorCategoryRoutes);
app.use("/api/vendor/:vendorSlug/subcategories", vendorSubCategoryRoutes);
app.use("/api/vendor/:vendorSlug/products", vendorProductRoutes);
app.use("/api/vendor/:vendorSlug/coupons", vendorCouponRoutes);
app.use("/api/vendor/:vendorSlug/orders", vendorOrderRoutes);
app.use("/api/vendor/:vendorSlug/upload", vendorUploadRoutes);
// Restart trigger comment

// ─────────────────────────────────────────────────────────────
// TEST ROUTE
// ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully",
  });
});

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[Request ID: ${req.id || 'N/A'}] GLOBAL ERROR:`, err);

  // If headers already sent
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;

  let message = err.message || "Internal Server Error";

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File too large. Maximum size is 5MB.";
  }

  // Multer generic
  if (err.name === "MulterError") {
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : message,
  });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`
========================================
🚀 Server running successfully
🌍 PORT: ${port}
========================================
`);
  });
}

export default app;
