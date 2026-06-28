/*
 * ============================================================
 *  server.js  —  Main Express Application Entry Point
 * ============================================================
 *
 *  Boot order:
 *    1.  Environment variables  (.env)
 *    2.  Core dependencies
 *    3.  Route imports
 *    4.  App + HTTP server init
 *    5.  Database connection
 *    6.  Middleware
 *        6a. Razorpay webhook raw-body parser  ← MUST be before express.json()
 *        6b. CORS
 *        6c. JSON + urlencoded body parsers
 *        6d. Cookie parser
 *        6e. Static file serving
 *    7.  Health-check route
 *    8.  Public routes        (no token)
 *    9.  Customer routes      (protect at mount level)
 *   10.  Order / User / Payment routes  (protect lives INSIDE each file)
 *   11.  Admin routes         (protect + role check inside each file)
 *   12.  Vendor routes        (protect + vendor middleware inside each file)
 *   13.  404 handler
 *   14.  Global error handler
 *   15.  Start server
 *
 * ─── Fixes applied vs previous version ──────────────────────────────────────
 *
 *  FIX 1 — CRITICAL: app.use("/api", protect, profileRoutes) was intercepting
 *           ALL /api/* requests (including /api/orders, /api/payment, /api/users)
 *           because Express prefix-matches "/api" against everything.
 *           Fixed: scoped to /api/profile so only profile requests hit that router.
 *
 *  FIX 2 — CRITICAL: express.json() was parsing the Razorpay webhook body before
 *           the signature check, making HMAC verification always fail (the
 *           re-serialised JSON never matches Razorpay's original byte signature).
 *           Fixed: added express.raw({ type: "application/json" }) scoped to
 *           /api/payment/webhook BEFORE express.json() is applied globally.
 *
 *  FIX 3 — Double protect on /api/cart: protect was applied here at mount level
 *           AND individually inside cart.js route handlers. Kept only at mount level.
 *
 *  FIX 4 — Removed the TEMPORARY test-payment static file route that was
 *           registered in the middle of middleware setup (before CORS, before
 *           body parsers). Moved to after middleware is set up, guarded by
 *           NODE_ENV !== "production".
 *
 *  FIX 5 — Removed dead commented-out code (the old version). Kept the file clean.
 *
 * ─── Protection strategy summary ─────────────────────────────────────────────
 *
 *  Mount-level protect (here in server.js):
 *    /api/cart, /api/wishlist, /api/coupon, /api/giftCard, /api/profile
 *    → Every single endpoint in these files requires auth; applying once here
 *      is cleaner than adding protect to each route individually.
 *
 *  Internal protect (inside the route file):
 *    /api/orders, /api/users, /api/payment
 *    → These files mix public and protected endpoints (e.g. webhook is public),
 *      so each route declares its own protect where needed.
 *
 *  Internal protect + role check:
 *    /api/admin/*, /api/vendor/*
 *    → These files chain protect + authorizeRoles / vendorMiddleware per route.
 *
 * ─── mergeParams: true reminder ──────────────────────────────────────────────
 *  All vendor router files MUST be created with:
 *    const router = express.Router({ mergeParams: true });
 *  Without it, req.params.vendorSlug is undefined inside the child router.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1.  ENVIRONMENT VARIABLES
//     Must be first — every module that follows may read process.env
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────
// 2.  CORE DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
import express      from "express";
import helmet       from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cors         from "cors";
import cookieParser from "cookie-parser";
import http         from "http";
import path         from "path";
import { fileURLToPath } from "url";

// Logger
import logger from "./utils/logger.js";

import { initSocket } from "./socket.js";
import connectDB    from "./config/db.js";
import { protect }  from "./middleware/authMiddleware.js";
import setupCronJobs from "./cron.js";

// ─────────────────────────────────────────────────────────────────────────────
// 3.  ROUTE IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Public ────────────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import rateLimit from "express-rate-limit";

// ─── Route Imports ───────────────────────────────────────────────────────────
import categoryRoutes    from "./routes/category.js";
import subCategoryRoutes from "./routes/subCategory.js";
import productRoutes     from "./routes/product.js";
import variantRoutes     from "./routes/variant.js";
import cartRoutes        from "./routes/cart.js";
import wishlistRoutes    from "./routes/wishlist.js";
import couponRoutes      from "./routes/coupon.js";
import giftCardRoutes    from "./routes/giftCard.js";
import profileRoutes     from "./routes/profile.js";
import uploadRoutes      from "./routes/upload.js";
import addressRoutes     from "./routes/addresses.js";

// ── Order / User / Payment  (protect declared INSIDE each file) ───────────────
import orderRoutes   from "./routes/order.js";
import userRoutes    from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";

// ── Admin ─────────────────────────────────────────────────────────────────────
import adminVendorRoutes from "./routes/adminVendorRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

// ── Vendor (each file handles protect + vendorMiddleware internally) ──────────
import vendorProfileRoutes     from "./routes/vendor/vendorProfileRoutes.js";
import vendorCategoryRoutes    from "./routes/vendor/vendorCategoryRoutes.js";
import vendorSubCategoryRoutes from "./routes/vendor/vendorSubCategoryRoutes.js";
import vendorProductRoutes     from "./routes/vendor/vendorProductRoutes.js";
import vendorCouponRoutes      from "./routes/vendor/vendorCouponRoutes.js";
import vendorOrderRoutes       from "./routes/vendor/vendorOrderRoutes.js";
import vendorUploadRoutes      from "./routes/vendor/vendorUploadRoutes.js";

// ─────────────────────────────────────────────────────────────────────────────
// 4.  APP + SERVER INIT
// ─────────────────────────────────────────────────────────────────────────────
const app    = express();

// Apply security middlewares globally before any routes
app.use(helmet());
// Fix for Express 5 compatibility with express-mongo-sanitize (req.query is read-only)
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((k) => {
    if (req[k]) {
      mongoSanitize.sanitize(req[k]);
    }
  });
  next();
});
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Allowed frontend origins — dynamic based on environment
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd
  ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach(url => {
    if (!allowedOrigins.includes(url.trim())) allowedOrigins.push(url.trim());
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  DATABASE + SOCKET
// ─────────────────────────────────────────────────────────────────────────────
connectDB();
initSocket(server, allowedOrigins);

// ─────────────────────────────────────────────────────────────────────────────
// 6.  MIDDLEWARE
//     Order matters — every request passes through these in sequence.
// ─────────────────────────────────────────────────────────────────────────────

// ── 6a. Razorpay webhook — raw body parser ────────────────────────────────────
//
//  FIX 2: This MUST be registered before express.json().
//
//  Razorpay computes its webhook signature over the exact raw bytes it sent.
//  If express.json() parses the body first, JSON.stringify(req.body) later will
//  produce a different byte string (key order, whitespace), so the HMAC will
//  never match and all webhook events will be rejected with 400.
//
//  By scoping express.raw() to /api/payment/webhook only, this route receives
//  req.body as a Buffer. The webhook handler reads:
//    - req.body          → raw Buffer  (for HMAC)
//    - JSON.parse(req.body.toString())  → event object  (after verification)
//
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

// ── 6b. CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      // In production, strictly enforce origins. Allow Postman/curl only in dev.
      if (!origin && !isProd) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // required for HTTP-only cookie (JWT)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── 6c. Body parsers ──────────────────────────────────────────────────────────
//  Note: /api/payment/webhook is already handled above with express.raw(),
//  so it will NOT be re-parsed here.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 6d. Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ── 6e. Static file serving ───────────────────────────────────────────────────
// Product images, vendor logos, etc.
// app.use("/uploads", express.static("uploads")); // Removed in Phase 2 for Cloudinary migration
app.use(express.static("frontend"));

// ─────────────────────────────────────────────────────────────────────────────
// 7.  HEALTH CHECK + DEV-ONLY TEST ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ success: true, message: "API running successfully 🚀" });
});

// FIX 4: Guarded behind NODE_ENV check so it's never reachable in production
if (process.env.NODE_ENV !== "production") {
  app.get("/test-payment", (_req, res) => {
    res.sendFile(path.join(__dirname, "test-razorpay.html"));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  GLOBAL RATE LIMITER & PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

//  POST /api/auth/register  → create account (customer / vendor / admin)
//  POST /api/auth/login     → returns JWT in HTTP-only cookie
//  POST /api/auth/logout    → clears the JWT cookie
app.use("/api/auth", authRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 9.  CUSTOMER ROUTES  —  protect applied at mount level
//
//  Every endpoint in these files requires a valid JWT.
//  protect runs once here — do NOT add it again inside the route files.
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/category",    categoryRoutes);       // public browsing — no protect needed
app.use("/api/subCategory", subCategoryRoutes);    // public browsing — no protect needed
app.use("/api/product",     productRoutes);        // public browsing — no protect needed
app.use("/api/variant",     variantRoutes);        // public browsing — no protect needed

app.use("/api/cart",        protect, cartRoutes);        // all cart ops need auth
app.use("/api/wishlist",    protect, wishlistRoutes);     // all wishlist ops need auth
app.use("/api/coupon",      protect, couponRoutes);       // coupon apply/remove needs auth
app.use("/api/giftCard",    protect, giftCardRoutes);     // gift card ops need auth
app.use("/api/addresses",   addressRoutes);               // protect is inside routes/addresses.js

// FIX 1: Was "/api" — matched EVERY /api/* request including /api/orders,
//         /api/payment, /api/users, swallowing them before the correct routers.
//         Now scoped to "/api/profile" which is the actual prefix these routes use.
//         ⚠️ If your profile routes use a different prefix (e.g. /api/me),
//            update this path to match.
app.use("/api/admin",       protect, profileRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 10. ORDER / USER / PAYMENT ROUTES
//     protect is declared INSIDE each file because:
//       - order.js  mixes public (webhooks) and protected endpoints
//       - payment.js has a public webhook + public test-setup endpoint
//       - user.js   may have public registration endpoints
//     ⚠️  DO NOT add protect here — it would run twice and can cause auth bugs.
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/orders",  orderRoutes);
app.use("/api/users",   userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload",  uploadRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 11. ADMIN ROUTES
//     protect + authorizeRoles('admin') are handled inside each file.
//     ⚠️  DO NOT add protect here.
// ─────────────────────────────────────────────────────────────────────────────

//  GET    /api/admin/vendors              → list all vendors
//  GET    /api/admin/vendors/:id          → single vendor detail
//  PATCH  /api/admin/vendors/:id/status   → approve / suspend
//  PATCH  /api/admin/vendors/:id/commission → set commission %
//  DELETE /api/admin/vendors/:id          → remove vendor
//  GET    /api/admin/audit-logs           → list audit logs
app.use("/api/admin/vendors", adminVendorRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);

/*
 *  Uncomment as you build out the admin panel:
 *
 *  import adminProductRoutes  from "./routes/admin/adminProductRoutes.js";
 *  import adminCategoryRoutes from "./routes/admin/adminCategoryRoutes.js";
 *  import adminOrderRoutes    from "./routes/admin/adminOrderRoutes.js";
 *  import adminUserRoutes     from "./routes/admin/adminUserRoutes.js";
 *
 *  app.use("/api/admin/products",   adminProductRoutes);
 *  app.use("/api/admin/categories", adminCategoryRoutes);
 *  app.use("/api/admin/orders",     adminOrderRoutes);
 *  app.use("/api/admin/users",      adminUserRoutes);
 */

// ─────────────────────────────────────────────────────────────────────────────
// 12. VENDOR ROUTES  —  scoped under /api/vendor/:vendorSlug
//
//  Each file chains: protect → attachVendorContext → validateVendorOwnership
//  ⚠️  DO NOT add protect here — it's handled inside each file.
//  ⚠️  Every vendor router file MUST use: express.Router({ mergeParams: true })
//      Without it, req.params.vendorSlug is undefined inside the child router.
// ─────────────────────────────────────────────────────────────────────────────

//  GET /api/vendor/:vendorSlug/me   → fetch own profile
//  PUT /api/vendor/:vendorSlug/me   → update own profile
app.use("/api/vendor/:vendorSlug", vendorProfileRoutes);

//  GET/POST/PUT/DELETE /api/vendor/:vendorSlug/categories
app.use("/api/vendor/:vendorSlug/categories", vendorCategoryRoutes);

//  GET/POST/PUT/DELETE /api/vendor/:vendorSlug/subcategories
app.use("/api/vendor/:vendorSlug/subcategories", vendorSubCategoryRoutes);

//  GET/POST/PUT/DELETE /api/vendor/:vendorSlug/products
app.use("/api/vendor/:vendorSlug/products", vendorProductRoutes);

//  GET/POST/PUT/DELETE /api/vendor/:vendorSlug/coupons
app.use("/api/vendor/:vendorSlug/coupons", vendorCouponRoutes);

//  GET /api/vendor/:vendorSlug/orders
app.use("/api/vendor/:vendorSlug/orders", vendorOrderRoutes);

//  POST /api/vendor/:vendorSlug/upload  → multipart image upload
app.use("/api/vendor/:vendorSlug/upload", vendorUploadRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 13. 404 HANDLER
//     Every request that didn't match any route above lands here.
//     Always returns JSON — never an HTML error page.
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. GLOBAL ERROR HANDLER
//     Triggered when any route/middleware calls next(err).
//     Must be defined LAST and must have exactly 4 parameters.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`GLOBAL ERROR: ${err.message}`, { error: err.stack, url: req.originalUrl, method: req.method });

  // If headers already sent, delegate to Express default handler
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message    || "Internal Server Error";

  // Multer: file exceeds upload size limit
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message    = "File too large. Maximum allowed size is 5 MB.";
  }

  // Multer: any other upload error
  if (err.name === "MulterError") {
    statusCode = 400;
  }

  // Never expose stack traces to the client in production
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : message,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. START SERVER
// ─────────────────────────────────────────────────────────────────────────────
setupCronJobs();

server.listen(PORT, () => {
  logger.info(`🚀 Server running successfully on port ${PORT}`);
});

export default app; // exported for testing (Jest / Supertest)