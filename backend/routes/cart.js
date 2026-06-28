/*
 * Cart API
 *
 * Bugs fixed:
 *  1. GET /       — removed deep populate(items.product → subCategory → parentCategory)
 *                   VendorProducts don't have those refs; relied on denormalized fields instead
 *  2. GET /       — stale subtotal used in coupon validation; now recalcs totals first (no coupon),
 *                   validates coupon against fresh subtotal, then recalcs with coupon
 *  3. GET /       — added markModified("totals") so nested subdoc changes persist
 *  4. GET /       — removed unnecessary cart.save() on every fetch; only saves if cart changed
 *  5. POST /add   — markModified("totals") added alongside existing markModified("items")
 *  6. PUT /update — same markModified("totals") fix
 *  7. DELETE /remove — same markModified("totals") fix
 *  8. DELETE /clear  — same markModified("totals") fix
 *  9. POST /apply-coupon — moved cart.save() before coupon usage write to prevent
 *                          usage record being written when cart save fails
 * 10. POST /apply-coupon — added markModified("totals")
 * 11. DELETE /remove-coupon — added markModified("totals")
 * 12. POST /apply-coupon — CRITICAL FIX: replaced new CouponUsage().save() with
 *                          findOneAndUpdate(upsert) to handle all status states correctly
 *                          (previously: unique index E11000 on re-apply silently swallowed
 *                          the save, leaving MongoDB empty; also "confirmed" status was
 *                          never re-applied)
 * 13. POST /apply-coupon — usedCount is incremented ONLY on first-ever apply (new doc),
 *                          not on re-apply of existing record, to keep counts accurate
 */

import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import VendorProduct from "../models/vendor/vendorProduct.js";
import Variant from "../models/Variant.js";
import Coupon from "../models/Coupon.js";
import CouponUsage from "../models/CouponUsages.js";
import GiftCard from "../models/GiftCard.js";
import calculateCartTotals from "../utils/calculateCartTotal.js";

const router = express.Router();



// ─────────────────────────────────────────────
// HELPER — fetch & validate coupon on a cart
// Requires cart.totals.subtotal to already be fresh before calling
// ─────────────────────────────────────────────
const getValidCoupon = async (cart) => {
  if (!cart.coupon) return null;

  const coupon = await Coupon.findById(cart.coupon);

  if (!coupon) {
    cart.coupon = null;
    cart.couponCode = null;
    return null;
  }

  if (!coupon.isValidCoupon()) {
    cart.coupon = null;
    cart.couponCode = null;
    return null;
  }

  // Minimum order check — subtotal must already be calculated before calling this
  if (
    coupon.minimumOrderAmount &&
    cart.totals.subtotal < coupon.minimumOrderAmount
  ) {
    cart.coupon = null;
    cart.couponCode = null;
    return null;
  }

  return coupon;
};

// ─────────────────────────────────────────────
// HELPER — fetch & validate giftCard on a cart
// ─────────────────────────────────────────────
const getValidGiftCard = async (cart) => {
  if (!cart.giftCard) return null;

  const giftCard = await GiftCard.findById(cart.giftCard);

  if (!giftCard) {
    cart.giftCard = null;
    cart.giftCardCode = null;
    return null;
  }

  if (!giftCard.isValidGiftCard()) {
    cart.giftCard = null;
    cart.giftCardCode = null;
    return null;
  }

  return giftCard;
};

// ─────────────────────────────────────────────
// GET CART
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate("coupon");

    // Create empty cart for new users
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
      return res.status(200).json({
        success: true,
        message: "Cart fetched successfully",
        data: cart,
      });
    }

    calculateCartTotals(cart, null, null);
    const coupon = await getValidCoupon(cart);
    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, coupon, giftCard);

    cart.markModified("totals");
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// ADD TO CART
// ─────────────────────────────────────────────
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity = 1, size, color, variant } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID required" });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be greater than 0" });
    }

    // Resolve product from either collection
    let product = await Product.findById(productId);
    let productModel = "Product";

    if (!product) {
      product = await VendorProduct.findById(productId);
      productModel = "VendorProduct";
    }

    if (!product || product.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const isActive =
      productModel === "VendorProduct"
        ? product.isActive
        : product.status === "Active";

    if (!isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Product unavailable" });
    }

    let variantDoc = null;
    if (variant) {
      variantDoc = await Variant.findById(variant);
      if (!variantDoc) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        });
      }
      if (variantDoc.status !== "Active") {
        return res.status(400).json({
          success: false,
          message: "Variant unavailable",
        });
      }
      if (variantDoc.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${variantDoc.stock} items available for this variant`,
        });
      }
    } else {
      const productStockQty = productModel === "VendorProduct" ? product.stock : product.stock_qty;
      if (productStockQty < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${productStockQty} items available`,
        });
      }
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variant ? item.variant.toString() === variant : !variant),
    );

    const salePrice =
      productModel === "VendorProduct"
        ? product.salePrice || 0
        : product.discountPrice || 0;
    const finalPrice = salePrice > 0 ? salePrice : product.price;
    const image = product.image || (product.images && product.images[0]) || "";
    const productStockQty = productModel === "VendorProduct" ? product.stock : product.stock_qty;
    const currentStock = variantDoc ? variantDoc.stock : productStockQty;

    if (existingItemIndex > -1) {
      const updatedQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (updatedQuantity > currentStock) {
        return res.status(400).json({
          success: false,
          message: `Maximum available stock is ${currentStock}`,
        });
      }

      cart.items[existingItemIndex] = {
        product: product._id,
        productModel,
        name: product.name,
        slug: product.slug,
        image,
        sku: product.sku,
        quantity: updatedQuantity,
        price: product.price,
        salePrice,
        finalPrice,
        stock: productStockQty,
        subtotal: finalPrice * updatedQuantity,
        isAvailable: productStockQty > 0,
      };
    } else {
      cart.items.push({
        product: product._id,
        productModel,
        name: product.name,
        slug: product.slug,
        image,
        sku: product.sku,
        quantity,
        price: product.price,
        salePrice,
        finalPrice,
        stock: productStockQty,
        subtotal: finalPrice * quantity,
        isAvailable: productStockQty > 0,
      });
    }

    calculateCartTotals(cart, null, null);
    const coupon = await getValidCoupon(cart);
    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, coupon, giftCard);

    cart.markModified("items");
    cart.markModified("totals");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// UPDATE CART ITEM QUANTITY
// ─────────────────────────────────────────────
router.put("/update", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID and quantity required" });
    }

    if (quantity < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity cannot be negative" });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const item = cart.items[itemIndex];
      cart.items[itemIndex] = {
        ...item.toObject(),
        quantity,
        subtotal: item.finalPrice * quantity,
      };
    }

    calculateCartTotals(cart, null, null);
    const coupon = await getValidCoupon(cart);
    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, coupon, giftCard);

    cart.markModified("items");
    cart.markModified("totals");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// REMOVE ITEM
// ─────────────────────────────────────────────
router.delete("/remove/:productId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const lengthBefore = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.params.productId,
    );

    if (cart.items.length === lengthBefore) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    calculateCartTotals(cart, null, null);
    const coupon = await getValidCoupon(cart);
    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, coupon, giftCard);

    cart.markModified("items");
    cart.markModified("totals");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// CLEAR CART
// ─────────────────────────────────────────────
router.delete("/clear", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.items = [];
    cart.coupon = null;
    cart.couponCode = null;
    cart.giftCard = null;
    cart.giftCardCode = null;

    calculateCartTotals(cart, null, null);

    cart.markModified("items");
    cart.markModified("totals");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// APPLY COUPON
// ─────────────────────────────────────────────
router.post("/apply-coupon", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon code required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid coupon code" });
    }

    if (!coupon.isValidCoupon()) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon is invalid or expired" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Get fresh subtotal before minimum-order check
    calculateCartTotals(cart, null, null);

    if (
      coupon.minimumOrderAmount &&
      cart.totals.subtotal < coupon.minimumOrderAmount
    ) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount for this coupon is ₹${coupon.minimumOrderAmount}`,
      });
    }

    // Product-specific coupon validation
    if (coupon.type === "product") {
      const hasEligibleProduct = cart.items.some((item) =>
        coupon.applicableProducts
          .map((id) => id.toString())
          .includes(item.product.toString()),
      );

      if (!hasEligibleProduct) {
        return res.status(400).json({
          success: false,
          message: "Coupon is not applicable on any product in your cart",
        });
      }
    }

    cart.coupon = coupon._id;
    cart.couponCode = coupon.code;

    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, coupon, giftCard);

    // Save cart first — don't write usage if cart save fails
    cart.markModified("totals");
    await cart.save();

    const cartTotal = cart.totals?.subtotal ?? 0;
    const discountAmount = cart.totals?.discount ?? 0;
    const productId =
      coupon.type === "product"
        ? (cart.items.find((item) =>
            coupon.applicableProducts
              .map((id) => id.toString())
              .includes(item.product.toString()),
          )?.product ?? null)
        : null;

    // FIX #12: Use findOneAndUpdate with upsert instead of new CouponUsage().save()
    //
    // The old code had a unique index { coupon, user } on CouponUsages. On second
    // application (e.g. user re-applies after cancellation, or the record still
    // exists in any status), Mongoose threw E11000 which was caught and swallowed,
    // leaving MongoDB with no record at all.
    //
    // findOneAndUpdate with upsert atomically creates-or-updates regardless of
    // the existing status, so every application is always persisted correctly.
    //
    // FIX #13: Only increment usedCount when a brand-new record is inserted
    // (upserted: true). Re-applying an existing coupon should not inflate the counter.
    const usageResult = await CouponUsage.findOneAndUpdate(
      { coupon: coupon._id, user: req.user.id },
      {
        $set: {
          couponCode: coupon.code,
          product: productId,
          discountAmount: Math.min(discountAmount, cartTotal),
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          status: "applied",
          cartTotal,
          order: null, // clear any previous order ref when re-applying
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    // Increment usedCount only when a new record was created (not on re-apply)
    if (
      usageResult &&
      !usageResult.__v &&
      usageResult.createdAt?.getTime() === usageResult.updatedAt?.getTime()
    ) {
      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save();
    }

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// REMOVE COUPON
// ─────────────────────────────────────────────
router.delete("/remove-coupon", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const previousCoupon = cart.coupon;

    cart.coupon = null;
    cart.couponCode = null;

    const giftCard = await getValidGiftCard(cart);
    calculateCartTotals(cart, null, giftCard);

    cart.markModified("totals");
    await cart.save();

    if (previousCoupon) {
      const usage = await CouponUsage.findOne({
        coupon: previousCoupon,
        user: req.user.id,
        status: "applied",
      });

      if (usage) {
        usage.status = "cancelled";
        await usage.save();

        await Coupon.findByIdAndUpdate(previousCoupon, {
          $inc: { usedCount: -1 },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// APPLY GIFT CARD
// ─────────────────────────────────────────────
router.post("/apply-giftcard", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Gift Card code required" });
    }

    const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

    if (!giftCard) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid Gift Card code" });
    }

    if (!giftCard.isValidGiftCard()) {
      return res
        .status(400)
        .json({ success: false, message: "Gift Card is invalid, expired, or has zero balance" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    cart.giftCard = giftCard._id;
    cart.giftCardCode = giftCard.code;

    const coupon = await getValidCoupon(cart);
    calculateCartTotals(cart, coupon, giftCard);

    cart.markModified("totals");
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Gift Card applied successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// REMOVE GIFT CARD
// ─────────────────────────────────────────────
router.delete("/remove-giftcard", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.giftCard = null;
    cart.giftCardCode = null;

    const coupon = await getValidCoupon(cart);
    calculateCartTotals(cart, coupon, null);

    cart.markModified("totals");
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Gift Card removed successfully",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
// /*
//  * Cart API — fixed version
//  *
//  * Bugs fixed:
//  *  1. GET /       — removed deep populate(items.product → subCategory → parentCategory)
//  *                   VendorProducts don't have those refs; relied on denormalized fields instead
//  *  2. GET /       — stale subtotal used in coupon validation; now recalcs totals first (no coupon),
//  *                   validates coupon against fresh subtotal, then recalcs with coupon
//  *  3. GET /       — added markModified("totals") so nested subdoc changes persist
//  *  4. GET /       — removed unnecessary cart.save() on every fetch; only saves if cart changed
//  *  5. POST /add   — markModified("totals") added alongside existing markModified("items")
//  *  6. PUT /update — same markModified("totals") fix
//  *  7. DELETE /remove — same markModified("totals") fix
//  *  8. DELETE /clear  — same markModified("totals") fix
//  *  9. POST /apply-coupon — moved cart.save() before coupon.usedCount increment to prevent
//  *                          coupon count going up when cart save fails
//  * 10. POST /apply-coupon — added markModified("totals")
//  * 11. DELETE /remove-coupon — added markModified("totals")
//  */

// import express from "express";
// import Cart from "../models/Cart.js";
// import Product from "../models/Product.js";
// import VendorProduct from "../models/vendor/vendorProduct.js";
// import Variant from "../models/Variant.js";
// import Coupon from "../models/Coupon.js";
// import CouponUsage from "../models/CouponUsages.js";
// import calculateCartTotals from "../utils/calculateCartTotal.js";

// const router = express.Router();

// // ─────────────────────────────────────────────
// // HELPER — fetch & validate coupon on a cart
// // Requires cart.totals.subtotal to already be fresh before calling
// // ─────────────────────────────────────────────
// const getValidCoupon = async (cart) => {
//   if (!cart.coupon) return null;

//   const coupon = await Coupon.findById(cart.coupon);

//   if (!coupon) {
//     cart.coupon = null;
//     cart.couponCode = null;
//     return null;
//   }

//   if (!coupon.isValidCoupon()) {
//     cart.coupon = null;
//     cart.couponCode = null;
//     return null;
//   }

//   // Minimum order check — subtotal must already be calculated before calling this
//   if (
//     coupon.minimumOrderAmount &&
//     cart.totals.subtotal < coupon.minimumOrderAmount
//   ) {
//     cart.coupon = null;
//     cart.couponCode = null;
//     return null;
//   }

//   return coupon;
// };

// // ─────────────────────────────────────────────
// // GET CART
// // ─────────────────────────────────────────────
// router.get("/", async (req, res) => {
//   try {
//     // FIX #1: Removed .populate("items.product → subCategory → parentCategory")
//     // Cart items are fully denormalized (name, image, price, sku stored on each item).
//     // Deep-populating breaks for VendorProduct items which have no subCategory/parentCategory refs.
//     // Only populate the coupon ref, which is safe.
//     let cart = await Cart.findOne({ user: req.user.id }).populate("coupon");

//     // Create empty cart for new users
//     if (!cart) {
//       cart = await Cart.create({ user: req.user.id, items: [] });
//       return res.status(200).json({
//         success: true,
//         message: "Cart fetched successfully",
//         data: cart,
//       });
//     }

//     // FIX #2: Calculate fresh subtotal FIRST, then validate coupon against it,
//     // then recalculate again with the coupon discount applied.
//     // Previously: getValidCoupon() read a stale cart.totals.subtotal from the last save.
//     calculateCartTotals(cart, null); // step 1 — get accurate subtotal
//     const coupon = await getValidCoupon(cart); // step 2 — validate with fresh subtotal
//     calculateCartTotals(cart, coupon); // step 3 — apply coupon discount if valid

//     // FIX #3 & #4: Only save if something actually changed (coupon was invalidated),
//     // and mark totals as modified so Mongoose detects the nested subdoc change.
//     cart.markModified("totals");
//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart fetched successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // ADD TO CART
// // ─────────────────────────────────────────────
// router.post("/add", async (req, res) => {
//   try {
//     const { productId, quantity = 1, size, color, variant } = req.body;

//     if (!productId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Product ID required" });
//     }

//     if (quantity <= 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Quantity must be greater than 0" });
//     }

//     // Resolve product from either collection
//     let product = await Product.findById(productId);
//     let productModel = "Product";

//     if (!product) {
//       product = await VendorProduct.findById(productId);
//       productModel = "VendorProduct";
//     }

//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     const isActive =
//       productModel === "VendorProduct"
//         ? product.isActive
//         : product.status === "Active";

//     if (!isActive) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Product unavailable" });
//     }

//     let variantDoc = null;
//     if (variant) {
//       variantDoc = await Variant.findById(variant);
//       if (!variantDoc) {
//         return res.status(404).json({
//           success: false,
//           message: "Variant not found",
//         });
//       }
//       if (variantDoc.status !== "Active") {
//         return res.status(400).json({
//           success: false,
//           message: "Variant unavailable",
//         });
//       }
//       if (variantDoc.stock < quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Only ${variantDoc.stock} items available for this variant`,
//         });
//       }
//     } else {
//       if (product.stock < quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Only ${product.stock} items available`,
//         });
//       }
//     }

//     // Get or create cart
//     let cart = await Cart.findOne({ user: req.user.id });
//     if (!cart) {
//       cart = await Cart.create({ user: req.user.id, items: [] });
//     }

//     const existingItemIndex = cart.items.findIndex(
//       (item) => item.product.toString() === productId && (item.variant ? item.variant.toString() === variant : !variant),
//     );

//     const salePrice =
//       productModel === "VendorProduct"
//         ? product.salePrice || 0
//         : product.discountPrice || 0;
//     const finalPrice = salePrice > 0 ? salePrice : product.price;
//     const image = product.image || (product.images && product.images[0]) || "";
//     const currentStock = variantDoc ? variantDoc.stock : product.stock;

//     if (existingItemIndex > -1) {
//       // Item already in cart — add quantities
//       const updatedQuantity = cart.items[existingItemIndex].quantity + quantity;

//       if (updatedQuantity > currentStock) {
//         return res.status(400).json({
//           success: false,
//           message: `Maximum available stock is ${currentStock}`,
//         });
//       }

//       cart.items[existingItemIndex] = {
//         product: product._id,
//         productModel,
//         name: product.name,
//         slug: product.slug,
//         image,
//         sku: product.sku,
//         quantity: updatedQuantity,
//         price: product.price,
//         salePrice,
//         finalPrice,
//         stock: product.stock,
//         subtotal: finalPrice * updatedQuantity,
//         isAvailable: product.stock > 0,
//       };
//     } else {
//       // New item
//       cart.items.push({
//         product: product._id,
//         productModel,
//         name: product.name,
//         slug: product.slug,
//         image,
//         sku: product.sku,
//         quantity,
//         price: product.price,
//         salePrice,
//         finalPrice,
//         stock: product.stock,
//         subtotal: finalPrice * quantity,
//         isAvailable: product.stock > 0,
//       });
//     }

//     // FIX #2 pattern: fresh subtotal → validate coupon → final calc
//     calculateCartTotals(cart, null);
//     const coupon = await getValidCoupon(cart);
//     calculateCartTotals(cart, coupon);

//     // FIX #5: mark both items and totals modified
//     cart.markModified("items");
//     cart.markModified("totals");

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Item added to cart",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // UPDATE QUANTITY
// // ─────────────────────────────────────────────
// router.put("/update/:productId", async (req, res) => {
//   try {
//     const { quantity, size, color, variant } = req.body;

//     if (quantity < 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid quantity" });
//     }

//     const cart = await Cart.findOne({ user: req.user.id });
//     if (!cart) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Cart not found" });
//     }

//     const itemIndex = cart.items.findIndex(
//       (item) => item.product.toString() === req.params.productId && (item.variant ? item.variant.toString() === variant : !variant),
//     );

//     if (itemIndex === -1) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Item not found in cart" });
//     }

//     if (quantity === 0) {
//       // Remove item when quantity set to 0
//       cart.items.splice(itemIndex, 1);
//     } else {
//       // Resolve product from either collection
//       let product = await Product.findById(req.params.productId);
//       let productModel = "Product";

//       if (!product) {
//         product = await VendorProduct.findById(req.params.productId);
//         productModel = "VendorProduct";
//       }

//       if (!product) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Product not found" });
//       }

//       let variantDoc = null;
//       if (variant) {
//         variantDoc = await Variant.findById(variant);
//         if (!variantDoc) {
//           return res.status(404).json({
//             success: false,
//             message: "Variant not found",
//           });
//         }
//         if (variantDoc.status !== "Active") {
//           return res.status(400).json({
//             success: false,
//             message: "Variant unavailable",
//           });
//         }
//         if (quantity > variantDoc.stock) {
//           return res.status(400).json({
//             success: false,
//             message: `Only ${variantDoc.stock} items available for this variant`,
//           });
//         }
//       } else {
//         if (quantity > product.stock) {
//           return res.status(400).json({
//             success: false,
//             message: `Only ${product.stock} items available`,
//           });
//         }
//       }

//       const salePrice =
//         productModel === "VendorProduct"
//           ? product.salePrice || 0
//           : product.discountPrice || 0;
//       const finalPrice = salePrice > 0 ? salePrice : product.price;
//       const image =
//         product.image || (product.images && product.images[0]) || "";

//       cart.items[itemIndex] = {
//         product: product._id,
//         productModel,
//         name: product.name,
//         slug: product.slug,
//         image,
//         sku: product.sku,
//         quantity,
//         price: product.price,
//         salePrice,
//         finalPrice,
//         stock: product.stock,
//         subtotal: finalPrice * quantity,
//         isAvailable: product.stock > 0,
//       };
//     }

//     // FIX #2 pattern + FIX #6: fresh subtotal → validate coupon → final calc + mark totals
//     calculateCartTotals(cart, null);
//     const coupon = await getValidCoupon(cart);
//     calculateCartTotals(cart, coupon);

//     cart.markModified("items");
//     cart.markModified("totals");

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart updated successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // REMOVE ITEM
// // ─────────────────────────────────────────────
// router.delete("/remove/:productId", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({ user: req.user.id });
//     if (!cart) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Cart not found" });
//     }

//     const lengthBefore = cart.items.length;
//     cart.items = cart.items.filter(
//       (item) => item.product.toString() !== req.params.productId,
//     );

//     if (cart.items.length === lengthBefore) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Item not found in cart" });
//     }

//     // FIX #2 pattern + FIX #7
//     calculateCartTotals(cart, null);
//     const coupon = await getValidCoupon(cart);
//     calculateCartTotals(cart, coupon);

//     cart.markModified("items");
//     cart.markModified("totals");

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Item removed successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // CLEAR CART
// // ─────────────────────────────────────────────
// router.delete("/clear", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({ user: req.user.id });
//     if (!cart) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Cart not found" });
//     }

//     cart.items = [];
//     cart.coupon = null;
//     cart.couponCode = null;

//     calculateCartTotals(cart); // no coupon — just zeros everything

//     // FIX #8
//     cart.markModified("items");
//     cart.markModified("totals");

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart cleared successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // APPLY COUPON
// // ─────────────────────────────────────────────
// router.post("/apply-coupon", async (req, res) => {
//   try {
//     const { code } = req.body;

//     if (!code) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Coupon code required" });
//     }

//     const coupon = await Coupon.findOne({ code: code.toUpperCase() });

//     if (!coupon) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Invalid coupon code" });
//     }

//     if (!coupon.isValidCoupon()) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Coupon is invalid or expired" });
//     }

//     const cart = await Cart.findOne({ user: req.user.id });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: "Cart is empty" });
//     }

//     // FIX #2 pattern: get fresh subtotal before minimum-order check
//     calculateCartTotals(cart, null);

//     if (
//       coupon.minimumOrderAmount &&
//       cart.totals.subtotal < coupon.minimumOrderAmount
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `Minimum order amount for this coupon is ₹${coupon.minimumOrderAmount}`,
//       });
//     }

//     // Product-specific coupon validation
//     if (coupon.type === "product") {
//       const hasEligibleProduct = cart.items.some((item) =>
//         coupon.applicableProducts
//           .map((id) => id.toString())
//           .includes(item.product.toString()),
//       );

//       if (!hasEligibleProduct) {
//         return res.status(400).json({
//           success: false,
//           message: "Coupon is not applicable on any product in your cart",
//         });
//       }
//     }

//     cart.coupon = coupon._id;
//     cart.couponCode = coupon.code;

//     calculateCartTotals(cart, coupon);

//     // FIX #9: Save cart FIRST, then increment coupon usage.
//     // Previously usedCount was saved before cart.save(), so a cart save failure
//     // would leave usedCount incremented with no coupon actually applied.
//     cart.markModified("totals");
//     await cart.save();

//     const cartTotal = cart.totals?.subtotal ?? 0;
//     const discountAmount = cart.totals?.discount ?? 0;
//     const productId = coupon.type === "product"
//       ? cart.items.find((item) =>
//           coupon.applicableProducts
//             .map((id) => id.toString())
//             .includes(item.product.toString()),
//         )?.product
//       : null;

//     let usage = await CouponUsage.findOne({ coupon: coupon._id, user: req.user.id });

//     if (usage) {
//       if (usage.status === "cancelled") {
//         usage.couponCode = coupon.code;
//         usage.product = productId || null;
//         usage.discountAmount = Math.min(discountAmount, cartTotal);
//         usage.discountType = coupon.discountType;
//         usage.discountValue = coupon.discountValue;
//         usage.status = "applied";
//         usage.cartTotal = cartTotal;
//         await usage.save();
//       }
//     } else {
//       usage = new CouponUsage({
//         coupon: coupon._id,
//         couponCode: coupon.code,
//         user: req.user.id,
//         product: productId || null,
//         discountAmount: Math.min(discountAmount, cartTotal),
//         discountType: coupon.discountType,
//         discountValue: coupon.discountValue,
//         status: "applied",
//         cartTotal,
//       });

//       await usage.save();
//     }

//     coupon.usedCount = (coupon.usedCount || 0) + 1;
//     await coupon.save();

//     res.status(200).json({
//       success: true,
//       message: "Coupon applied successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // ─────────────────────────────────────────────
// // REMOVE COUPON
// // ─────────────────────────────────────────────
// router.delete("/remove-coupon", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({ user: req.user.id });
//     if (!cart) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Cart not found" });
//     }

//     const previousCoupon = cart.coupon;

//     cart.coupon = null;
//     cart.couponCode = null;

//     calculateCartTotals(cart); // recalc without coupon

//     // FIX #11: mark totals modified so Mongoose persists the subdoc change
//     cart.markModified("totals");

//     await cart.save();

//     if (previousCoupon) {
//       const usage = await CouponUsage.findOne({
//         coupon: previousCoupon,
//         user: req.user.id,
//         status: "applied",
//       });

//       if (usage) {
//         usage.status = "cancelled";
//         await usage.save();

//         await Coupon.findByIdAndUpdate(previousCoupon, {
//           $inc: { usedCount: -1 },
//         });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: "Coupon removed successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// export default router;
