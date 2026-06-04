// backend/modules/auth/auth.controller.js
import env from "../../config/env.js";
import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: env.IS_PRODUCTION ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res
    .cookie("token", result.token, cookieOptions)
    .status(201)
    .json({
      success: true,
      message: "User registered successfully",
      data: result.userObject,
      token: result.token,
      user: result.userObject,
    });
});

export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone, secretKey } = req.body;
  const result = await authService.registerUser({
    name,
    email,
    password,
    phone,
    adminSecret: secretKey,
  });
  res
    .cookie("token", result.token, cookieOptions)
    .status(201)
    .json({
      success: true,
      message: "Admin registered successfully",
      data: result.userObject,
      token: result.token,
      user: result.userObject,
    });
});

export const registerVendor = asyncHandler(async (req, res) => {
  const result = await authService.registerVendorUser(req.body);
  res.status(201).json({
    success: true,
    message: "Vendor registered successfully. Your account is pending admin approval.",
    vendor: result.vendorObject,
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res
    .cookie("token", result.token, cookieOptions)
    .status(200)
    .json({
      success: true,
      message: "Login successful",
      data: result.userObject,
      token: result.token,
      user: result.userObject,
    });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser();
  res.clearCookie("token", {
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
    user: updatedUser,
  });
});
