import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import slugify from "slugify"; // npm i slugify
import { sendWelcomeEmail } from "../services/emailService.js";
import User from "../models/User.js";
import Vendor from "../models/VendorSchema.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, registerVendorSchema } from "../middleware/schemas.js";

const router = express.Router();

// ─── Rate Limiters ───────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Try again after 1 minute.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: "Too many registration attempts. Try again after 1 minute.",
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

const createRefreshToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
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
  profileImage: user.profileImage,
  location: user.location,
  bio: user.bio,
  createdAt: user.createdAt,
  vendorSlug: vendor?.slug ?? null, // null for admin and regular users
});

const sendAuthResponse = (res, statusCode, message, user, vendor = null) => {
  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
router.post("/register", registerLimiter, validate(registerSchema), async (req, res) => {
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

    // Send welcome email asynchronously without blocking response
    sendWelcomeEmail(newUser).catch(err => console.error("Welcome email failed", err));

    return sendAuthResponse(res, 201, "User registered successfully", newUser);
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});


// @route   POST /api/auth/register-vendor
// @desc    Register a new vendor (creates User + Vendor profile atomically)
// @access  Public
router.post("/register-vendor", registerLimiter, validate(registerVendorSchema), async (req, res) => {
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
router.post("/login", loginLimiter, validate(loginSchema), async (req, res) => {
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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({ success: true, message: "If the email is registered, a reset link will be sent." });
    }

    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Send email
    // In a real app, this should be the frontend URL
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please go to this link to reset your password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link will expire in 10 minutes.</p>
    `;

    try {
      const { default: sendEmail } = await import("../services/emailService.js");
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: message,
      });

      res.status(200).json({ success: true, message: "If the email is registered, a reset link will be sent." });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Email could not be sent:", err);
      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post("/reset-password/:token", async (req, res) => {
  try {
    const crypto = await import("crypto");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
import { protect } from "../middleware/authMiddleware.js";
import { v2 as cloudinary } from "cloudinary";

router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, email, phone, location, bio, image } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;

    if (image && image.startsWith("data:image")) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "ecommerce_users",
      });
      user.profileImage = uploadResponse.secure_url;
    } else if (image) {
      user.profileImage = image;
    }

    await user.save();
    
    // Vendor handling for user payload
    let vendor = null;
    if (user.role === "vendor" && user.vendorProfile) {
      vendor = await Vendor.findById(user.vendorProfile);
    }

    res.json({ success: true, user: buildUserPayload(user, vendor) });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post("/logout", (req, res) => {
  // TODO: Future Phase - Extract access token and blacklist its 'jti' in Redis
  res.clearCookie("token");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.status === "deactive") {
      return res.status(401).json({ success: false, message: "Invalid user account" });
    }

    const newAccessToken = createAccessToken(user);
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    
    return res.json({ success: true, token: newAccessToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
});

export default router;
