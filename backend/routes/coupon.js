/*
 * Handover note: Coupon API.
 * Admin endpoints manage coupon rules and usage history; user-facing endpoints apply/release/confirm coupons
 * while validating dates, status, limits, minimum spend, and product/category eligibility.
 */
// const express = require("express");
// const router = express.Router();

// const Coupon = require("../models/Coupon");
// const Products = require("../models/Product");
// const CouponUsage = require("../models/CouponUsages");

import express from "express";
import Coupon from "../models/Coupon.js";
import Products from "../models/Product.js";
import CouponUsage from "../models/CouponUsages.js";

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

//
// FORMAT COUPON RESPONSE
//
const normalizeCoupon = (coupon) => {
  const obj = coupon.toObject ? coupon.toObject() : coupon;
  const usageLimit = obj.usageLimit ?? obj.usages ?? 0;
  const usedCount = obj.usedCount ?? 0;
  const expiryDate = obj.expiryDate || obj.expires || null;
  const discountValue = obj.discountValue ?? obj.discount ?? 0;

  return {
    ...obj,

    couponCode: obj.code,
    discount: discountValue,
    discountType: obj.discountType,
    usages: usageLimit,
    usedCount,
    products: obj.applicableProducts || [],
    expires: expiryDate,

    isExpired: expiryDate ? new Date(expiryDate) < new Date() : false,

    remainingUsages:
      usageLimit === 0 ? "Unlimited" : Math.max(usageLimit - usedCount, 0),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX: /products/search MUST be defined BEFORE /:id
// Otherwise Express matches "products" as an :id value and this route is never reached
// ─────────────────────────────────────────────────────────────────────────────

//
// SEARCH PRODUCTS (for Product Coupons)
//
router.get("/products/search", async (req, res) => {
  try {
    const search = req.query.search || "";
    const limit = Number(req.query.limit) || 10;

    const query = {};

    if (search.trim()) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    const products = await Products.find(query)
      .select("name price discountPrice image stock")
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLY COUPON
// Called from frontend at checkout before order is placed.
// Validates the coupon, checks per-user usage, records it in CouponUsage,
// and increments usedCount on the Coupon document.
//
// Body: { couponCode, cartTotal, productId? }
// Auth: requires req.user._id (attach via your auth middleware)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/apply", async (req, res) => {
  try {
    const { couponCode, cartTotal, productId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required to apply coupon",
      });
    }

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    //
    // FIND COUPON
    //
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    //
    // VALIDATE COUPON
    //
    if (!coupon.isValidCoupon()) {
      const reason =
        coupon.status === "inactive"
          ? "This coupon is inactive"
          : coupon.expiryDate <= new Date()
            ? "This coupon has expired"
            : "This coupon has reached its usage limit";

      return res.status(400).json({
        success: false,
        message: reason,
      });
    }

    //
    // CHECK PER-USER USAGE
    //
    const userUsesCount = await CouponUsage.countDocuments({
      coupon: coupon._id,
      user: userId,
      status: { $in: ["applied", "confirmed"] },
    });

    if (userUsesCount >= (coupon.maxUsesPerUser || 1)) {
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum usage limit for this coupon",
      });
    }

    //
    // MINIMUM ORDER CHECK
    //
    const orderAmount = toNumber(cartTotal);

    if (
      coupon.minimumOrderAmount > 0 &&
      orderAmount < coupon.minimumOrderAmount
    ) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of ₹${coupon.minimumOrderAmount} required for this coupon`,
      });
    }

    //
    // PRODUCT COUPON VALIDATION
    //
    if (coupon.type === "product") {
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "This coupon is only valid for specific products",
        });
      }

      const isApplicable = coupon.applicableProducts.some(
        (id) => id.toString() === productId.toString(),
      );

      if (!isApplicable) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not applicable to the selected product",
        });
      }
    }

    //
    // CALCULATE DISCOUNT
    //
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = (orderAmount * coupon.discountValue) / 100;

      // Cap at maxDiscountAmount if set
      if (coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      // fixed
      discountAmount = coupon.discountValue;
    }

    // Discount can't exceed cart total
    discountAmount = Math.min(discountAmount, orderAmount);

    //
    // RECORD USAGE
    //
    const usage = new CouponUsage({
      coupon: coupon._id,
      couponCode: coupon.code,
      user: userId,
      product: coupon.type === "product" ? productId : null,
      discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      status: "applied",
      cartTotal: orderAmount,
    });

    await usage.save();

    //
    // INCREMENT usedCount
    //
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        cartTotal: orderAmount,
        finalTotal: orderAmount - discountAmount,
        usageId: usage._id,
      },
    });
  } catch (error) {
    console.log(error);

    // Duplicate key = user already used this coupon (race condition safety)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already used this coupon",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE COUPON (call when order is cancelled)
// Marks usage as cancelled and decrements usedCount
// Body: { usageId }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/release", async (req, res) => {
  try {
    const { usageId } = req.body;
    const userId = req.user?.id;

    const usage = await CouponUsage.findOne({ _id: usageId, user: userId });

    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "Usage record not found",
      });
    }

    if (usage.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Coupon already released",
      });
    }

    usage.status = "cancelled";
    await usage.save();

    // Decrement usedCount (don't go below 0)
    await Coupon.findByIdAndUpdate(usage.coupon, {
      $inc: { usedCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Coupon released successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM COUPON USAGE (call after order is placed successfully)
// Body: { usageId, orderId }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/confirm-usage", async (req, res) => {
  try {
    const { usageId, orderId } = req.body;

    const usage = await CouponUsage.findByIdAndUpdate(
      usageId,
      { status: "confirmed", order: orderId },
      { new: true },
    );

    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "Usage record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coupon usage confirmed",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET COUPON USAGE HISTORY (Admin)
// Query params: couponId?, userId?, status?, page, limit
// ─────────────────────────────────────────────────────────────────────────────
router.get("/usage-history", async (req, res) => {
  try {
    const { couponId, userId, status, page = 1, limit = 10 } = req.query;

    const query = {};

    if (couponId) query.coupon = couponId;
    if (userId) query.user = userId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const usages = await CouponUsage.find(query)
      .populate("user", "name email phone")
      .populate("coupon", "code discountType discountValue type")
      .populate("product", "name price image")
      .populate("order", "totalPrice")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CouponUsage.countDocuments(query);

    res.status(200).json({
      success: true,

      pagination: {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
      },

      count: usages.length,
      data: usages,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// CREATE COUPON
//
router.post("/create", async (req, res) => {
  try {
    const {
      couponCode,
      type,
      discountType,
      discountValue,
      discount,
      minimumOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usages,
      expiryDate,
      expires,
      status,
      applicableProducts,
      products,
      description,
      bannerImage,
      isFeatured,
      maxUsesPerUser,
    } = req.body;

    const normalizedDiscountValue = discountValue ?? discount;
    const normalizedUsageLimit = usageLimit ?? usages ?? 0;
    const normalizedExpiryDate = expiryDate ?? expires;
    const normalizedProducts = applicableProducts ?? products ?? [];

    //
    // VALIDATIONS
    //
    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!discountType) {
      return res.status(400).json({
        success: false,
        message: "Discount type is required",
      });
    }

    if (!normalizedDiscountValue || normalizedDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid discount value required",
      });
    }

    if (!normalizedExpiryDate) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is required",
      });
    }

    //
    // DUPLICATE CHECK
    //
    const existingCoupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon already exists",
      });
    }

    //
    // PRODUCT COUPON VALIDATION
    //
    if (
      type === "product" &&
      (!normalizedProducts || normalizedProducts.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one product",
      });
    }

    if (
      type === "product" &&
      normalizedProducts &&
      normalizedProducts.length > 0
    ) {
      const foundProducts = await Products.find({
        _id: { $in: normalizedProducts },
      });

      if (foundProducts.length !== normalizedProducts.length) {
        return res.status(400).json({
          success: false,
          message: "Some products are invalid",
        });
      }
    }

    //
    // CREATE
    //
    const coupon = new Coupon({
      code: couponCode.toUpperCase(),
      type: type || "cart",

      discountType: discountType,
      discountValue: toNumber(normalizedDiscountValue),

      minimumOrderAmount: minimumOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || 0,

      usageLimit: toNumber(normalizedUsageLimit),

      expiryDate: normalizedExpiryDate,

      status: status || "active",

      applicableProducts: type === "product" ? normalizedProducts : [],

      description: description || "",
      bannerImage: bannerImage || "",
      isFeatured: isFeatured || false,
      maxUsesPerUser: maxUsesPerUser || 1,
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: normalizeCoupon(coupon),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// GET ALL COUPONS
//
router.get("/", async (req, res) => {
  try {
    // Automatically turn expired coupons inactive
    await Coupon.updateMany(
      { expiryDate: { $lt: new Date() }, status: { $ne: "inactive" } },
      { $set: { status: "inactive" } }
    );

    const { status, type, featured, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (featured) query.isFeatured = featured === "true";

    if (search) {
      query.code = {
        $regex: search,
        $options: "i",
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const coupons = await Coupon.find(query)
      .populate("applicableProducts", "name price image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      success: true,

      pagination: {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
      },

      count: coupons.length,
      data: coupons.map(normalizeCoupon),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// GET SINGLE COUPON
//
router.get("/:id", async (req, res) => {
  try {
    // Automatically turn expired coupons inactive
    await Coupon.updateMany(
      { expiryDate: { $lt: new Date() }, status: { $ne: "inactive" } },
      { $set: { status: "inactive" } }
    );

    const coupon = await Coupon.findById(req.params.id).populate(
      "applicableProducts",
      "name price image stock",
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      data: normalizeCoupon(coupon),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// UPDATE COUPON
//
router.put("/update/:id", async (req, res) => {
  try {
    const {
      couponCode,
      type,
      discountType,
      discountValue,
      discount,
      minimumOrderAmount,
      maxDiscountAmount,
      usageLimit,
      usages,
      expiryDate,
      expires,
      status,
      applicableProducts,
      products,
      description,
      bannerImage,
      isFeatured,
      maxUsesPerUser,
    } = req.body;

    const normalizedDiscountValue = discountValue ?? discount;
    const normalizedUsageLimit = usageLimit ?? usages;
    const normalizedExpiryDate = expiryDate ?? expires;
    const normalizedProducts = applicableProducts ?? products;

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    if (couponCode !== undefined && !couponCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (couponCode) {
      const existingCoupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists",
        });
      }

      coupon.code = couponCode.toUpperCase();
    }

    if (
      type === "product" &&
      normalizedProducts &&
      normalizedProducts.length > 0
    ) {
      const foundProducts = await Products.find({
        _id: { $in: normalizedProducts },
      });

      if (foundProducts.length !== normalizedProducts.length) {
        return res.status(400).json({
          success: false,
          message: "Some products are invalid",
        });
      }
    }

    if (type) coupon.type = type;
    if (discountType) coupon.discountType = discountType;

    if (normalizedDiscountValue !== undefined) {
      coupon.discountValue = toNumber(
        normalizedDiscountValue,
        coupon.discountValue,
      );
    }

    if (minimumOrderAmount !== undefined)
      coupon.minimumOrderAmount = minimumOrderAmount;
    if (maxDiscountAmount !== undefined)
      coupon.maxDiscountAmount = maxDiscountAmount;

    if (normalizedUsageLimit !== undefined) {
      coupon.usageLimit = toNumber(normalizedUsageLimit, coupon.usageLimit);
    }

    if (normalizedExpiryDate) coupon.expiryDate = normalizedExpiryDate;
    if (status) coupon.status = status;
    if (description !== undefined) coupon.description = description;
    if (bannerImage !== undefined) coupon.bannerImage = bannerImage;
    if (isFeatured !== undefined) coupon.isFeatured = isFeatured;
    if (maxUsesPerUser !== undefined) coupon.maxUsesPerUser = maxUsesPerUser;

    if (type !== undefined || normalizedProducts !== undefined) {
      const nextType = type || coupon.type;
      coupon.applicableProducts =
        nextType === "product"
          ? normalizedProducts || coupon.applicableProducts
          : [];
    }

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: normalizeCoupon(coupon),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// DELETE COUPON
//
router.delete("/delete/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//
// TOGGLE COUPON STATUS
//
router.patch("/toggle-status/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    coupon.status = coupon.status === "active" ? "inactive" : "active";

    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.status} successfully`,
      data: normalizeCoupon(coupon),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// module.exports = router;
export default router;


// const express = require("express");
// const router = express.Router();

// const Coupon = require("../models/Coupon");
// const Products = require("../models/Product");

// const toNumber = (value, fallback = 0) => {
//   const number = Number(value);
//   return Number.isNaN(number) ? fallback : number;
// };

// //
// // FORMAT COUPON RESPONSE
// //
// const normalizeCoupon = (coupon) => {
//   const obj = coupon.toObject ? coupon.toObject() : coupon;
//   const usageLimit = obj.usageLimit ?? obj.usages ?? 0;
//   const usedCount = obj.usedCount ?? 0;
//   const expiryDate = obj.expiryDate || obj.expires || null;
//   const discountValue = obj.discountValue ?? obj.discount ?? 0;

//   return {
//     ...obj,

//     couponCode: obj.code,
//     discount: discountValue,
//     usages: usageLimit,
//     usedCount,
//     products: obj.applicableProducts || [],
//     expires: expiryDate,

//     isExpired: expiryDate ? new Date(expiryDate) < new Date() : false,

//     remainingUsages:
//       usageLimit === 0
//         ? "Unlimited"
//         : Math.max(usageLimit - usedCount, 0),
//   };
// };

// //
// // CREATE COUPON
// //
// router.post("/create", async (req, res) => {
//   try {
//     const {
//       couponCode,
//       type,
//       discountType,
//       discountValue,
//       discount,
//       minimumOrderAmount,
//       maxDiscountAmount,
//       usageLimit,
//       usages,
//       expiryDate,
//       expires,
//       status,
//       applicableProducts,
//       products,
//       description,
//       bannerImage,
//       isFeatured,
//     } = req.body;
//     const normalizedDiscountValue = discountValue ?? discount;
//     const normalizedUsageLimit = usageLimit ?? usages ?? 0;
//     const normalizedExpiryDate = expiryDate ?? expires;
//     const normalizedProducts = applicableProducts ?? products ?? [];

//     //
//     // VALIDATIONS
//     //
//     if (!couponCode) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code is required",
//       });
//     }

//     if (!discountType && normalizedDiscountValue === undefined) {
//       return res.status(400).json({
//         success: false,
//         message: "Discount type is required",
//       });
//     }

//     if (!normalizedDiscountValue || normalizedDiscountValue <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid discount value required",
//       });
//     }

//     if (!normalizedExpiryDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Expiry date is required",
//       });
//     }

//     //
//     // DUPLICATE CHECK
//     //
//     const existingCoupon = await Coupon.findOne({
//       code: couponCode.toUpperCase(),
//     });

//     if (existingCoupon) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon already exists",
//       });
//     }

//     //
//     // PRODUCT COUPON VALIDATION
//     //
//     if (
//       type === "product" &&
//       (!normalizedProducts || normalizedProducts.length === 0)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Select at least one product",
//       });
//     }

//     //
//     // VALIDATE PRODUCTS
//     //
//     if (
//       type === "product" &&
//       normalizedProducts &&
//       normalizedProducts.length > 0
//     ) {
//       const products = await Products.find({
//         _id: { $in: normalizedProducts },
//       });

//       if (products.length !== normalizedProducts.length) {
//         return res.status(400).json({
//           success: false,
//           message: "Some products are invalid",
//         });
//       }
//     }

//     //
//     // CREATE COUPON
//     //
//     const coupon = new Coupon({
//       code: couponCode.toUpperCase(),
//       type: type || "cart",

//       discountType: discountType || "percentage",
//       discountValue: toNumber(normalizedDiscountValue),

//       minimumOrderAmount: minimumOrderAmount || 0,
//       maxDiscountAmount: maxDiscountAmount || 0,

//       usageLimit: toNumber(normalizedUsageLimit),

//       expiryDate: normalizedExpiryDate,

//       status: status || "active",

//       applicableProducts: type === "product" ? normalizedProducts : [],

//       description: description || "",
//       bannerImage: bannerImage || "",
//       isFeatured: isFeatured || false,
//     });

//     await coupon.save();

//     res.status(201).json({
//       success: true,
//       message: "Coupon created successfully",
//       data: normalizeCoupon(coupon),
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // GET ALL COUPONS
// //
// router.get("/", async (req, res) => {
//   try {
//     const { status, type, featured, search, page = 1, limit = 10 } = req.query;

//     const query = {};

//     //
//     // FILTERS
//     //
//     if (status) {
//       query.status = status;
//     }

//     if (type) {
//       query.type = type;
//     }

//     if (featured) {
//       query.isFeatured = featured === "true";
//     }

//     if (search) {
//       query.code = {
//         $regex: search,
//         $options: "i",
//       };
//     }

//     const skip = (Number(page) - 1) * Number(limit);

//     const coupons = await Coupon.find(query)
//       .populate("applicableProducts", "name price image")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await Coupon.countDocuments(query);

//     res.status(200).json({
//       success: true,

//       pagination: {
//         total,
//         currentPage: Number(page),
//         totalPages: Math.ceil(total / limit),
//       },

//       count: coupons.length,

//       data: coupons.map(normalizeCoupon),
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // GET SINGLE COUPON
// //
// router.get("/:id", async (req, res) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id).populate(
//       "applicableProducts",
//       "name price image stock",
//     );

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: normalizeCoupon(coupon),
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // UPDATE COUPON
// //
// router.put("/update/:id", async (req, res) => {
//   try {
//     const {
//       couponCode,
//       type,
//       discountType,
//       discountValue,
//       discount,
//       minimumOrderAmount,
//       maxDiscountAmount,
//       usageLimit,
//       usages,
//       expiryDate,
//       expires,
//       status,
//       applicableProducts,
//       products,
//       description,
//       bannerImage,
//       isFeatured,
//     } = req.body;
//     const normalizedDiscountValue = discountValue ?? discount;
//     const normalizedUsageLimit = usageLimit ?? usages;
//     const normalizedExpiryDate = expiryDate ?? expires;
//     const normalizedProducts = applicableProducts ?? products;

//     const coupon = await Coupon.findById(req.params.id);

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     //
//     // DUPLICATE CHECK
//     //
//     if (couponCode !== undefined && !couponCode.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code is required",
//       });
//     }

//     if (couponCode) {
//       const existingCoupon = await Coupon.findOne({
//         code: couponCode.toUpperCase(),
//         _id: { $ne: req.params.id },
//       });

//       if (existingCoupon) {
//         return res.status(400).json({
//           success: false,
//           message: "Coupon code already exists",
//         });
//       }

//       coupon.code = couponCode.toUpperCase();
//     }

//     //
//     // PRODUCT VALIDATION
//     //
//     if (
//       type === "product" &&
//       normalizedProducts &&
//       normalizedProducts.length > 0
//     ) {
//       const products = await Products.find({
//         _id: { $in: normalizedProducts },
//       });

//       if (products.length !== normalizedProducts.length) {
//         return res.status(400).json({
//           success: false,
//           message: "Some products are invalid",
//         });
//       }
//     }

//     //
//     // UPDATE FIELDS
//     //
//     if (type) coupon.type = type;

//     if (discountType) coupon.discountType = discountType;

//     if (normalizedDiscountValue !== undefined) {
//       coupon.discountValue = toNumber(normalizedDiscountValue, coupon.discountValue);
//     }

//     if (minimumOrderAmount !== undefined) {
//       coupon.minimumOrderAmount = minimumOrderAmount;
//     }

//     if (maxDiscountAmount !== undefined) {
//       coupon.maxDiscountAmount = maxDiscountAmount;
//     }

//     if (normalizedUsageLimit !== undefined) {
//       coupon.usageLimit = toNumber(normalizedUsageLimit, coupon.usageLimit);
//     }

//     if (normalizedExpiryDate) {
//       coupon.expiryDate = normalizedExpiryDate;
//     }

//     if (status) {
//       coupon.status = status;
//     }

//     if (description !== undefined) {
//       coupon.description = description;
//     }

//     if (bannerImage !== undefined) {
//       coupon.bannerImage = bannerImage;
//     }

//     if (isFeatured !== undefined) {
//       coupon.isFeatured = isFeatured;
//     }

//     if (type !== undefined || normalizedProducts !== undefined) {
//       const nextType = type || coupon.type;
//       coupon.applicableProducts =
//         nextType === "product" ? normalizedProducts || coupon.applicableProducts : [];
//     }

//     await coupon.save();

//     res.status(200).json({
//       success: true,
//       message: "Coupon updated successfully",
//       data: normalizeCoupon(coupon),
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // DELETE COUPON
// //
// router.delete("/delete/:id", async (req, res) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id);

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     await Coupon.findByIdAndDelete(req.params.id);

//     res.status(200).json({
//       success: true,
//       message: "Coupon deleted successfully",
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // TOGGLE COUPON STATUS
// //
// router.patch("/toggle-status/:id", async (req, res) => {
//   try {
//     const coupon = await Coupon.findById(req.params.id);

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     coupon.status = coupon.status === "active" ? "inactive" : "active";

//     await coupon.save();

//     res.status(200).json({
//       success: true,
//       message: `Coupon ${coupon.status} successfully`,
//       data: normalizeCoupon(coupon),
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// //
// // SEARCH PRODUCTS
// // For Product Coupons
// //
// router.get("/products/search", async (req, res) => {
//   try {
//     const search = req.query.search || "";
//     const limit = Number(req.query.limit) || 10;

//     const query = {};

//     if (search.trim()) {
//       query.name = {
//         $regex: search,
//         $options: "i",
//       };
//     }

//     const products = await Products.find(query)
//       .select("name price discountPrice image stock")
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: products.length,
//       data: products,
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// module.exports = router;
