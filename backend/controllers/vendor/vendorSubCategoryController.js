/*
 * controllers/vendor/vendorSubCategoryController.js
 *
 * Handles CRUD operations for a vendor's own sub-categories.
 * A sub-category always belongs to both:
 *   - A Vendor  (the shop)
 *   - A VendorCategory  (the parent category)
 *
 * Every function here runs AFTER the full middleware chain, so:
 *   - req.vendor   = full Vendor document
 *   - req.vendorId = vendor's _id (shorthand used in DB queries)
 */



// start

import slugify from "slugify";
import VendorSubCategory from "../../models/vendor/vendorSubCategory.js";
import VendorCategory from "../../models/vendor/vendorCategory.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/subcategories
// @desc    Get ALL sub-categories for this vendor
//          Optionally filter by category: ?category=<categoryId>
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getSubCategories = async (req, res) => {
  try {
    // Start with a base filter — always restrict to this vendor's data only
    const filter = { vendor: req.vendorId };

    // ── Optional: filter by a specific parent category ────────────────────────
    // If the frontend sends ?category=<id>, we add it to the query.
    // Useful for "show sub-categories under Shoes" type requests.
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const subCategories = await VendorSubCategory.find(filter)
      .populate("category", "name slug") // attach category name+slug instead of just the ID
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: subCategories.length,
      data: subCategories,
    });
  } catch (error) {
    console.error("getSubCategories error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/subcategories/:id
// @desc    Get a single sub-category by ID (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getSubCategoryById = async (req, res) => {
  try {
    // Query by BOTH _id AND vendor — prevents fetching another vendor's data
    const subCategory = await VendorSubCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    }).populate("category", "name slug");

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-category not found" });
    }

    return res.status(200).json({ success: true, data: subCategory });
  } catch (error) {
    console.error("getSubCategoryById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/subcategories
// @desc    Create a new sub-category under one of this vendor's categories
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const createSubCategory = async (req, res) => {
  try {
    const { name, category: categoryId } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Sub-category name is required" });
    }

    if (!categoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Parent category is required" });
    }

    // ── Verify the parent category belongs to THIS vendor ─────────────────────
    // We must check this! Otherwise a vendor could link their sub-category
    // to another vendor's category by sending that category's ID.
    const parentCategory = await VendorCategory.findOne({
      _id: categoryId,
      vendor: req.vendorId,
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found or does not belong to you",
      });
    }

    // ── Generate slug ─────────────────────────────────────────────────────────
    const slug = slugify(name.trim(), { lower: true, strict: true });

    // ── Check for duplicate slug under this vendor ────────────────────────────
    const existing = await VendorSubCategory.findOne({
      vendor: req.vendorId,
      slug,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a sub-category with this name",
      });
    }

    // ── Create the sub-category ───────────────────────────────────────────────
    // vendor is always from req.vendorId (from token), never from request body.
    const { image } = req.body;
    const subCategory = await VendorSubCategory.create({
      vendor: req.vendorId,
      category: parentCategory._id,
      name: name.trim(),
      slug,
      image: image || "",
    });

    return res.status(201).json({
      success: true,
      message: "Sub-category created successfully",
      data: subCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A sub-category with this name already exists",
      });
    }
    console.error("createSubCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/vendor/:vendorSlug/subcategories/:id
// @desc    Update a sub-category (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateSubCategory = async (req, res) => {
  try {
    // ── Find and verify ownership ─────────────────────────────────────────────
    const subCategory = await VendorSubCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-category not found" });
    }

    const { name, category: newCategoryId, isActive } = req.body;

    // ── Update name and regenerate slug if name changed ───────────────────────
    if (name && name.trim() !== subCategory.name) {
      const newSlug = slugify(name.trim(), { lower: true, strict: true });

      // Check slug conflict with other sub-categories of this vendor
      const slugConflict = await VendorSubCategory.findOne({
        vendor: req.vendorId,
        slug: newSlug,
        _id: { $ne: subCategory._id }, // exclude the current document
      });

      if (slugConflict) {
        return res.status(400).json({
          success: false,
          message: "You already have a sub-category with this name",
        });
      }

      subCategory.name = name.trim();
      subCategory.slug = newSlug;
    }

    // ── If changing parent category, verify new one belongs to this vendor ────
    if (newCategoryId && newCategoryId !== subCategory.category.toString()) {
      const newParent = await VendorCategory.findOne({
        _id: newCategoryId,
        vendor: req.vendorId,
      });

      if (!newParent) {
        return res.status(404).json({
          success: false,
          message: "New parent category not found or does not belong to you",
        });
      }

      subCategory.category = newParent._id;
    }

    // ── Update isActive if provided ───────────────────────────────────────────
    if (isActive !== undefined) subCategory.isActive = isActive;

    // ── Update image if provided ──────────────────────────────────────────────
    const { image } = req.body;
    if (image !== undefined) subCategory.image = image;

    const updated = await subCategory.save();

    return res.status(200).json({
      success: true,
      message: "Sub-category updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A sub-category with this name already exists",
      });
    }
    console.error("updateSubCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/vendor/:vendorSlug/subcategories/:id
// @desc    Delete a sub-category (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteSubCategory = async (req, res) => {
  try {
    // ── Find and verify ownership in one shot ─────────────────────────────────
    const subCategory = await VendorSubCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Sub-category not found" });
    }

    // ── Delete the sub-category ───────────────────────────────────────────────
    // NOTE: Products referencing this sub-category will have a dangling reference.
    // Consider setting subCategory to null on those products here in the future.
    await subCategory.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Sub-category deleted successfully",
    });
  } catch (error) {
    console.error("deleteSubCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
