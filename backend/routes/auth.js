
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
