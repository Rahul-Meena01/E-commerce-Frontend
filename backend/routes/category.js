/*
 * Handover note: Category API.
 * Admin CRUD endpoints manage categories; public/all returns active categories for user-facing catalog pages.
 */
// const express = require("express");
// const router = express.Router();
// const Category = require("../models/Category");
// const SubCategory = require("../models/SubCategory");

import express from "express";
import Category from "../models/Category.js";
import SubCategory from "../models/SubCategory.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create category
router.post("/create", protect, admin, async (req, res) => {
  try {
    const { name, slug, status } = req.body;

    const category = new Category({
      name,
      slug,
      status,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created Successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all categories
router.get("/all", protect, admin, async (req, res) => {
  try {
    const categories = await Category.find();

    res.status(200).json({
      success: true,
      message: "Data loaded successfully",
      data : categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/public/all", async (req, res) => {
  try {
    const categories = await Category.find({ status: "Active" });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET public categories root path
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ status: "Active" });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET subcategories by parent category ID
router.get("/:categoryId/subcategories", async (req, res) => {
  try {
    const subCategories = await SubCategory.find({
      parentCategory: req.params.categoryId,
      status: "Active",
    }).populate("parentCategory");
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET subcategories by parent category ID (alias /sub)
router.get("/:categoryId/sub", async (req, res) => {
  try {
    const subCategories = await SubCategory.find({
      parentCategory: req.params.categoryId,
      status: "Active",
    }).populate("parentCategory");
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// update category
router.put("/update/:id", protect, admin, async (req, res) => {
  try {
    const ID = req.params.id;
    const updatedField = req.body;
    const makeUpdate = await Category.findByIdAndUpdate(ID, updatedField, {
      new: true,
    });

    if (makeUpdate?.status === "Inactive") {
      await SubCategory.updateMany(
        { parentCategory: ID },
        { status: "Inactive" },
      );
    }

    res.status(200).json({
      success: true,
      message: "Data updated successfully",
      data: makeUpdate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Delete category
router.delete("/delete/:id", protect, admin, async (req, res) => {
    try {
      const ID = req.params.id;
      const deleteCategory = await Category.findByIdAndDelete(ID);
      if (!deleteCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Data Deleted successfully",
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
