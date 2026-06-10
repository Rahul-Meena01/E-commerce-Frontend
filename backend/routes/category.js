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
import Product from "../models/Product.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create category
router.post("/create", protect, async (req, res) => {
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

// Get all categories (paginated)
router.get("/all", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await Category.countDocuments();
    const active = await Category.countDocuments({ status: "Active" });
    const inactive = await Category.countDocuments({ status: "Inactive" });
    const categories = await Category.find().skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      message: "Data loaded successfully",
      data: categories,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      active,
      inactive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Search categories for dropdowns (limit defaults to 5)
router.get("/search", protect, async (req, res) => {
  try {
    const { q = "", limit = 5 } = req.query;
    const query = q ? { name: { $regex: q, $options: "i" }, status: "Active" } : { status: "Active" };
    
    const categories = await Category.find(query).limit(parseInt(limit));
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
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

// update category
router.put("/update/:id", protect, async (req, res) => {
  try {
    const ID = req.params.id;
    const updatedField = req.body;
    const makeUpdate = await Category.findByIdAndUpdate(ID, updatedField, {
      new: true,
    });

    if (makeUpdate) {
      const targetStatus = makeUpdate.status; // "Active" or "Inactive"
      
      // Find all subcategories linked to this category
      const subCategories = await SubCategory.find({ parentCategory: ID });
      const subCategoryIds = subCategories.map(sub => sub._id);

      // Update their status
      if (subCategoryIds.length > 0) {
        await SubCategory.updateMany(
          { _id: { $in: subCategoryIds } },
          { status: targetStatus }
        );

        // Update all products under these subcategories
        await Product.updateMany(
          { subCategory: { $in: subCategoryIds } },
          { status: targetStatus }
        );
      }
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
router.delete("/delete/:id", protect, async (req, res) => {
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
