/*
 * middleware/authMiddleware.js
 *
 * Authentication & Authorization middleware.
 * Every protected route in this app passes through one or more of these.
 *
 * ─── What's in this file ─────────────────────────────────────────────────────
 *
 *   protect          → Verifies the JWT, fetches the user from DB, attaches
 *                      the full user object to req.user.
 *                      Must run FIRST on any protected route.
 *
 *   admin            → Legacy role check. Confirms req.user.role === "admin".
 *                      Still used by existing order/user routes — do not remove.
 *
 *   authorizeRoles   → Flexible role guard. Accepts one or more role strings.
 *                      Use this for ALL new routes (vendor, admin, future roles).
 *                      Must run AFTER protect.
 *
 * ─── Typical middleware chain ─────────────────────────────────────────────────
 *
 *   Admin route:
 *     protect → authorizeRoles("admin") → controller
 *
 *   Vendor route:
 *     protect → authorizeRoles("vendor") → attachVendorContext → validateVendorOwnership → controller
 *
 *   Route open to both admin and vendor:
 *     protect → authorizeRoles("admin", "vendor") → controller
 *
 * ─── Token sources (in priority order) ───────────────────────────────────────
 *   1. Authorization header:  Authorization: Bearer <token>
 *   2. HTTP-only cookie:      token=<token>  (set by /api/auth/login)
 */
/*
 * middleware/authMiddleware.js
 *
 * Authentication & Authorization middleware.
 * Every protected route in this app passes through one or more of these.
 *
 * ─── What's in this file ─────────────────────────────────────────────────────
 *
 *   protect          → Verifies the JWT, fetches the user from DB, attaches
 *                      the full user object to req.user.
 *                      Must run FIRST on any protected route.
 *
 *   admin            → Legacy role check. Confirms req.user.role === "admin".
 *                      Still used by existing order/user routes — do not remove.
 *
 *   authorizeRoles   → Flexible role guard. Accepts one or more role strings.
 *   requireAuth        Both names are exported and point to the same function.
 *                      Use either in your route files — both work.
 *                      Must run AFTER protect.
 *
 * ─── Typical middleware chain ─────────────────────────────────────────────────
 *
 *   Admin route:
 *     protect → authorizeRoles("admin") → controller
 *
 *   Vendor route:
 *     protect → authorizeRoles("vendor") → attachVendorContext → controller
 *
 *   Route open to both admin and vendor:
 *     protect → authorizeRoles("admin", "vendor") → controller
 *
 * ─── Token sources (in priority order) ───────────────────────────────────────
 *   1. Authorization header:  Authorization: Bearer <token>
 *   2. HTTP-only cookie:      token=<token>  (set by /api/auth/login)
 *
 * ─── Common errors this file resolves ────────────────────────────────────────
 *   • "authorizeRoles is not a function" → was never exported; now it is.
 *   • "Internal Server Error" on register → caused by importing a missing
 *     export which made the route handler throw before any response was sent.
 *   • "Unexpected end of JSON input" → server was returning an HTML error page
 *     because middleware crashed silently; proper exports fix this.
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// protect
// Verifies the JWT and attaches the full user document to req.user.
// Any middleware or controller that runs after this can safely read req.user.
// ─────────────────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Read token from Authorization header first, fall back to cookie.
    // Supports both API clients (Bearer token) and browser clients (cookie).
    const token =
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) ?? req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please log in.",
      });
    }

    // Decode and verify the token using the secret from .env
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Distinguish between expired vs tampered tokens for clearer error messages
      const message =
        jwtError.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token. Please log in again.";
      return res.status(401).json({ success: false, message });
    }

    // Fetch the full user from DB so req.user has the latest role, status, etc.
    // Exclude the password field — never expose it downstream.
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      // Token was valid but the user no longer exists (e.g. account deleted)
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
    }

    // Optional: block deactivated/banned accounts at the middleware level.
    // Uncomment if your User model has an isActive field.
    // if (user.isActive === false) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Your account has been deactivated. Contact support.",
    //   });
    // }

    // Attach the user to the request — available in every middleware/controller after this
    req.user = user;
    next();
  } catch (error) {
    console.error("protect middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication check failed. Please try again.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// admin  (legacy — kept for backward compatibility)
// Checks that req.user.role === "admin".
// Still used by existing routes/order.js and routes/user.js.
// For all NEW routes, use authorizeRoles("admin") instead.
// ─────────────────────────────────────────────────────────────────────────────
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admins only.",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// authorizeRoles / requireAuth  ← BOTH NAMES EXPORTED (see note below)
//
// A flexible, reusable role guard.
// Pass one or more allowed role strings — the user must have at least one.
// MUST run after protect (needs req.user to be set).
//
// ──────────────────────────────────────────────────────────────────────────────
// ⚠️  ROOT CAUSE OF "Internal Server Error" + "email already registered" bugs:
//
//   The file header documented the export name as "authorizeRoles" but the
//   actual export was "requireAuth". Any route file that did:
//
//     import { authorizeRoles } from "../middleware/authMiddleware.js"
//
//   would get `undefined`. When Express tried to call that undefined value as
//   a middleware function it threw a TypeError, which Express caught and
//   converted to a 500 HTML page. The frontend then tried .json() on that
//   HTML response → "Unexpected end of JSON input".
//
//   Because this crash happened before the controller ran, the register
//   endpoint never executed — which is why the email was never saved to DB,
//   yet on retry the same error appeared (not "already registered").
//
//   Fix: export the function under BOTH names so either import works.
// ──────────────────────────────────────────────────────────────────────────────
//
// Examples:
//   authorizeRoles("admin")            → only admins
//   authorizeRoles("vendor")           → only vendors
//   authorizeRoles("admin", "vendor")  → admins OR vendors
// ─────────────────────────────────────────────────────────────────────────────
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Should never happen if protect ran first, but guard anyway
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Run protect middleware before authorizeRoles.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

// requireAuth is the same function — exported under both names so both
// import styles work without any route file changes.
const requireAuth = authorizeRoles;

export { protect, admin, authorizeRoles, requireAuth };

// /*
//  * Handover note:
//  * Authentication & authorization middleware.
//  *
//  * Features:
//  *  - Supports Bearer token and cookie token
//  *  - Verifies JWT
//  *  - Fetches full user from DB
//  *  - Attaches clean req.user object
//  *  - Admin role protection
//  */

// import jwt from "jsonwebtoken";
// import User from "../models/User.js";

// // ─────────────────────────────────────────────────────────────
// // Protect Routes Middleware
// // ─────────────────────────────────────────────────────────────
// const protect = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     // Support BOTH:
//     // 1. Authorization: Bearer TOKEN
//     // 2. Cookie token
//     const token =
//       (authHeader && authHeader.startsWith("Bearer ")
//         ? authHeader.split(" ")[1]
//         : null) || req.cookies?.token;

//     // No token
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "No token provided",
//       });
//     }

//     // Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Fetch user from DB
//     const user = await User.findById(decoded.id).select("-password");

//     // User not found
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Attach user to request
//     req.user = user;

//     next();
//   } catch (error) {
//     console.error("JWT Verify Error:", error.message);

//     return res.status(401).json({
//       success: false,
//       message: "Invalid token",
//     });
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // Admin Middleware
// // ─────────────────────────────────────────────────────────────
// const admin = (req, res, next) => {
//   try {
//     if (req.user && req.user.role === "admin") {
//       return next();
//     }

//     return res.status(403).json({
//       success: false,
//       message: "Not authorized as admin",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export { protect, admin };
