/*
 * Handover note: Admin profile API.
 * Reads and updates the logged-in admin profile, including optional profile image upload via multer.
 */
// const express = require('express');
// const bcrypt = require('bcryptjs');
// const upload = require('../middleware/upload');
// const User = require('../models/User');

// const router = express.Router();

import express from "express";
import bcrypt from "bcryptjs";
import upload from "../middleware/upload.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select('-password');

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authenticated as admin',
      });
    }

    res.json({
      success: true,
      profile: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.put('/profile', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authenticated as admin',
      });
    }

    const {
      name,
      email,
      phone,
      currentPassword,
      newPassword,
      confirmPassword,
      profileImage,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (email !== admin.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use',
        });
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password',
        });
      }

      const validPass = await bcrypt.compare(currentPassword, admin.password);
      if (!validPass) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation do not match',
        });
      }

      admin.password = await bcrypt.hash(newPassword, 10);
    }

    admin.name = name.trim();
    admin.email = email.trim().toLowerCase();
    admin.phone = phone?.trim() || '';

    if (req.file) {
      admin.profileImage = req.file.path;
    } else if (profileImage !== undefined) {
      admin.profileImage = profileImage;
    }

    await admin.save();

    const profile = admin.toObject();
    delete profile.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// module.exports = router;
export default router;