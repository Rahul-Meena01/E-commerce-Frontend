/*
 * ============================================================
 *  server.js  —  Main Express Application Entry Point
 * ============================================================
 *
 *  This is the SINGLE file that boots the entire backend.
 *  Every request that hits the server starts here.
 *
 *  What this file does (in order):
 *    1. Loads environment variables from .env
 *    2. Creates the Express app
 *    3. Connects to MongoDB
 *    4. Registers core middleware (CORS, JSON parser, cookies, static files)
 *    5. Mounts all route groups  ← the "table of contents" for your API
 *    6. Registers a 404 handler for unknown routes
 *    7. Registers a global error handler for uncaught errors
 *    8. Starts the HTTP server
 *
 * ─── API namespace overview ───────────────────────────────────────────────────
 *
 *  PUBLIC (no token required)
 *    POST   /api/auth/register          → register any user (customer / vendor / admin)
 *    POST   /api/auth/login             → login, returns JWT in HTTP-only cookie
 *    POST   /api/auth/logout            → clears the auth cookie
 *
 *  CUSTOMER routes (token required — protect middleware)
 *    /api/category          → browse categories
 *    /api/subCategory       → browse sub-categories
 *    /api/product           → browse products
 *    /api/variant           → product variants
 *    /api/cart              → shopping cart CRUD
 *    /api/coupon            → validate/apply coupons
 *    /api/giftCard          → gift cards
 *    /api/orders            → place & track orders  (protect lives inside the file)
 *    /api/users             → user account actions  (protect lives inside the file)
 *    /api/*profile*         → user profile          (protect lives inside the file)
 *
 *  ADMIN routes  (token + role:"admin" required — handled inside each file)
 *    /api/admin/vendors     → list, approve, suspend, set commission, delete vendors
 *    — your other admin routes go here (products, categories, orders, users …)
 *
 *  VENDOR routes  (token + role:"vendor" + slug ownership — handled inside each file)
 *    /api/vendor/:vendorSlug/me             → vendor profile  (GET / PUT)
 *    /api/vendor/:vendorSlug/categories     → vendor-owned category CRUD
 *    /api/vendor/:vendorSlug/subcategories  → vendor-owned sub-category CRUD
 *    /api/vendor/:vendorSlug/products       → vendor-owned product CRUD
 *    /api/vendor/:vendorSlug/coupons        → vendor-owned coupon CRUD
 *
 * ─── Why :vendorSlug is in the URL ───────────────────────────────────────────
 *  It creates human-readable, bookmarkable URLs:
 *    /vendor/nike-store/products
 *    /vendor/adidas-official/coupons
 *  It is also validated server-side inside vendorMiddleware so that
 *  vendor A can NEVER touch vendor B's data even if they have a valid token.
 *
 * ─── mergeParams: true ───────────────────────────────────────────────────────
 *  All vendor router files use { mergeParams: true } when created with
 *  express.Router(). Without it, req.params.vendorSlug would be undefined
 *  inside the child router. Keep that setting whenever you add a new vendor file.
 *
 * ─── protect vs. internal protection ────────────────────────────────────────
 *  Some routes apply the `protect` middleware HERE at mount level (e.g. /api/cart).
 *  Others (e.g. /api/orders, all vendor/* and admin/* routes) handle their own
 *  protection internally — don't add protect at mount level for those or the
 *  middleware will execute twice per request.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1.  ENVIRONMENT VARIABLES
//     Must be the very first thing so every import that follows can read them.
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config"; // auto-reads .env from the project root

// ─────────────────────────────────────────────────────────────────────────────
// 2.  CORE DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";

// ─────────────────────────────────────────────────────────────────────────────
// 3.  LOCAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

// connectDB  → opens the Mongoose connection to MongoDB Atlas (or local)
import connectDB from "./config/db.js";

// protect  → JWT middleware; reads the token from the cookie, verifies it,
//            and attaches the decoded user to req.user
//            Used at mount level for routes whose EVERY endpoint needs auth.
import { protect } from "./middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// 4.  ROUTE IMPORTS  —  existing admin / customer routes
// ─────────────────────────────────────────────────────────────────────────────

// Auth — public endpoints (register, login, logout)
import authRoutes        from "./routes/auth.js";

// Customer-facing feature routes
import categoryRoutes    from "./routes/category.js";
import subCategoryRoutes from "./routes/subCategory.js";
import productRoutes     from "./routes/product.js";
import cartRoutes        from "./routes/cart.js";
import wishlistRoutes    from "./routes/wishlist.js";
import couponRoutes      from "./routes/coupon.js";
import variantRoutes     from "./routes/variant.js";
import profileRoutes     from "./routes/profile.js";
import giftCardRoutes    from "./routes/giftCard.js";

// Order & user routes — protect is declared INSIDE these files, not here
import orderRoutes       from "./routes/order.js";
import userRoutes        from "./routes/user.js";
import paymentRoutes, { stripeWebhookHandler } from "./modules/payment/payment.routes.js";

// ─────────────────────────────────────────────────────────────────────────────
// 5.  ROUTE IMPORTS  —  NEW vendor & admin-vendor routes
// ─────────────────────────────────────────────────────────────────────────────

// Admin: list, approve, suspend, set commission, delete vendors
//   All endpoints inside this file are protected by authorizeRoles('admin').
import adminVendorRoutes from "./routes/adminVendorRoutes.js";

// Vendor: each file handles its own protect + attachVendorContext + validateVendorOwnership
//   so we do NOT wrap them in protect here at mount level.
import vendorProfileRoutes     from "./routes/vendor/vendorProfileRoutes.js";
import vendorCategoryRoutes    from "./routes/vendor/vendorCategoryRoutes.js";
import vendorSubCategoryRoutes from "./routes/vendor/vendorSubCategoryRoutes.js";
import vendorProductRoutes     from "./routes/vendor/vendorProductRoutes.js";
import vendorCouponRoutes      from "./routes/vendor/vendorCouponRoutes.js";
import vendorOrderRoutes       from "./routes/vendor/vendorOrderRoutes.js";
import vendorUploadRoutes from "./routes/vendor/vendorUploadRoutes.js";

// ─────────────────────────────────────────────────────────────────────────────
// 6.  APP INITIALISATION
// ─────────────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// Build the list of allowed frontend origins from .env (supports comma-separated values)
// Example .env:  CLIENT_URL=http://localhost:5173,https://mystore.com
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// 7.  DATABASE CONNECTION
//     Connects before middleware/routes are reached during startup.
// ─────────────────────────────────────────────────────────────────────────────
connectDB();

// ─────────────────────────────────────────────────────────────────────────────
// 8.  CORE MIDDLEWARE
//     Middleware runs in the ORDER it is registered.
//     Every request passes through all of these before hitting a route.
// ─────────────────────────────────────────────────────────────────────────────

// ── 8a. CORS ─────────────────────────────────────────────────────────────────
//  Tells the browser which origins may call this API.
//  `credentials: true` is required when the frontend sends cookies cross-origin.
app.use(
  cors({
    origin(origin, callback) {
      // Allow Postman / mobile apps / curl — they send no Origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Block anything else
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,                                        // allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Stripe webhook requires raw body for signature verification - must be BEFORE express.json()
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

// ── 8b. Body parsers ──────────────────────────────────────────────────────────
// JSON bodies  →  e.g. { "name": "Nike Store" }  →  req.body
app.use(express.json());

// URL-encoded bodies  →  e.g. HTML form submissions  →  req.body
app.use(express.urlencoded({ extended: true }));

// ── 8c. Cookie parser ─────────────────────────────────────────────────────────
// Parses the Cookie header so we can read/clear the JWT cookie
app.use(cookieParser());

// ── 8d. Static file serving ───────────────────────────────────────────────────
// Files inside /uploads are served publicly (product images, vendor logos, etc.)
//   GET /uploads/products/image.jpg  →  ./uploads/products/image.jpg on disk
app.use("/uploads", express.static("uploads"));

// Serve the built React/Vite frontend (only relevant if you do SSR or same-origin deploy)
app.use(express.static("frontend"));

// ─────────────────────────────────────────────────────────────────────────────
// 9.  HEALTH CHECK ROUTE
//     Quick way to verify the server is alive. Hit GET / in Postman or browser.
// ─────────────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ success: true, message: "API running successfully 🚀" });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. PUBLIC ROUTES  —  no token needed
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
//  POST /api/auth/register  →  create account (customer / vendor / admin)
//  POST /api/auth/login     →  get JWT cookie
//  POST /api/auth/logout    →  clear JWT cookie

// ─────────────────────────────────────────────────────────────────────────────
// 11. CUSTOMER / SHARED ROUTES  —  protect applied at mount level
//     Every single endpoint inside these files requires a valid JWT.
//     You do NOT need to add protect again inside the route files.
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/category",    categoryRoutes);
app.use("/api/subCategory", subCategoryRoutes);
app.use("/api/product",     productRoutes);
app.use("/api/variant",     variantRoutes);
app.use("/api/cart",        protect, cartRoutes);
app.use("/api/wishlist",    protect, wishlistRoutes);
app.use("/api/coupon",      protect, couponRoutes);
app.use("/api/giftCard",    protect, giftCardRoutes);
app.use("/api",             protect, profileRoutes); // handles /api/profile, /api/me, etc.


// ─────────────────────────────────────────────────────────────────────────────
// 12. ORDER & USER ROUTES  —  protect lives INSIDE the route files
//     ⚠️  DO NOT add protect here at mount level.
//     Each route inside these files already calls protect (and 'admin' where needed).
//     Applying protect twice causes double JWT verification and potential auth bugs.
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api/orders", orderRoutes);
app.use("/api/users",  userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 13. ADMIN ROUTES  —  protect + authorizeRoles('admin') live inside each file
//     ⚠️  Do NOT add protect here; it is handled per-route inside the file.
// ─────────────────────────────────────────────────────────────────────────────

// Vendor management by admin
//   GET    /api/admin/vendors            → list all vendors (pending/approved/suspended)
//   GET    /api/admin/vendors/:id        → single vendor detail
//   PATCH  /api/admin/vendors/:id/status → approve or suspend a vendor
//   PATCH  /api/admin/vendors/:id/commission → set vendor commission %
//   DELETE /api/admin/vendors/:id        → remove vendor
app.use("/api/admin/vendors", adminVendorRoutes);

/*
 *  ── Uncomment as you build out the rest of your admin panel ──────────────────
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
// 14. VENDOR ROUTES  —  scoped under /api/vendor/:vendorSlug
//
//     The :vendorSlug URL segment acts as the vendor's unique namespace.
//     Example:  /api/vendor/nike-store/products
//               /api/vendor/adidas-official/coupons
//
//     Each vendor route file internally chains:
//       protect  →  attachVendorContext  →  validateVendorOwnership  →  controller
//
//     ⚠️  IMPORTANT — mergeParams: true
//         Every vendor router file must be created with:
//           const router = express.Router({ mergeParams: true });
//         Without it, req.params.vendorSlug is undefined inside the child router.
//
//     ⚠️  DO NOT add protect here at mount level — it's handled inside each file.
// ─────────────────────────────────────────────────────────────────────────────

// Vendor profile
//   GET /api/vendor/:vendorSlug/me   → fetch vendor's own profile
//   PUT /api/vendor/:vendorSlug/me   → update vendor's own profile
app.use("/api/vendor/:vendorSlug", vendorProfileRoutes);

// Vendor categories
//   GET    /api/vendor/:vendorSlug/categories
//   POST   /api/vendor/:vendorSlug/categories
//   PUT    /api/vendor/:vendorSlug/categories/:id
//   DELETE /api/vendor/:vendorSlug/categories/:id
app.use("/api/vendor/:vendorSlug/categories", vendorCategoryRoutes);

// Vendor sub-categories
//   GET    /api/vendor/:vendorSlug/subcategories
//   POST   /api/vendor/:vendorSlug/subcategories
//   PUT    /api/vendor/:vendorSlug/subcategories/:id
//   DELETE /api/vendor/:vendorSlug/subcategories/:id
app.use("/api/vendor/:vendorSlug/subcategories", vendorSubCategoryRoutes);

// Vendor products
//   GET    /api/vendor/:vendorSlug/products
//   POST   /api/vendor/:vendorSlug/products
//   PUT    /api/vendor/:vendorSlug/products/:id
//   DELETE /api/vendor/:vendorSlug/products/:id
app.use("/api/vendor/:vendorSlug/products", vendorProductRoutes);

// Vendor coupons
//   GET    /api/vendor/:vendorSlug/coupons
//   POST   /api/vendor/:vendorSlug/coupons
//   PUT    /api/vendor/:vendorSlug/coupons/:id
//   DELETE /api/vendor/:vendorSlug/coupons/:id
app.use("/api/vendor/:vendorSlug/coupons", vendorCouponRoutes);

// Vendor orders
//   GET    /api/vendor/:vendorSlug/orders
app.use("/api/vendor/:vendorSlug/orders", vendorOrderRoutes);

 
// Image upload: POST /api/vendor/:vendorSlug/upload
// Accepts multipart/form-data with field name "image"
// Returns: { success: true, url: "/uploads/filename.jpg" }
app.use("/api/vendor/:vendorSlug/upload", vendorUploadRoutes);      

// ─────────────────────────────────────────────────────────────────────────────
// 15. 404 HANDLER
//     Catches every request that didn't match any route above.
//     Keeps the API consistent — always returns JSON, never an HTML error page.
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. GLOBAL ERROR HANDLER
//     Triggered whenever a controller or middleware calls next(err) with an error.
//     Must be defined LAST and must have exactly 4 parameters (err, req, res, next).
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  // If response headers were already sent (e.g. during streaming), delegate to Express default handler
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message    || "Internal Server Error";

  // Multer: file exceeds upload size limit
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message    = "File too large. Maximum allowed size is 5 MB.";
  }

  // Multer: any other upload-related error
  if (err.name === "MulterError") {
    statusCode = 400;
  }

  // Never leak internal stack traces to the client in production
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : message,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. START THE SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🚀  Server running successfully        ║
║   🌍  http://localhost:${PORT}              ║
╚══════════════════════════════════════════╝
  `);
});

export default app; // exported for testing frameworks (Jest / Supertest)

// /*
//  * Backend Application Entry
//  * Fully corrected version with:
//  * ✅ Proper CORS
//  * ✅ JWT auth support
//  * ✅ Cookie support
//  * ✅ Protected routes
//  * ✅ Static uploads
//  * ✅ Global error handling
//  * ✅ Order routes fixed
//  * ✅ No duplicate middleware execution
//  */

// import "dotenv/config";
// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";

// // ─────────────────────────────────────────────────────────────
// // LOCAL IMPORTS
// // ─────────────────────────────────────────────────────────────
// import connectDB from "./config/db.js";
// import { protect } from "./middleware/authMiddleware.js";

// // Routes
// import authRoutes from "./routes/auth.js";
// import categoryRoutes from "./routes/category.js";
// import subCategoryRoutes from "./routes/subCategory.js";
// import productRoutes from "./routes/product.js";
// import cartRoutes from "./routes/cart.js";
// import couponRoutes from "./routes/coupon.js";
// import variantRoutes from "./routes/variant.js";
// import profileRoutes from "./routes/profile.js";
// import giftCardRoutes from "./routes/giftCard.js";
// import orderRoutes from "./routes/order.js";
// import userRoutes from "./routes/user.js";

// // ─────────────────────────────────────────────────────────────
// // CONFIG
// // ─────────────────────────────────────────────────────────────
// dotenv.config();

// const app = express();

// const port = process.env.PORT || 3000;

// // Frontend URLs allowed
// const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
//   .split(",")
//   .map((origin) => origin.trim())
//   .filter(Boolean);

// // ─────────────────────────────────────────────────────────────
// // DATABASE
// // ─────────────────────────────────────────────────────────────
// connectDB();

// // ─────────────────────────────────────────────────────────────
// // MIDDLEWARE
// // ─────────────────────────────────────────────────────────────

// // ✅ CORS FIXED (Allows localhost:5174 via .env)
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow Postman/mobile/curl/no-origin requests
//       if (!origin) {
//         return callback(null, true);
//       }

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(new Error(`CORS blocked for origin: ${origin}`));
//     },

//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// );

// // ✅ BODY PARSERS
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // ✅ COOKIE PARSER
// app.use(cookieParser());

// // ✅ STATIC FOLDERS
// app.use("/uploads", express.static("uploads"));
// app.use(express.static("frontend"));

// // ─────────────────────────────────────────────────────────────
// // ROUTES
// // ─────────────────────────────────────────────────────────────

// // PUBLIC
// app.use("/api/auth", authRoutes);

// // PROTECTED
// app.use("/api/category", protect, categoryRoutes);
// app.use("/api/subCategory", protect, subCategoryRoutes);
// app.use("/api/product", protect, productRoutes);
// app.use("/api/variant", protect, variantRoutes);
// app.use("/api/cart", protect, cartRoutes);
// app.use("/api/coupon", protect, couponRoutes);
// app.use("/api", protect, profileRoutes);
// app.use("/api/giftCard", protect, giftCardRoutes);

// /*
//  * IMPORTANT:
//  * Order routes already use protect/admin
//  * inside routes/order.js
//  *
//  * DO NOT APPLY protect HERE AGAIN
//  */
// app.use("/api/orders", orderRoutes);
// app.use("/api/users", userRoutes);

// // ─────────────────────────────────────────────────────────────
// // TEST ROUTE
// // ─────────────────────────────────────────────────────────────
// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "API Running Successfully",
//   });
// });

// // ─────────────────────────────────────────────────────────────
// // GLOBAL ERROR HANDLER
// // ─────────────────────────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error("GLOBAL ERROR:", err);

//   // If headers already sent
//   if (res.headersSent) {
//     return next(err);
//   }

//   let statusCode = err.statusCode || err.status || 500;

//   let message = err.message || "Internal Server Error";

//   // Multer file size error
//   if (err.code === "LIMIT_FILE_SIZE") {
//     statusCode = 400;
//     message = "File too large. Maximum size is 5MB.";
//   }

//   // Multer generic
//   if (err.name === "MulterError") {
//     statusCode = 400;
//   }

//   return res.status(statusCode).json({
//     success: false,
//     message: statusCode === 500 ? "Internal Server Error" : message,
//   });
// });

// // ─────────────────────────────────────────────────────────────
// // START SERVER
// // ─────────────────────────────────────────────────────────────
// app.listen(port, () => {
//   console.log(`
// ========================================
// 🚀 Server running successfully
// 🌍 PORT: ${port}
// ========================================
// `);
// });