/*
 * Handover note:
 * Authentication & authorization middleware.
 *
 * Features:
 *  - Supports Bearer token and cookie token
 *  - Verifies JWT
 *  - Fetches full user from DB
 *  - Attaches clean req.user object
 *  - Admin role protection
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import env from "../config/env.js";

// ─────────────────────────────────────────────────────────────
// Protect Routes Middleware
// ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Support BOTH:
    // 1. Authorization: Bearer TOKEN
    // 2. Cookie token
    const token =
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null) || req.cookies?.token;

    // No token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch user from DB
    const user = await User.findById(decoded.id).select("-password");

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;
    req.user.isAdmin = user.role === "admin";

    next();
  } catch (error) {
    console.error("JWT Verify Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// Admin Middleware
// ─────────────────────────────────────────────────────────────
const admin = (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Not authorized as admin",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }

    next();
  };
};

const requireAuth = authorizeRoles;

export { protect, admin, authorizeRoles, requireAuth };

// /*
//  * Handover note: Main authorization middleware used by server.js.
//  * protect validates the JWT and exposes the logged-in user on req.user;
//  * admin checks req.user.role before admin-only handlers such as order management.
//  */
// import jwt from "jsonwebtoken";

// const protect = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   // Support both cookie and Bearer token
//   const token =
//     (authHeader && authHeader.startsWith("Bearer ")
//       ? authHeader.split(" ")[1] // ✅ Fixed: was split(" ") with no index
//       : null) || req.cookies?.token;

//   if (!token) {
//     return res.status(401).json({
//       success: false,
//       message: "No token provided",
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ Now a string
//     req.user = decoded;
//     return next();
//   } catch (error) {
//     console.error("JWT verify error:", error.message); // ✅ Log errors
//     return res.status(401).json({
//       success: false,
//       message: "Invalid token",
//     });
//   }
// };

// const admin = (req, res, next) => {
//   if (req.user && req.user.role === "admin") {
//     next();
//   } else {
//     return res.status(403).json({
//       success: false,
//       message: "Not authorized as an admin",
//     });
//   }
// };

// export { protect, admin };
