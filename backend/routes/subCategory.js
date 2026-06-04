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
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create SubCategory
router.post("/create", protect, admin, async(req,res) => {
    try{
        const { parentCategory, name, slug, status } = req.body;
        
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

// Display SubCategory
router.get("/all", protect, admin, async(req,res) => {
    try {
        const subCategories = await SubCategory.find().populate('parentCategory');
    
        res.status(200).json({
          success: true,
          message: "SubCategories loaded successfully",
          data : subCategories,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      } 
})

router.get("/public/all", async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ status: "Active" }).populate(
      "parentCategory",
    );
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET public subcategories root path
router.get("/", async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ status: "Active" }).populate(
      "parentCategory",
    );
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update SubCategory
router.put("/update/:id", protect, admin, async(req,res) => {
    try{
            const ID = req.params.id
            const updatedField = req.body;
            const existingSubCategory = await SubCategory.findById(ID);
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

            const makeUpdate = await SubCategory.findByIdAndUpdate(ID, updatedField, {new : true}).populate("parentCategory")
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
router.delete("/delete/:id", protect, admin, async(req,res) => {
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
