/*
 * controllers/vendor/vendorProductController.js
 *
 * Handles CRUD operations for a vendor's own products,
 * plus a dedicated image-upload endpoint.
 *
 * Every function runs AFTER the full middleware chain:
 *   protect → authorizeRoles("vendor") → attachVendorContext → validateOwnership
 *
 * So by the time we get here:
 *   - req.vendor   = full Vendor document
 *   - req.vendorId = vendor's _id
 */

import path from "path";
import slugify from "slugify";
import VendorProduct from "../../models/vendor/vendorProduct.js";
import VendorCategory from "../../models/vendor/vendorCategory.js";
import VendorSubCategory from "../../models/vendor/vendorSubCategory.js";

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/products
// @desc    Get ALL products for this vendor
//          Optional filters via query params:
//            ?category=<id>     → filter by category
//            ?subCategory=<id>  → filter by sub-category
//            ?isActive=true/false → filter by active status
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getProducts = async (req, res) => {
  try {
    const filter = { vendor: req.vendorId };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.subCategory) filter.subCategory = req.query.subCategory;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const total = await VendorProduct.countDocuments(filter);

    const products = await VendorProduct.find(filter)
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    console.error("getProducts error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/vendor/:vendorSlug/products/:id
// @desc    Get a single product by ID (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await VendorProduct.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    })
      .populate("category", "name slug")
      .populate("subCategory", "name slug");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("getProductById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/products/upload-image
// @desc    Upload a single product image and return its public URL.
//          Multer (upload.single("image")) must be applied before this handler
//          in the route file.
//
//          The client uploads one file at a time, gets back a URL,
//          then includes those URLs in the images[] array when it
//          calls createProduct or updateProduct.
//
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadProductImage = async (req, res) => {
  try {
    // multer places the saved file on req.file
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }

    // With multer-storage-cloudinary, the public URL is stored in req.file.path
    const url = req.file.path;

    return res.status(200).json({
      success: true,
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("uploadProductImage error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/vendor/:vendorSlug/products
// @desc    Create a new product for this vendor.
//          Body: { name, price, description?, salePrice?, stock?,
//                  images?: string[], category?, subCategory?, isActive? }
//
//          images[] should contain URLs already returned by uploadProductImage.
//          Slot order: images[0] = thumbnail, images[1-4] = carousel.
//          Maximum 5 images enforced here; extras are silently dropped.
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      salePrice,
      stock,
      images,
      category: categoryId,
      subCategory: subCategoryId,
      isActive,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    }

    if (price === undefined || price < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid price is required" });
    }

    // ── Validate images ───────────────────────────────────────────────────────
    // Accept up to 5 URLs. Each must be a non-empty string.
    const rawImages = Array.isArray(images) ? images : [];
    const cleanImages = rawImages
      .filter((u) => typeof u === "string" && u.trim().length > 0)
      .slice(0, 5); // hard cap at 5 slots

    // ── Category ownership check ──────────────────────────────────────────────
    if (categoryId) {
      const categoryExists = await VendorCategory.findOne({
        _id: categoryId,
        vendor: req.vendorId,
      });
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found or does not belong to you",
        });
      }
    }

    // ── Sub-category ownership check ──────────────────────────────────────────
    if (subCategoryId) {
      const subCategoryExists = await VendorSubCategory.findOne({
        _id: subCategoryId,
        vendor: req.vendorId,
      });
      if (!subCategoryExists) {
        return res.status(404).json({
          success: false,
          message: "Sub-category not found or does not belong to you",
        });
      }
    }

    // ── Slug generation ───────────────────────────────────────────────────────
    const baseSlug = slugify(name.trim(), { lower: true, strict: true });
    const slugExists = await VendorProduct.findOne({
      vendor: req.vendorId,
      slug: baseSlug,
    });
    const slug = slugExists
      ? `${baseSlug}-${Math.random().toString(16).slice(2, 6)}`
      : baseSlug;

    // ── Create ────────────────────────────────────────────────────────────────
    const product = await VendorProduct.create({
      vendor: req.vendorId,
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      price,
      salePrice: salePrice ?? null,
      stock: stock ?? 0,
      images: cleanImages,
      category: categoryId || null,
      subCategory: subCategoryId || null,
      isActive: (stock ?? 0) === 0 ? false : (isActive ?? true),
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A product with this name already exists",
      });
    }
    console.error("createProduct error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/vendor/:vendorSlug/products/:id
// @desc    Update a product (must belong to this vendor).
//          Sending images: [] clears all images.
//          Sending images: undefined leaves images untouched.
//          Sending images: ["url1","url2",...] replaces the array (max 5).
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const product = await VendorProduct.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const {
      name,
      description,
      price,
      salePrice,
      stock,
      images,
      isActive,
      category: newCategoryId,
      subCategory: newSubCategoryId,
    } = req.body;

    // ── Name + slug update ────────────────────────────────────────────────────
    if (name && name.trim() !== product.name) {
      const newBaseSlug = slugify(name.trim(), { lower: true, strict: true });
      const conflict = await VendorProduct.findOne({
        vendor: req.vendorId,
        slug: newBaseSlug,
        _id: { $ne: product._id },
      });
      product.name = name.trim();
      product.slug = conflict
        ? `${newBaseSlug}-${Math.random().toString(16).slice(2, 6)}`
        : newBaseSlug;
    }

    // ── Images update ─────────────────────────────────────────────────────────
    // Only touch images if the field was explicitly sent in the body.
    if (images !== undefined) {
      const rawImages = Array.isArray(images) ? images : [];
      product.images = rawImages
        .filter((u) => typeof u === "string" && u.trim().length > 0)
        .slice(0, 5);
    }

    // ── Category update ───────────────────────────────────────────────────────
    if (newCategoryId !== undefined) {
      if (newCategoryId === null) {
        product.category = null;
        product.subCategory = null;
      } else {
        const cat = await VendorCategory.findOne({
          _id: newCategoryId,
          vendor: req.vendorId,
        });
        if (!cat) {
          return res.status(404).json({
            success: false,
            message: "Category not found or does not belong to you",
          });
        }
        product.category = cat._id;
      }
    }

    // ── Sub-category update ───────────────────────────────────────────────────
    if (newSubCategoryId !== undefined) {
      if (newSubCategoryId === null) {
        product.subCategory = null;
      } else {
        const subCat = await VendorSubCategory.findOne({
          _id: newSubCategoryId,
          vendor: req.vendorId,
        });
        if (!subCat) {
          return res.status(404).json({
            success: false,
            message: "Sub-category not found or does not belong to you",
          });
        }
        product.subCategory = subCat._id;
      }
    }

    // ── Scalar field updates ──────────────────────────────────────────────────
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (stock !== undefined) product.stock = stock;
    if (isActive !== undefined) product.isActive = isActive;

    if (product.stock === 0) {
      product.isActive = false;
    }

    const updated = await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("updateProduct error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/vendor/:vendorSlug/products/:id
// @desc    Delete a product (must belong to this vendor)
// @access  Private (vendor only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
  try {
    const product = await VendorProduct.findOne({
      _id: req.params.id,
      vendor: req.vendorId,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// /*
//  * controllers/vendor/vendorProductController.js
//  *
//  * Handles CRUD operations for a vendor's own products.
//  * Products are completely isolated — a vendor only ever sees or touches
//  * products that belong to them.
//  *
//  * Every function runs AFTER the full middleware chain:
//  *   protect → authorizeRoles("vendor") → attachVendorContext → validateOwnership
//  *
//  * So by the time we get here:
//  *   - req.vendor   = full Vendor document
//  *   - req.vendorId = vendor's _id
//  */

// import slugify from "slugify";
// import VendorProduct from "../../models/vendor/VendorProduct.js";
// import VendorCategory from "../../models/vendor/VendorCategory.js";
// import VendorSubCategory from "../../models/vendor/VendorSubCategory.js";

// // ─────────────────────────────────────────────────────────────────────────────
// // @route   GET /api/vendor/:vendorSlug/products
// // @desc    Get ALL products for this vendor
// //          Optional filters via query params:
// //            ?category=<id>     → filter by category
// //            ?subCategory=<id>  → filter by sub-category
// //            ?isActive=true/false → filter by active status
// // @access  Private (vendor only)
// // ─────────────────────────────────────────────────────────────────────────────
// export const getProducts = async (req, res) => {
//   try {
//     // Always start with this vendor's products only
//     const filter = { vendor: req.vendorId };

//     // ── Optional query filters ────────────────────────────────────────────────
//     // These let the vendor dashboard filter products by category, sub-category, or status.
//     if (req.query.category) filter.category = req.query.category;
//     if (req.query.subCategory) filter.subCategory = req.query.subCategory;

//     // Convert string "true"/"false" from URL to actual boolean
//     if (req.query.isActive !== undefined) {
//       filter.isActive = req.query.isActive === "true";
//     }

//     const products = await VendorProduct.find(filter)
//       .populate("category", "name slug") // replace ObjectId with actual category name
//       .populate("subCategory", "name slug") // same for sub-category
//       .sort({ createdAt: -1 }); // newest products first

//     return res.status(200).json({
//       success: true,
//       count: products.length,
//       data: products,
//     });
//   } catch (error) {
//     console.error("getProducts error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // @route   GET /api/vendor/:vendorSlug/products/:id
// // @desc    Get a single product by ID (must belong to this vendor)
// // @access  Private (vendor only)
// // ─────────────────────────────────────────────────────────────────────────────
// export const getProductById = async (req, res) => {
//   try {
//     // Find by BOTH _id AND vendor — a vendor can't fetch someone else's product
//     const product = await VendorProduct.findOne({
//       _id: req.params.id,
//       vendor: req.vendorId,
//     })
//       .populate("category", "name slug")
//       .populate("subCategory", "name slug");

//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     return res.status(200).json({ success: true, data: product });
//   } catch (error) {
//     console.error("getProductById error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // @route   POST /api/vendor/:vendorSlug/products
// // @desc    Create a new product for this vendor
// // @access  Private (vendor only)
// // ─────────────────────────────────────────────────────────────────────────────
// export const createProduct = async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       price,
//       salePrice,
//       stock,
//       images,
//       category: categoryId,
//       subCategory: subCategoryId,
//     } = req.body;

//     // ── Validate required fields ──────────────────────────────────────────────
//     if (!name?.trim()) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Product name is required" });
//     }

//     if (price === undefined || price < 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Valid price is required" });
//     }

//     // ── If a category is provided, verify it belongs to this vendor ───────────
//     if (categoryId) {
//       const categoryExists = await VendorCategory.findOne({
//         _id: categoryId,
//         vendor: req.vendorId,
//       });

//       if (!categoryExists) {
//         return res.status(404).json({
//           success: false,
//           message: "Category not found or does not belong to you",
//         });
//       }
//     }

//     // ── If a sub-category is provided, verify it belongs to this vendor ───────
//     if (subCategoryId) {
//       const subCategoryExists = await VendorSubCategory.findOne({
//         _id: subCategoryId,
//         vendor: req.vendorId,
//       });

//       if (!subCategoryExists) {
//         return res.status(404).json({
//           success: false,
//           message: "Sub-category not found or does not belong to you",
//         });
//       }
//     }

//     // ── Generate a unique slug for this product ───────────────────────────────
//     // Base slug from the product name.
//     const baseSlug = slugify(name.trim(), { lower: true, strict: true });

//     // Check if this vendor already has a product with this slug
//     const slugExists = await VendorProduct.findOne({
//       vendor: req.vendorId,
//       slug: baseSlug,
//     });

//     // If slug is taken, append a short random suffix to make it unique
//     // e.g. "air-max-270" → "air-max-270-x4f2"
//     const slug = slugExists
//       ? `${baseSlug}-${Math.random().toString(16).slice(2, 6)}`
//       : baseSlug;

//     // ── Create the product ────────────────────────────────────────────────────
//     // vendor is always forced to req.vendorId — never trusted from the body.
//     const product = await VendorProduct.create({
//       vendor: req.vendorId,
//       name: name.trim(),
//       slug,
//       description: description?.trim() || "",
//       price,
//       salePrice: salePrice ?? null, // null if not provided
//       stock: stock ?? 0,
//       images: images || [],
//       category: categoryId || null,
//       subCategory: subCategoryId || null,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Product created successfully",
//       data: product,
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: "A product with this name already exists",
//       });
//     }
//     console.error("createProduct error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // @route   PUT /api/vendor/:vendorSlug/products/:id
// // @desc    Update a product (must belong to this vendor)
// // @access  Private (vendor only)
// // ─────────────────────────────────────────────────────────────────────────────
// export const updateProduct = async (req, res) => {
//   try {
//     // ── Find and verify ownership ─────────────────────────────────────────────
//     const product = await VendorProduct.findOne({
//       _id: req.params.id,
//       vendor: req.vendorId,
//     });

//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     const {
//       name,
//       description,
//       price,
//       salePrice,
//       stock,
//       images,
//       isActive,
//       category: newCategoryId,
//       subCategory: newSubCategoryId,
//     } = req.body;

//     // ── Update name and regenerate slug if name changed ───────────────────────
//     if (name && name.trim() !== product.name) {
//       const newBaseSlug = slugify(name.trim(), { lower: true, strict: true });

//       // Check if new slug conflicts with another product of this vendor
//       const conflict = await VendorProduct.findOne({
//         vendor: req.vendorId,
//         slug: newBaseSlug,
//         _id: { $ne: product._id }, // exclude the current product from the check
//       });

//       product.name = name.trim();
//       // If there's a conflict, append random suffix to keep it unique
//       product.slug = conflict
//         ? `${newBaseSlug}-${Math.random().toString(16).slice(2, 6)}`
//         : newBaseSlug;
//     }

//     // ── Update category if provided ───────────────────────────────────────────
//     if (newCategoryId !== undefined) {
//       if (newCategoryId === null) {
//         // Vendor is removing the category assignment
//         product.category = null;
//         product.subCategory = null; // also clear sub-category since parent is gone
//       } else {
//         // Verify the new category belongs to this vendor
//         const cat = await VendorCategory.findOne({
//           _id: newCategoryId,
//           vendor: req.vendorId,
//         });
//         if (!cat) {
//           return res.status(404).json({
//             success: false,
//             message: "Category not found or does not belong to you",
//           });
//         }
//         product.category = cat._id;
//       }
//     }

//     // ── Update sub-category if provided ──────────────────────────────────────
//     if (newSubCategoryId !== undefined) {
//       if (newSubCategoryId === null) {
//         product.subCategory = null;
//       } else {
//         const subCat = await VendorSubCategory.findOne({
//           _id: newSubCategoryId,
//           vendor: req.vendorId,
//         });
//         if (!subCat) {
//           return res.status(404).json({
//             success: false,
//             message: "Sub-category not found or does not belong to you",
//           });
//         }
//         product.subCategory = subCat._id;
//       }
//     }

//     // ── Update remaining fields if provided ───────────────────────────────────
//     if (description !== undefined) product.description = description;
//     if (price !== undefined) product.price = price;
//     if (salePrice !== undefined) product.salePrice = salePrice;
//     if (stock !== undefined) product.stock = stock;
//     if (images !== undefined) product.images = images;
//     if (isActive !== undefined) product.isActive = isActive;

//     const updated = await product.save();

//     return res.status(200).json({
//       success: true,
//       message: "Product updated successfully",
//       data: updated,
//     });
//   } catch (error) {
//     console.error("updateProduct error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // @route   DELETE /api/vendor/:vendorSlug/products/:id
// // @desc    Delete a product (must belong to this vendor)
// // @access  Private (vendor only)
// // ─────────────────────────────────────────────────────────────────────────────
// export const deleteProduct = async (req, res) => {
//   try {
//     // ── Find and verify ownership in one query ────────────────────────────────
//     const product = await VendorProduct.findOne({
//       _id: req.params.id,
//       vendor: req.vendorId,
//     });

//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     await product.deleteOne();

//     return res.status(200).json({
//       success: true,
//       message: "Product deleted successfully",
//     });
//   } catch (error) {
//     console.error("deleteProduct error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };
