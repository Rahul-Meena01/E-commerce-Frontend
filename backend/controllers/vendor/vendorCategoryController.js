/*
 * controllers/vendor/vendorCategoryController.js
 *
 * Handles CRUD operations for a vendor's own categories.
 * Categories created here are completely separate from admin categories.
 *
 * Every function in this file runs AFTER the middleware chain:
 *   protect → authorizeRoles("vendor") → attachVendorContext → validateOwnership
 *
 * So by the time we reach any function here:
 *   - req.vendor  = the full Vendor document (the shop)
 *   - req.vendorId = shorthand for req.vendor._id (used for DB queries)
 */

import slugify from "slugify";
import VendorCategory from "../../models/vendor/vendorCategory.js";
import VendorProduct from "../../models/vendor/vendorProduct.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/categories
// @desc    Get categories belonging to the logged-in vendor with pagination and product counts
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getCategories = async (req, res) => {
  try {
    // Get pagination parameters from query (defaults: page=1, limit=10)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    // Use MongoDB aggregation to get categories with product counts
    const categories = await VendorCategory.aggregate([
      // Step 1: Match categories for this vendor
      { $match: { vendor: req.vendorId } },
      
      // Step 2: Sort by newest first
      { $sort: { createdAt: -1 } },
      
      // Step 3: Add product count via left outer join
      {
        $lookup: {
          from: "vendorproducts",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$category", "$$categoryId"] },
                    { $eq: ["$vendor", req.vendorId] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "productCountData",
        },
      },
      
      // Step 4: Extract product count (0 if no products)
      {
        $addFields: {
          productCount: {
            $cond: [
              { $gt: [{ $size: "$productCountData" }, 0] },
              { $arrayElemAt: ["$productCountData.count", 0] },
              0,
            ],
          },
        },
      },
      
      // Step 5: Remove temporary field
      { $project: { productCountData: 0 } },
    ]);

    // Get total count for pagination info
    const totalCount = await VendorCategory.countDocuments({ vendor: req.vendorId });
    const totalPages = Math.ceil(totalCount / limit);

    // Apply pagination to aggregation results
    const paginatedCategories = categories.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      count: paginatedCategories.length,
      totalCount,
      page,
      totalPages,
      limit,
      data: paginatedCategories,
    });
  } catch (error) {
    console.error("getCategories error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/categories/:id
// @desc    Get a single category by ID (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getCategoryById = async (req, res) => {
  try {
    // Find by BOTH _id AND vendor — this prevents a vendor from fetching
    // another vendor's category by guessing its MongoDB ID.
    const category = await VendorCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!category) {
      // We use 404 here — whether the category doesn't exist or belongs to
      // someone else, we don't reveal which. Both look like "not found".
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("getCategoryById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/categories
// @desc    Create a new category for this vendor
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { name, image } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    // ── Generate a URL-friendly slug from the name ────────────────────────────
    // e.g. "Summer Collection!" → "summer-collection"
    // `strict: true` removes special characters.
    const slug = slugify(name.trim(), { lower: true, strict: true });

    // ── Check if this vendor already has a category with this slug ────────────
    // Two vendors can have the same slug — we only block duplicates PER vendor.
    const existing = await VendorCategory.findOne({
      vendor: req.vendorId,
      slug,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a category with this name",
      });
    }

    // ── Create the category in the database ───────────────────────────────────
    // We force `vendor: req.vendorId` — the client never provides this.
    // This way a vendor can never create a category under another vendor's ID.
    const category = await VendorCategory.create({
      vendor: req.vendorId, // always taken from the verified token, not the body
      name: name.trim(),
      slug,
      image: image?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    // ── Handle MongoDB duplicate key error (race condition safety net) ─────────
    // Even though we check above, two simultaneous requests could slip through.
    // Error code 11000 = unique index violation in MongoDB.
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists",
      });
    }
    console.error("createCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/vendor/:vendorSlug/categories/:id
// @desc    Update a category (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
  try {
    // ── Find the category and confirm it belongs to this vendor ───────────────
    // Using findOne with BOTH _id and vendor prevents cross-vendor tampering.
    const category = await VendorCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const { name, image, isActive } = req.body;

    // ── Update name and regenerate slug if name changed ───────────────────────
    if (name && name.trim() !== category.name) {
      const newSlug = slugify(name.trim(), { lower: true, strict: true });

      // Check if the new slug conflicts with another category of this vendor
      const slugConflict = await VendorCategory.findOne({
        vendor: req.vendorId,
        slug: newSlug,
        _id: { $ne: category._id }, // exclude the current document from the check
      });

      if (slugConflict) {
        return res.status(400).json({
          success: false,
          message: "You already have a category with this name",
        });
      }

      category.name = name.trim();
      category.slug = newSlug;
    }

    // ── Update other optional fields if provided ──────────────────────────────
    // We only update a field if the client actually sent it in the body.
    // `undefined` check ensures we don't accidentally overwrite with null.
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;

    // ── Save to database ──────────────────────────────────────────────────────
    const updated = await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists",
      });
    }
    console.error("updateCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/vendor/:vendorSlug/categories/:id
// @desc    Delete a category (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  try {
    // ── Find and verify ownership in one query ────────────────────────────────
    const category = await VendorCategory.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // ── Delete the category ───────────────────────────────────────────────────
    // NOTE: This does NOT automatically delete subcategories or products
    // that reference this category. You may want to handle that here in the future
    // (e.g. set category to null on related products, or delete subcategories too).
    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("deleteCategory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
