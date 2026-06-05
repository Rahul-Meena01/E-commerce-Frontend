/*
 * Handover note: Cart API.
 * User cart endpoints add/update/remove items, clear carts, apply/remove coupons, and recalculate totals
 * using backend/utils/calculateCartTotal.js so pricing stays server-controlled.
 */
import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import calculateCartTotals from "../utils/calculateCartTotal.js";

const router = express.Router();

//
// HELPER
//
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

  //
  // MINIMUM ORDER VALIDATION
  //
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

//
// GET CART
//
router.get("/", async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user.id,
    })
      .populate("coupon")
      .populate({
        path: "items.product",
        populate: {
          path: "subCategory",
          populate: {
            path: "parentCategory",
          },
        },
      });

    //
    // CREATE EMPTY CART
    //
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    //
    // RECALCULATE TOTALS
    //
    let coupon = await getValidCoupon(cart);

    calculateCartTotals(cart, coupon);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: cart,
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
// ADD TO CART
//
router.post("/add", async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    //
    // VALIDATION
    //
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    //
    // PRODUCT VALIDATION
    //
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Product unavailable",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`,
      });
    }

    //
    // GET CART
    //
    let cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    //
    // CHECK EXISTING ITEM
    //
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    const finalPrice = product.discountPrice || product.price;

    //
    // UPDATE EXISTING ITEM
    //
    if (existingItemIndex > -1) {
      const existingQuantity = cart.items[existingItemIndex].quantity;

      const updatedQuantity = existingQuantity + quantity;

      if (updatedQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Maximum available stock is ${product.stock}`,
        });
      }

      cart.items[existingItemIndex] = {
        product: product._id,

        name: product.name,
        slug: product.slug,
        image: product.image || "",
        sku: product.sku,

        quantity: updatedQuantity,

        price: product.price,
        salePrice: product.discountPrice || 0,
        finalPrice,

        stock: product.stock,

        subtotal: finalPrice * updatedQuantity,

        isAvailable: product.stock > 0,
      };
    } else {
      //
      // ADD NEW ITEM
      //
      cart.items.push({
        product: product._id,

        name: product.name,
        slug: product.slug,
        image: product.image || "",
        sku: product.sku,

        quantity,

        price: product.price,
        salePrice: product.discountPrice || 0,
        finalPrice,

        stock: product.stock,

        subtotal: finalPrice * quantity,

        isAvailable: product.stock > 0,
      });
    }

    //
    // RECALCULATE TOTALS
    //
    let coupon = await getValidCoupon(cart);

    calculateCartTotals(cart, coupon);

    // FIX: Tell Mongoose the items array was modified before saving
    cart.markModified("items");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      data: cart,
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
// UPDATE QUANTITY
//
router.put("/update/:productId", async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === req.params.productId,
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    //
    // REMOVE ITEM IF 0
    //
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(req.params.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available`,
        });
      }

      const finalPrice = product.discountPrice || product.price;

      cart.items[itemIndex] = {
        product: product._id,

        name: product.name,
        slug: product.slug,
        image: product.image || "",
        sku: product.sku,

        quantity,

        price: product.price,
        salePrice: product.discountPrice || 0,
        finalPrice,

        stock: product.stock,

        subtotal: finalPrice * quantity,

        isAvailable: product.stock > 0,
      };
    }

    //
    // RECALCULATE TOTALS
    //
    let coupon = await getValidCoupon(cart);

    calculateCartTotals(cart, coupon);

    // FIX: Tell Mongoose the items array was modified before saving
    cart.markModified("items");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: cart,
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
// REMOVE ITEM
//
router.delete("/remove/:productId", async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.params.productId,
    );

    //
    // RECALCULATE TOTALS
    //
    let coupon = await getValidCoupon(cart);

    calculateCartTotals(cart, coupon);

    // FIX: Tell Mongoose the items array was modified before saving
    cart.markModified("items");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed successfully",
      data: cart,
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
// CLEAR CART
//
router.delete("/clear", async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];

    cart.coupon = null;
    cart.couponCode = null;

    calculateCartTotals(cart);

    // FIX: Tell Mongoose the items array was modified before saving
    cart.markModified("items");

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
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
// APPLY COUPON
//
router.post("/apply-coupon", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code required",
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    //
    // VALIDATE COUPON
    //
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    if (!coupon.isValidCoupon()) {
      return res.status(400).json({
        success: false,
        message: "Coupon invalid or expired",
      });
    }

    //
    // GET CART
    //
    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    //
    // RECALCULATE BEFORE APPLY
    //
    calculateCartTotals(cart);

    //
    // MINIMUM ORDER VALIDATION
    //
    if (
      coupon.minimumOrderAmount &&
      cart.totals.subtotal < coupon.minimumOrderAmount
    ) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount should be ₹${coupon.minimumOrderAmount}`,
      });
    }

    //
    // PRODUCT COUPON VALIDATION
    //
    if (coupon.type === "product") {
      const hasEligibleProduct = cart.items.some((item) =>
        coupon.applicableProducts
          .map((id) => id.toString())
          .includes(item.product.toString()),
      );

      if (!hasEligibleProduct) {
        return res.status(400).json({
          success: false,
          message: "Coupon not applicable on cart products",
        });
      }
    }

    //
    // APPLY COUPON
    //
    cart.coupon = coupon._id;
    cart.couponCode = coupon.code;
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    await coupon.save();

    calculateCartTotals(cart, coupon);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: cart,
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
// REMOVE COUPON
//
router.delete("/remove-coupon", async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.coupon = null;
    cart.couponCode = null;

    calculateCartTotals(cart);

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
      data: cart,
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
// MERGE CART
//
router.post("/merge", async (req, res) => {
  try {
    const { items = [] } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    for (const item of items) {
      const productId = item.productId || item.product;
      const quantity = item.quantity || item.qty || 1;
      if (!productId) continue;
      const product = await Product.findById(productId);
      if (!product || product.status !== "Active") continue;

      const existingIndex = cart.items.findIndex(
        (i) => i.product.toString() === productId
      );
      const finalPrice = product.discountPrice || product.price;

      if (existingIndex > -1) {
        const newQty = Math.min(product.stock, cart.items[existingIndex].quantity + quantity);
        cart.items[existingIndex].quantity = newQty;
        cart.items[existingIndex].subtotal = finalPrice * newQty;
      } else {
        const newQty = Math.min(product.stock, quantity);
        cart.items.push({
          product: product._id,
          name: product.name,
          slug: product.slug,
          image: product.image || "",
          sku: product.sku,
          quantity: newQty,
          price: product.price,
          salePrice: product.discountPrice || 0,
          finalPrice,
          stock: product.stock,
          subtotal: finalPrice * newQty,
          isAvailable: product.stock > 0,
        });
      }
    }
    let coupon = await getValidCoupon(cart);
    calculateCartTotals(cart, coupon);
    cart.markModified("items");
    await cart.save();
    res.status(200).json({ success: true, message: "Cart merged successfully", data: cart });
  } catch (error) {
    console.error("Merge cart error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

// // const express = require("express");
// // const router = express.Router();

// // const Cart = require("../models/Cart");
// // const Product = require("../models/Product");
// // const Coupon = require("../models/Coupon");

// // const calculateCartTotals = require("../utils/calculateCartTotal");

// import express from "express";
// import Cart from "../models/Cart.js";
// import Product from "../models/Product.js";
// import Coupon from "../models/Coupon.js";
// import calculateCartTotals from "../utils/calculateCartTotal.js";

// const router = express.Router();

// //
// // HELPER
// //
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

//   //
//   // MINIMUM ORDER VALIDATION
//   //
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

// //
// // GET CART
// //
// router.get("/", async (req, res) => {
//   try {
//     let cart = await Cart.findOne({
//       user: req.user.id,
//     })
//       .populate("coupon")
//       .populate({
//         path: "items.product",
//         populate: {
//           path: "subCategory",
//           populate: {
//             path: "parentCategory",
//           },
//         },
//       });

//     //
//     // CREATE EMPTY CART
//     //
//     if (!cart) {
//       cart = await Cart.create({
//         user: req.user.id,
//         items: [],
//       });
//     }

//     //
//     // RECALCULATE TOTALS
//     //
//     let coupon = await getValidCoupon(cart);

//     calculateCartTotals(cart, coupon);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart fetched successfully",
//       data: cart,
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
// // ADD TO CART
// //
// router.post("/add", async (req, res) => {
//   try {
//     const { productId, quantity = 1 } = req.body;

//     //
//     // VALIDATION
//     //
//     if (!productId) {
//       return res.status(400).json({
//         success: false,
//         message: "Product ID required",
//       });
//     }

//     if (quantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Quantity must be greater than 0",
//       });
//     }

//     //
//     // PRODUCT VALIDATION
//     //
//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     if (product.status !== "Active") {
//       return res.status(400).json({
//         success: false,
//         message: "Product unavailable",
//       });
//     }

//     if (product.stock < quantity) {
//       return res.status(400).json({
//         success: false,
//         message: `Only ${product.stock} items available`,
//       });
//     }

//     //
//     // GET CART
//     //
//     let cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart) {
//       cart = await Cart.create({
//         user: req.user.id,
//         items: [],
//       });
//     }

//     //
//     // CHECK EXISTING ITEM
//     //
//     const existingItemIndex = cart.items.findIndex(
//       (item) => item.product.toString() === productId,
//     );

//     const finalPrice = product.discountPrice || product.price;

//     //
//     // UPDATE EXISTING ITEM
//     //
//     if (existingItemIndex > -1) {
//       const existingQuantity = cart.items[existingItemIndex].quantity;

//       const updatedQuantity = existingQuantity + quantity;

//       if (updatedQuantity > product.stock) {
//         return res.status(400).json({
//           success: false,
//           message: `Maximum available stock is ${product.stock}`,
//         });
//       }

//       cart.items[existingItemIndex] = {
//         product: product._id,

//         name: product.name,
//         slug: product.slug,
//         image: product.image || " " || "",
//         sku: product.sku,

//         quantity: updatedQuantity,

//         price: product.price,
//         salePrice: product.discountPrice || 0,
//         finalPrice,

//         stock: product.stock,

//         subtotal: finalPrice * updatedQuantity,

//         isAvailable: product.stock > 0,
//       };
//     } else {
//       //
//       // ADD NEW ITEM
//       //
//       cart.items.push({
//         product: product._id,

//         name: product.name,
//         slug: product.slug,
//         image: product.image || " " || "",
//         sku: product.sku,

//         quantity,

//         price: product.price,
//         salePrice: product.discountPrice || 0,
//         finalPrice,

//         stock: product.stock,

//         subtotal: finalPrice * quantity,

//         isAvailable: product.stock > 0,
//       });
//     }

//     //
//     // RECALCULATE TOTALS
//     //
//     let coupon = await getValidCoupon(cart);

//     calculateCartTotals(cart, coupon);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Item added to cart",
//       data: cart,
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
// // UPDATE QUANTITY
// //
// router.put("/update/:productId", async (req, res) => {
//   try {
//     const { quantity } = req.body;

//     if (quantity < 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid quantity",
//       });
//     }

//     const cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     const itemIndex = cart.items.findIndex(
//       (item) => item.product.toString() === req.params.productId,
//     );

//     if (itemIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not found",
//       });
//     }

//     //
//     // REMOVE ITEM IF 0
//     //
//     if (quantity === 0) {
//       cart.items.splice(itemIndex, 1);
//     } else {
//       const product = await Product.findById(req.params.productId);

//       if (!product) {
//         return res.status(404).json({
//           success: false,
//           message: "Product not found",
//         });
//       }

//       if (quantity > product.stock) {
//         return res.status(400).json({
//           success: false,
//           message: `Only ${product.stock} items available`,
//         });
//       }

//       const finalPrice = product.discountPrice || product.price;

//       cart.items[itemIndex] = {
//         product: product._id,

//         name: product.name,
//         slug: product.slug,
//         image: product.image || " " || "",
//         sku: product.sku,

//         quantity,

//         price: product.price,
//         salePrice: product.discountPrice || 0,
//         finalPrice,

//         stock: product.stock,

//         subtotal: finalPrice * quantity,

//         isAvailable: product.stock > 0,
//       };
//     }

//     //
//     // RECALCULATE TOTALS
//     //
//     let coupon = await getValidCoupon(cart);

//     calculateCartTotals(cart, coupon);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart updated successfully",
//       data: cart,
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
// // REMOVE ITEM
// //
// router.delete("/remove/:productId", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     cart.items = cart.items.filter(
//       (item) => item.product.toString() !== req.params.productId,
//     );

//     //
//     // RECALCULATE TOTALS
//     //
//     let coupon = await getValidCoupon(cart);

//     calculateCartTotals(cart, coupon);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Item removed successfully",
//       data: cart,
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
// // CLEAR CART
// //
// router.delete("/clear", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     cart.items = [];

//     cart.coupon = null;
//     cart.couponCode = null;

//     calculateCartTotals(cart);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Cart cleared successfully",
//       data: cart,
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
// // APPLY COUPON
// //
// router.post("/apply-coupon", async (req, res) => {
//   try {
//     const { code } = req.body;

//     if (!code) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code required",
//       });
//     }

//     const coupon = await Coupon.findOne({
//       code: code.toUpperCase(),
//     });

//     //
//     // VALIDATE COUPON
//     //
//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid coupon code",
//       });
//     }

//     if (!coupon.isValidCoupon()) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon invalid or expired",
//       });
//     }

//     //
//     // GET CART
//     //
//     const cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Cart is empty",
//       });
//     }

//     //
//     // RECALCULATE BEFORE APPLY
//     //
//     calculateCartTotals(cart);

//     //
//     // MINIMUM ORDER VALIDATION
//     //
//     if (
//       coupon.minimumOrderAmount &&
//       cart.totals.subtotal < coupon.minimumOrderAmount
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `Minimum order amount should be ₹${coupon.minimumOrderAmount}`,
//       });
//     }

//     //
//     // PRODUCT COUPON VALIDATION
//     //
//     if (coupon.type === "product") {
//       const hasEligibleProduct = cart.items.some((item) =>
//         coupon.applicableProducts
//           .map((id) => id.toString())
//           .includes(item.product.toString()),
//       );

//       if (!hasEligibleProduct) {
//         return res.status(400).json({
//           success: false,
//           message: "Coupon not applicable on cart products",
//         });
//       }
//     }

//     //
//     // APPLY COUPON
//     //
//     cart.coupon = coupon._id;
//     cart.couponCode = coupon.code;
//     coupon.usedCount = (coupon.usedCount || 0) + 1;
//     await coupon.save();

//     calculateCartTotals(cart, coupon);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Coupon applied successfully",
//       data: cart,
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
// // REMOVE COUPON
// //
// router.delete("/remove-coupon", async (req, res) => {
//   try {
//     const cart = await Cart.findOne({
//       user: req.user.id,
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     cart.coupon = null;
//     cart.couponCode = null;

//     calculateCartTotals(cart);

//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Coupon removed successfully",
//       data: cart,
//     });
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// // module.exports = router;
// export default router;
