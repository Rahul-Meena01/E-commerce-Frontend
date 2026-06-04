import express from "express";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET Wishlist
router.get("/", protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: wishlist.items,
    });
  } catch (error) {
    console.error("Fetch wishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Toggle Wishlist
router.post("/toggle", protect, async (req, res) => {
  try {
    const { productId, variantId, size = "", color = "" } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    // Find if already exists
    const existingIndex = wishlist.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variant ? item.variant.toString() : "") === (variantId ? variantId.toString() : "") &&
        (item.size || "") === (size || "") &&
        (item.color || "") === (color || "")
    );

    if (existingIndex > -1) {
      // Remove it
      wishlist.items.splice(existingIndex, 1);
      await wishlist.save();
      
      let populatedWishlist = await Wishlist.findById(wishlist._id)
        .populate("items.product")
        .populate("items.variant");

      return res.status(200).json({
        success: true,
        message: "Item removed from wishlist",
        data: populatedWishlist.items,
        action: "removed",
      });
    } else {
      // Add it
      wishlist.items.push({
        product: productId,
        variant: variantId || null,
        size: size || "",
        color: color || "",
      });
      await wishlist.save();
      
      let populatedWishlist = await Wishlist.findById(wishlist._id)
        .populate("items.product")
        .populate("items.variant");

      return res.status(200).json({
        success: true,
        message: "Item added to wishlist",
        data: populatedWishlist.items,
        action: "added",
      });
    }
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Merge Guest Wishlist
router.post("/merge", protect, async (req, res) => {
  try {
    const { items = [] } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    for (const localItem of items) {
      const { product: productId, variant: variantId, size = "", color = "" } = localItem;
      if (!productId) continue;

      const exists = wishlist.items.some(
        (item) =>
          item.product.toString() === productId &&
          (item.variant ? item.variant.toString() : "") === (variantId ? variantId.toString() : "") &&
          (item.size || "") === (size || "") &&
          (item.color || "") === (color || "")
      );

      if (!exists) {
        wishlist.items.push({
          product: productId,
          variant: variantId || null,
          size: size || "",
          color: color || "",
        });
      }
    }

    await wishlist.save();
    
    let populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate("items.product")
      .populate("items.variant");

    res.status(200).json({
      success: true,
      message: "Wishlist merged successfully",
      data: populatedWishlist.items,
    });
  } catch (error) {
    console.error("Merge wishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
