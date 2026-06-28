import express from "express";
import Category from "../models/Category.js";
import SubCategory from "../models/SubCategory.js";
import Product from "../models/Product.js";
import VendorProduct from "../models/vendor/vendorProduct.js";
import Variant from "../models/Variant.js";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ======================================================
// MULTER CONFIG
// ======================================================

const cpUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
]);



// ======================================================
// HELPER FUNCTION
// ======================================================

const getImagePath = (files, field) => {
  if (files && files[field] && files[field][0] && files[field][0].path) {
    return files[field][0].path; // Cloudinary URL
  }

  return null;
};

// ======================================================
// CREATE PRODUCT
// ======================================================

router.post("/create", protect, cpUpload, async (req, res) => {
  try {
    const {
      subCategory,
      name,
      brand,
      price,
      discountPrice,
      discountPercent,
      stock,
      slug,
      status,
      image,
      image1,
      image2,
      image3,
      image4,
    } = req.body;

    // ------------------------------
    // VALIDATION
    // ------------------------------

    if (!subCategory) {
      return res.status(400).json({
        success: false,
        message: "SubCategory is required",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!price) {
      return res.status(400).json({
        success: false,
        message: "Price is required",
      });
    }

    // ------------------------------
    // CHECK SUBCATEGORY
    // ------------------------------

    const isSubCategory = await SubCategory.findById(subCategory);

    if (!isSubCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    // ------------------------------
    // DISCOUNT CALCULATION
    // ------------------------------

    let finalDiscountPrice = discountPrice || 0;

    if (discountPercent && price) {
      finalDiscountPrice =
        Number(price) - (Number(price) * Number(discountPercent)) / 100;
    }

    // ------------------------------
    // CREATE PRODUCT
    // ------------------------------

    const product = new Product({
      subCategory,
      name,
      brand,
      price,
      discountPrice: finalDiscountPrice,
      discountPercent,
      status,
      stock,
      slug,

      image: getImagePath(req.files, "image") || image,
      image1: getImagePath(req.files, "image1") || image1,
      image2: getImagePath(req.files, "image2") || image2,
      image3: getImagePath(req.files, "image3") || image3,
      image4: getImagePath(req.files, "image4") || image4,
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.log("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ======================================================
// GET ALL PRODUCTS (ADMIN)
// ======================================================

router.get("/all", protect, async (req, res) => {
  try {
    const { search, limit, page, status, subCategory, category } = req.query;

    const query = {};

    // ------------------------------
    // FILTERS
    // ------------------------------

    const inactiveCategories = await Category.find({ status: "Inactive" }).select("_id");
    const inactiveCategoryIds = inactiveCategories.map((c) => c._id);

    const inactiveSubCategories = await SubCategory.find({
      $or: [
        { status: "Inactive" },
        { parentCategory: { $in: inactiveCategoryIds } }
      ]
    }).select("_id");

    const effectivelyInactiveSubCategoryIds = inactiveSubCategories.map((sc) => sc._id);

    // Create a base query without status for the stats calculations
    const baseQuery = {};

    if (subCategory) {
      baseQuery.subCategory = subCategory;
    } else if (category) {
      const categorySubcategories = await SubCategory.find({ parentCategory: category }).select("_id");
      baseQuery.subCategory = { $in: categorySubcategories.map((sub) => sub._id) };
    }

    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Now apply the status filter to the actual query
    Object.assign(query, baseQuery);

    if (status === "Active") {
      query.status = "Active";
      if (query.subCategory) {
        if (query.subCategory.$in) {
          query.subCategory.$in = query.subCategory.$in.filter(id => !effectivelyInactiveSubCategoryIds.some(eid => eid.equals(id)));
        } else {
          if (effectivelyInactiveSubCategoryIds.some(eid => eid.equals(query.subCategory))) {
            query.subCategory = null; // force empty
          }
        }
      } else {
        query.subCategory = { $nin: effectivelyInactiveSubCategoryIds };
      }
    } else if (status === "Inactive") {
      const baseSubCategory = query.subCategory;
      delete query.subCategory;
      
      const inactiveConditions = [
        { status: "Inactive" },
        { subCategory: { $in: effectivelyInactiveSubCategoryIds } }
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: inactiveConditions }
        ];
        delete query.$or;
      } else {
        query.$or = inactiveConditions;
      }

      if (baseSubCategory) {
        query.$and = query.$and || [];
        query.$and.push({ subCategory: baseSubCategory });
      }
    }


    // ------------------------------
    // PAGINATION
    // ------------------------------

    const parsedLimit = parseInt(limit) || 20;
    const parsedPage = parseInt(page) || 1;

    const skip = (parsedPage - 1) * parsedLimit;

    // ------------------------------
    // TOTAL COUNT
    // ------------------------------

    const total = await Product.countDocuments(query);

    // For stats, we use baseQuery so that they don't zero out when filtered by status
    const activeQuery = { ...baseQuery, status: "Active" };
    if (activeQuery.subCategory) {
        if (activeQuery.subCategory.$in) {
            activeQuery.subCategory.$in = activeQuery.subCategory.$in.filter(id => !effectivelyInactiveSubCategoryIds.some(eid => eid.equals(id)));
        } else if (effectivelyInactiveSubCategoryIds.some(eid => eid.equals(activeQuery.subCategory))) {
            activeQuery.subCategory = null;
        }
    } else {
        activeQuery.subCategory = { $nin: effectivelyInactiveSubCategoryIds };
    }

    const active = await Product.countDocuments(activeQuery);
    const baseTotal = await Product.countDocuments(baseQuery);
    const inactive = baseTotal - active;

    // ------------------------------
    // FETCH PRODUCTS
    // ------------------------------

    let productsQuery = Product.find(query)
      .populate({
        path: "subCategory",
        populate: {
          path: "parentCategory",
        },
      })
      .sort({ createdAt: -1 });

    if (parsedLimit > 0) {
      productsQuery = productsQuery.skip(skip).limit(parsedLimit);
    }

    const products = await productsQuery;

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      total,
      active,
      inactive,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      data: products,
    });
  } catch (error) {
    logger.error(`GET PRODUCTS ERROR: ${error.message}`, { error: error.stack });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ======================================================
// PUBLIC PRODUCTS
// ======================================================

router.get("/public/all", async (req, res) => {
  try {
    const { category, subCategory, search, limit, page } = req.query;

    // ======================================================
    // FETCH ADMIN PRODUCTS
    // ======================================================
    const products = await Product.find({
      status: "Active",
    })
      .populate({
        path: "subCategory",
        populate: {
          path: "parentCategory",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // ======================================================
    // FETCH VENDOR PRODUCTS
    // ======================================================
    const vendorProducts = await VendorProduct.find({
      isActive: true,
    })
      .populate("category")
      .populate("subCategory")
      .sort({ createdAt: -1 })
      .lean();

    // ======================================================
    // MERGE PRODUCTS
    // ======================================================
    let allProducts = [...products, ...vendorProducts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // ======================================================
    // APPLY FILTERS
    // ======================================================

    // Filter by category (slug, name, or ID)
    if (category) {
      const catLower = String(category).toLowerCase();
      allProducts = allProducts.filter((p) => {
        const parentCat = p.subCategory?.parentCategory || p.category;
        if (!parentCat) return false;

        const catId = String(parentCat._id || "").toLowerCase();
        const catSlug = String(parentCat.slug || "").toLowerCase();
        const catName = String(parentCat.name || "").toLowerCase();

        return catId === catLower || catSlug === catLower || catName === catLower;
      });
    }

    // Filter by subcategory (slug, name, or ID)
    if (subCategory) {
      const subCatLower = String(subCategory).toLowerCase();
      allProducts = allProducts.filter((p) => {
        const sub = p.subCategory;
        if (!sub) return false;

        const subId = String(sub._id || "").toLowerCase();
        const subSlug = String(sub.slug || "").toLowerCase();
        const subName = String(sub.name || "").toLowerCase();

        return subId === subCatLower || subSlug === subCatLower || subName === subCatLower;
      });
    }

    // Filter by search query (product name or brand)
    if (search) {
      const searchLower = String(search).toLowerCase();
      allProducts = allProducts.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const brand = String(p.brand || "").toLowerCase();

        return name.includes(searchLower) || brand.includes(searchLower);
      });
    }

    const parsedLimit = parseInt(limit) || 20;
    const parsedPage = parseInt(page) || 1;
    const total = allProducts.length;
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedProducts = allProducts.slice(startIndex, startIndex + parsedLimit);

    return res.status(200).json({
      success: true,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      data: paginatedProducts,
    });
  } catch (error) {
    logger.error(`PUBLIC PRODUCTS ERROR: ${error.message}`, { error: error.stack });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ======================================================
// GET SINGLE PRODUCT
// ======================================================

router.get("/public/:id", async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate({
      path: "subCategory",
      populate: {
        path: "parentCategory",
      },
    }).lean();

    if (!product) {
      product = await VendorProduct.findById(req.params.id)
        .populate("category")
        .populate("subCategory")
        .lean();
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await Variant.find({
      parentProduct: product._id,
      status: "Active",
    }).lean();

    product.variants = variants || [];

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.log("GET SINGLE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ======================================================
// UPDATE PRODUCT
// ======================================================

router.put("/update/:id", protect, cpUpload, async (req, res) => {
  try {
    const productId = req.params.id;

    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updatedData = {
      ...req.body,
    };

    // ------------------------------
    // DISCOUNT CALCULATION
    // ------------------------------

    if (updatedData.discountPercent && updatedData.price) {
      updatedData.discountPrice =
        Number(updatedData.price) -
        (Number(updatedData.price) * Number(updatedData.discountPercent)) / 100;
    }

    // ------------------------------
    // IMAGE UPDATE
    // ------------------------------

    const imageFields = ["image", "image1", "image2", "image3", "image4"];

    imageFields.forEach((field) => {
      const newImage = getImagePath(req.files, field);

      if (newImage) {
        updatedData[field] = newImage;
      }
    });

    // ------------------------------
    // UPDATE PRODUCT
    // ------------------------------

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatedData,
      {
        new: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.log("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ======================================================
// DELETE PRODUCT
// ======================================================

router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const productId = req.params.id;

    const deletedProduct = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// module.exports = router;
export default router;
