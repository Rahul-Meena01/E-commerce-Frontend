/*
 * Handover note: Subcategory API.
 * Admin CRUD endpoints manage subcategories and populate the linked Category so UI tables can show names.
 */
// const express = require("express");
// const router = express.Router();

// const SubCategory = require("../models/SubCategory");
// const Category = require("../models/Category");

import express from "express";
import SubCategory from "../models/SubCategory.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create SubCategory
router.post("/create", protect, async(req,res) => {
    try{
        const { parentCategory, name, slug, status, image } = req.body;
        
        const parentExists = await Category.findById(parentCategory)
        if(!parentExists){
            return res.status(404).json({
                success: false,
                message: "Parent category not found"
            })
        }

        if (parentExists.status === "Inactive" && status === "Active") {
            return res.status(400).json({
                success: false,
                message: "Cannot activate subcategory because its parent category is inactive.",
            });
        }

        const finalStatus = parentExists.status === "Inactive" ? "Inactive" : status;
        const subCategory = new SubCategory ({
            parentCategory,
            name,
            slug,
            image: image || null,
            status: finalStatus,
        });
        await subCategory.save()
        res.status(201).json({
            success: true,
            message: "Subcategory created successfully :)",
            data: subCategory
        })
    }catch(error){
        res.status(500).json({
            success: false,
            message : "Internal server error",
        })
    }
})

// Display SubCategory (paginated)
router.get("/all", protect, async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const total = await SubCategory.countDocuments();
        const active = await SubCategory.countDocuments({ status: "Active" });
        const inactive = await SubCategory.countDocuments({ status: "Inactive" });
        const subCategories = await SubCategory.find().populate('parentCategory').sort({ createdAt: -1 }).skip(skip).limit(limit);
    
        res.status(200).json({
          success: true,
          message: "SubCategories loaded successfully",
          data : subCategories,
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
})

// Search subcategories for dropdowns
router.get("/search", protect, async (req, res) => {
  try {
    const { q = "", limit = 5 } = req.query;
    const query = q ? { name: { $regex: q, $options: "i" }, status: "Active" } : { status: "Active" };
    
    const subCategories = await SubCategory.find(query).populate('parentCategory').limit(parseInt(limit));
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/public/all", async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ status: "Active" }).populate(
      "parentCategory",
    ).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update SubCategory
router.put("/update/:id", protect, async(req,res) => {
    try{
            const ID = req.params.id
            const { image, ...updatedField } = req.body;
            const existingSubCategory = await SubCategory.findById(ID);
            
            // Update image if provided
            if (image) {
                updatedField.image = image;
            }
            if (!existingSubCategory) {
                return res.status(404).json({
                    success: false,
                    message: "SubCategory not found",
                });
            }

            const parentId = updatedField.parentCategory || existingSubCategory.parentCategory;
            const parentExists = await Category.findById(parentId);
            if (!parentExists) {
                return res.status(404).json({
                    success: false,
                    message: "Parent category not found",
                });
            }

            if (parentExists.status === "Inactive") {
                if (updatedField.status === "Active") {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot activate subcategory because its parent category is inactive.",
                    });
                }
                updatedField.status = "Inactive";
            }

            const makeUpdate = await SubCategory.findByIdAndUpdate(ID, updatedField, {new : true}).populate("parentCategory");
            
            if (makeUpdate) {
                await Product.updateMany(
                    { subCategory: ID },
                    { status: makeUpdate.status }
                );
            }

            res.status(200).json({
              success: true,
              message: "SubCategory updated successfully",
              data: makeUpdate,
            });
        } catch (error) {
            res.status(500).json({
              success: false,
              message: "Internal server error",
            });
        }
    
})

// Delete SubCategory
router.delete("/delete/:id", protect, async(req,res) => {
try {
      const ID = req.params.id;
      const deletesubCategory = await SubCategory.findByIdAndDelete(ID);
      if (!deletesubCategory) {
        return res.status(404).json({
          success: false,
          message: "SubCategory not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "SubCategory Deleted successfully",
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }

})

// module.exports = router;
export default router;
