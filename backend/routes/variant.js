/*
 * Handover note: Variant API.
 * Admin endpoints create/update/delete variants for products and handle variant image uploads.
 */
// const express = require("express");
// const router = express.Router();

// const Product = require("../models/Product");
// const Variant = require("../models/Variant");
// const upload = require("../middleware/upload");

import express from "express";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const variantUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
]);

const getImagePath = (files, field) => {
  if (files && files[field] && files[field][0]) return `/uploads/${files[field][0].filename}`;
  return null;
};

// Create variant product
router.post("/create", protect, variantUpload, async (req, res) => {
  try {
    const { parentProduct, name, brand, price, discountPercent, status } = req.body;
    const image = getImagePath(req.files, "image");
    const image1 = getImagePath(req.files, "image1");
    const image2 = getImagePath(req.files, "image2");
    const image3 = getImagePath(req.files, "image3");
    const image4 = getImagePath(req.files, "image4");
    const isProduct = await Product.findById(parentProduct);

    if (!isProduct) {
      return res.status(404).json({ success: false, message: "Base product not found" });
    }

    const variant = new Variant({
      parentProduct,
      image,
      image1,
      image2,
      image3,
      image4,
      name,
      brand,
      price,
      discountPercent,
      discountPrice:
        discountPercent && price
          ? Number(price) - (Number(price) * Number(discountPercent)) / 100
          : undefined,
      status: status || "Active",
    });

    await variant.save();
    res.status(201).json({ success: true, message: "Variant product created successfully", data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all variants
router.get("/all", protect, async (req, res) => {
  try {
    const { status, product } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (product && product !== "all") query.parentProduct = product;

    const variants = await Variant.find(query)
      .populate({
        path: "parentProduct",
        populate: {
          path: "subCategory",
          populate: { path: "parentCategory" },
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, message: "Variant products loaded", data: variants });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update variant product
router.put("/update/:id", protect, variantUpload, async (req, res) => {
  try {
    const { parentProduct, name, brand, price, discountPercent, status } = req.body;
    const updatedData = {
      parentProduct,
      name,
      brand,
      price,
      discountPercent,
      status,
      discountPrice:
        discountPercent && price
          ? Number(price) - (Number(price) * Number(discountPercent)) / 100
          : undefined,
    };

    const imageFields = ["image", "image1", "image2", "image3", "image4"];

    imageFields.forEach((field) => {
      const newImage = getImagePath(req.files, field);

      if (newImage) {
        updatedData[field] = newImage;
      }
    });

    if (parentProduct) {
      const isProduct = await Product.findById(parentProduct);
      if (!isProduct) {
        return res.status(404).json({ success: false, message: "Base product not found" });
      }
    }

    const variant = await Variant.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant product not found" });
    }

    res.status(200).json({ success: true, message: "Variant product updated successfully", data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Delete variant product
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const variant = await Variant.findByIdAndDelete(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant product not found" });
    }

    res.status(200).json({ success: true, message: "Variant product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// module.exports = router;
export default router;
