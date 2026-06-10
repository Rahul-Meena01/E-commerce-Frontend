
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import slugify from "slugify"; // npm i slugify
import User from "../models/User.js";
import Vendor from "../models/VendorSchema.js";

const router = express.Router();

// ─── Rate Limiters ───────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Try again after 15 minutes.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: "Too many registration attempts. Try again after 1 hour.",
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

/**
 * Builds the user payload included in every auth response.
 * vendorSlug is populated only for vendor-role users.
 * Frontend uses it to redirect: /vendor/:vendorSlug/dashboard
 */
const buildUserPayload = (user, vendor = null) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  vendorSlug: vendor?.slug ?? null, // null for admin and regular users
});

const sendAuthResponse = (res, statusCode, message, user, vendor = null) => {
  const token = createToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds 
  });

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    user: buildUserPayload(user, vendor), // include vendorSlug if applicable
  });
};

/**
 * Generates a unique slug from the shop name.
 * Appends a short random suffix if the base slug is already taken.
 * e.g. "Nike Store" → "nike-store" or "nike-store-x4f2"
 */
const generateUniqueSlug = async (shopName) => {
  const base = slugify(shopName, { lower: true, strict: true });
  const exists = await Vendor.findOne({ slug: base });
  if (!exists) return base;
  // suffix = first 4 chars of a random hex string
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base}-${suffix}`;
};

// ─── Routes ──────────────────────────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register a new customer user
// @access  Public
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (role === "vendor") {
      return res.status(400).json({
        success: false,
        message: "Vendors must use the /register-vendor endpoint",
      });
    }

    if (!name?.trim() || !email?.trim() || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and password are required",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered" });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      phone: phone?.trim() || "",
      role: role,
      status: "active", // default status for new users; admin can override to "active" or "deactive"
    });

    return sendAuthResponse(res, 201, "User registered successfully", newUser);
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});



// @route   POST /api/auth/register-admin
// @desc    Register a new admin (requires ADMIN_SECRET)
// @access  Private (secret key protected)
router.post("/register-admin", async (req, res) => {
  try {
    const { name, email, password, phone, secretKey } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !secretKey) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, password, and admin secret are required",
        });
    }

    console.log("Admin registration attempt with secret:", secretKey); // Debug log

    // Fail fast — check secret before any DB work
    if (secretKey !== process.env.ADMIN_SECRET) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid secret key" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered" });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      phone: phone?.trim() || "",
      role: "admin",
    });

    return sendAuthResponse(res, 201, "Admin registered successfully", newUser);
  } catch (error) {
    console.error("Register-admin error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// @route   POST /api/auth/register-vendor
// @desc    Register a new vendor (creates User + Vendor profile atomically)
// @access  Public
router.post("/register-vendor", registerLimiter, async (req, res) => {
  // Use a transaction so User and Vendor are always created together.
  // If either fails, both are rolled back — no orphaned documents.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, phone, shopName } = req.body;

    // ── Validate ────────────────────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !password || !shopName?.trim()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and shop name are required",
      });
    }

    if (password.length < 6) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    if (!phone?.trim()) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Phone number is required for vendors",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail }).session(session)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered" });
    }

    // ── Create User (role: vendor) ───────────────────────────────────────────
    const [user] = await User.create(
      [
        {
          name: name.trim(),
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10),
          phone: phone.trim(),
          role: "vendor",
        },
      ],
      { session },
    );

    // ── Create Vendor profile ────────────────────────────────────────────────
    const slug = await generateUniqueSlug(shopName.trim());

    const [vendor] = await Vendor.create(
      [
        {
          user: user._id,
          shopName: shopName.trim(),
          slug,
          status: "pending", // admin must approve before vendor can log in
        },
      ],
      { session },
    );

    // ── Back-link User → Vendor ──────────────────────────────────────────────
    user.vendorProfile = vendor._id;
    await user.save({ session });

    await session.commitTransaction();

    // Pending vendors get a response but no usable token yet.
    // They cannot access vendor routes until admin sets status → "active".
    return res.status(201).json({
      success: true,
      message:
        "Vendor registered successfully. Your account is pending admin approval.",
      vendor: {
        shopName: vendor.shopName,
        slug: vendor.slug,
        status: vendor.status,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Register-vendor error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
});

// @route   POST /api/auth/login
// @desc    Unified login for admin, vendor, and user
// @access  Public
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Single query works for all roles — everyone is in the User collection
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).populate("vendorProfile", "slug status shopName");

    // console.log("User found at login:", user);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    // Vendor-specific gate: block pending/suspended accounts at login
    if (user.role === "vendor") {
      const vendor = user.vendorProfile;

      if (!vendor) {
        // User has vendor role but no Vendor document — data integrity issue
        console.error(`Vendor profile missing for user ${user._id}`);
        return res
          .status(403)
          .json({
            success: false,
            message: "Vendor profile not found. Contact support.",
          });
      }

      if (vendor.status === "pending") {
        return res.status(403).json({
          success: false,
          message: "Your vendor account is pending approval.",
        });
      }

      if (vendor.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "Your vendor account has been suspended. Contact support.",
        });
      }

      // Active vendor: include vendor profile in response
      return sendAuthResponse(res, 200, "Login successful", user, vendor);
    }

    // Admin and regular users: no vendor context needed
    return sendAuthResponse(res, 200, "Login successful", user);
  } catch(error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear the auth cookie
// @access  Public
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

export default router;

//   id: user._id,
//   name: user.name,
//   email: user.email,
//   phone: user.phone,
//   role: user.role,
//   vendorSlug: vendor?.slug ?? null,
// });

// const sendAuthResponse = (res, statusCode, message, user, vendor = null) => {
//   const token = createToken(user);

//   res.cookie("token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
/*
 * Handover note: Authentication API.
 * Handles user registration, admin registration with ADMIN_SECRET,
 * vendor registration, unified login for all roles, JWT creation, and logout.
 */
// import express from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import mongoose from "mongoose";
// import rateLimit from "express-rate-limit";
// import slugify from "slugify";
// import User from "../models/User.js";
// import Vendor from "../models/VendorSchema.js";

// const router = express.Router();

// // ─── Rate Limiters ───────────────────────────────────────────────────────────

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: {
//     success: false,
//     message: "Too many login attempts. Try again after 15 minutes.",
//   },
// });

// const registerLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: process.env.NODE_ENV === "production" ? 10 : 1000,
//   handler: (req, res) => {           // ← YE ADD KARO
//     res.status(429).json({
//       success: false,
//       message: "Too many registration attempts. Try again after 1 hour.",
//     });
//   },
// });

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const createToken = (user) =>
//   jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
//     expiresIn: "7d",
//   });

// const buildUserPayload = (user, vendor = null) => ({
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });

//   return res.status(statusCode).json({
//     success: true,
//     message,
//     token,
//     user: buildUserPayload(user, vendor),
//   });
// };

// /**
//  * Generates a unique slug from the shop name.
//  * Runs OUTSIDE any transaction — slug uniqueness check is a read-only
//  * operation and does not need to be part of the write transaction.
//  * The Vendor.create inside the transaction will fail on a duplicate-key
//  * error if a race condition produces the same slug, which is the correct
//  * fallback behaviour.
//  */
// const generateUniqueSlug = async (shopName) => {
//   const base = slugify(shopName, { lower: true, strict: true });
//   const exists = await Vendor.findOne({ slug: base });
//   if (!exists) return base;
//   const suffix = Math.random().toString(16).slice(2, 6);
//   return `${base}-${suffix}`;
// };

// // ─── Routes ──────────────────────────────────────────────────────────────────

// // @route   POST /api/auth/register
// // @desc    Unified registration for user, vendor, and admin
// // @access  Public
// router.post("/register", registerLimiter, async (req, res) => {
//   try {
//     const { name, email, password, phone, role, secretKey, shopName } = req.body;

//     if (!name?.trim() || !email?.trim() || !password || !role) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, password, and role are required",
//       });
//     }

//     if (!["user", "vendor", "admin"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role specified",
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters",
//       });
//     }

//     if (role === "admin" && secretKey !== process.env.ADMIN_SECRET) {
//       return res.status(403).json({
//         success: false,
//         message: "Invalid admin secret key",
//       });
//     }

//     if (role === "vendor") {
//       if (!shopName?.trim()) {
//         return res.status(400).json({
//           success: false,
//           message: "Shop name is required for vendors",
//         });
//       }
//       if (!phone?.trim()) {
//         return res.status(400).json({
//           success: false,
//           message: "Phone number is required for vendors",
//         });
//       }
//     }

//     const normalizedEmail = email.trim().toLowerCase();
//     const existingUser = await User.findOne({ email: normalizedEmail });
//     if (existingUser) {
//       return res.status(409).json({ success: false, message: "Email is already registered" });
//     }

//     let newUser;
//     const hashedPassword = await bcrypt.hash(password, 10);

//     if (role === "vendor") {
//       // Use a transaction so User + Vendor are always created together.
//       // If either write fails, both are rolled back — no orphaned documents.
//       const slug = await generateUniqueSlug(shopName.trim());
//       const session = await mongoose.startSession();
//       session.startTransaction();
//       try {
//         const [createdUser] = await User.create(
//           [
//             {
//               name: name.trim(),
//               email: normalizedEmail,
//               password: hashedPassword,
//               phone: phone?.trim() || "",
//               role: "vendor",
//             },
//           ],
//           { session },
//         );

//         const [createdVendor] = await Vendor.create(
//           [
//             {
//               user: createdUser._id,
//               shopName: shopName.trim(),
//               slug,
//               status: "pending",
//             },
//           ],
//           { session },
//         );

//         createdUser.vendorProfile = createdVendor._id;
//         await createdUser.save({ session });

//         await session.commitTransaction();

//         return res.status(201).json({
//           success: true,
//           message: "Vendor registered successfully. Your account is pending admin approval.",
//           vendor: {
//             shopName: createdVendor.shopName,
//             slug: createdVendor.slug,
//             status: createdVendor.status,
//           },
//         });
//       } catch (err) {
//         await session.abortTransaction();
//         throw err;
//       } finally {
//         session.endSession();
//       }
//     } else {
//       newUser = await User.create({
//         name: name.trim(),
//         email: normalizedEmail,
//         password: hashedPassword,
//         phone: phone?.trim() || "",
//         role,
//       });
//       return sendAuthResponse(res, 201, `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`, newUser);
//     }
//   } catch (error) {
//     console.error("Register error:", error);
//     if (error?.code === 11000) {
//       const duplicateField = Object.keys(error.keyValue || {})[0];
//       const message = duplicateField === "email"
//           ? "Email is already registered"
//           : duplicateField === "slug"
//           ? "Shop name is already taken. Choose another."
//           : "Duplicate field value. Please use a different value.";
//       return res.status(409).json({ success: false, message });
//     }
//     return res.status(500).json({ success: false, message: error?.message || "Internal server error", stack: error?.stack });
//   }
// });

// // @route   POST /api/auth/login
// // @desc    Unified login for admin, vendor, and user
// // @access  Public
// router.post("/login", loginLimiter, async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email?.trim() || !password) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Email and password are required" });
//     }

//     const user = await User.findOne({
//       email: email.trim().toLowerCase(),
//     }).populate("vendorProfile", "slug status shopName");

//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     if (!(await bcrypt.compare(password, user.password))) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid password" });
//     }

//     if (user.role === "vendor") {
//       const vendor = user.vendorProfile;

//       if (!vendor) {
//         console.error(`Vendor profile missing for user ${user._id}`);
//         return res.status(403).json({
//           success: false,
//           message: "Vendor profile not found. Contact support.",
//         });
//       }

//       if (vendor.status === "pending") {
//         return res.status(403).json({
//           success: false,
//           message: "Your vendor account is pending approval.",
//         });
//       }

//       if (vendor.status === "suspended") {
//         return res.status(403).json({
//           success: false,
//           message: "Your vendor account has been suspended. Contact support.",
//         });
//       }

//       return sendAuthResponse(res, 200, "Login successful", user, vendor);
//     }

//     return sendAuthResponse(res, 200, "Login successful", user);
//   } catch (error) {
//     console.error("Login error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// });

// // @route   POST /api/auth/logout
// // @desc    Clear the auth cookie
// // @access  Public
// router.post("/logout", (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//   });
//   return res
//     .status(200)
//     .json({ success: true, message: "Logged out successfully" });
// });

// // @route   DELETE /api/auth/cleanup-orphaned-vendors
// // @desc    One-time utility: removes vendor-role User docs with no vendorProfile.
// //          Run once from a trusted admin client, then remove or gate behind ADMIN_SECRET.
// // @access  Protected by ADMIN_SECRET header
// router.delete("/cleanup-orphaned-vendors", async (req, res) => {
//   if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
//     return res.status(403).json({ success: false, message: "Forbidden" });
//   }
//   try {
//     const result = await User.deleteMany({
//       role: "vendor",
//       vendorProfile: null,
//     });
//     return res.status(200).json({
//       success: true,
//       message: `Deleted ${result.deletedCount} orphaned vendor user(s).`,
//     });
//   } catch (error) {
//     console.error("Cleanup error:", error);
//     return res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// export default router;



/*
 * Handover note: Authentication API.
 * Handles user registration, admin registration with ADMIN_SECRET,
 * vendor registration, unified login for all roles, JWT creation, and logout.
 */
