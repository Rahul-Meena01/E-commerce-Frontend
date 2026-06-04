// backend/modules/cart/cart.service.js
import mongoose from "mongoose";
import Cart from "../../models/Cart.js";
import Product from "../../models/Product.js";
import Coupon from "../../models/Coupon.js";
import calculateCartTotals from "../../utils/calculateCartTotal.js";

// Helper to validate and return active coupon
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

export const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId })
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

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  } else if (cart.items) {
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => item && item.product);
    if (cart.items.length !== originalLength) {
      cart.markModified("items");
    }
  }

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  await cart.save();
  return cart;
};

export const addToCart = async (userId, { productId, quantity = 1, size = "", color = "" }) => {
  if (!productId) {
    throw Object.assign(new Error("Product ID required"), { statusCode: 400 });
  }

  if (quantity <= 0) {
    throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  if (product.status !== "Active") {
    throw Object.assign(new Error("Product unavailable"), { statusCode: 400 });
  }

  let matchedVariant = null;
  if (size || color) {
    const VariantModel = mongoose.model("Variants");
    matchedVariant = await VariantModel.findOne({
      parentProduct: productId,
      size: size,
      color: color,
      status: "Active"
    });
  }

  const finalStock = matchedVariant ? matchedVariant.stock : product.stock;
  const finalImage = (matchedVariant && matchedVariant.image) ? matchedVariant.image : (product.image || "");
  const finalSku = matchedVariant ? matchedVariant.sku : product.sku;
  
  let basePrice = product.price;
  let salePrice = product.discountPrice || 0;
  
  if (matchedVariant) {
    if (matchedVariant.price !== undefined && matchedVariant.price > 0) {
      basePrice = matchedVariant.price;
      salePrice = matchedVariant.discountPrice || 0;
    }
  }
  
  const finalPrice = salePrice > 0 ? salePrice : basePrice;

  if (finalStock < quantity) {
    throw Object.assign(new Error(`Only ${finalStock} items available`), { statusCode: 400 });
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      (item.variant ? item.variant.toString() : "") === (matchedVariant ? matchedVariant._id.toString() : "") &&
      (item.size || "") === (size || "") &&
      (item.color || "") === (color || ""),
  );

  if (existingItemIndex > -1) {
    const existingQuantity = cart.items[existingItemIndex].quantity;
    const updatedQuantity = existingQuantity + quantity;

    if (updatedQuantity > finalStock) {
      throw Object.assign(new Error(`Maximum available stock is ${finalStock}`), { statusCode: 400 });
    }

    cart.items[existingItemIndex] = {
      product: product._id,
      variant: matchedVariant ? matchedVariant._id : null,
      name: product.name,
      slug: product.slug,
      image: finalImage,
      sku: finalSku,
      quantity: updatedQuantity,
      price: basePrice,
      salePrice: salePrice,
      finalPrice,
      stock: finalStock,
      subtotal: finalPrice * updatedQuantity,
      isAvailable: finalStock > 0,
      size: size || "",
      color: color || "",
    };
  } else {
    cart.items.push({
      product: product._id,
      variant: matchedVariant ? matchedVariant._id : null,
      name: product.name,
      slug: product.slug,
      image: finalImage,
      sku: finalSku,
      quantity,
      price: basePrice,
      salePrice: salePrice,
      finalPrice,
      stock: finalStock,
      subtotal: finalPrice * quantity,
      isAvailable: finalStock > 0,
      size: size || "",
      color: color || "",
    });
  }

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const updateQuantity = async (userId, productId, quantity) => {
  if (quantity < 0) {
    throw Object.assign(new Error("Invalid quantity"), { statusCode: 400 });
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (itemIndex === -1) {
    throw Object.assign(new Error("Item not found"), { statusCode: 404 });
  }

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const product = await Product.findById(productId);
    if (!product) {
      throw Object.assign(new Error("Product not found"), { statusCode: 404 });
    }

    if (quantity > product.stock) {
      throw Object.assign(new Error(`Only ${product.stock} items available`), { statusCode: 400 });
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

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const removeItem = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId,
  );

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  cart.items = [];
  cart.coupon = null;
  cart.couponCode = null;

  calculateCartTotals(cart);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const applyCoupon = async (userId, code) => {
  if (!code) {
    throw Object.assign(new Error("Coupon code required"), { statusCode: 400 });
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    throw Object.assign(new Error("Invalid coupon code"), { statusCode: 404 });
  }

  if (!coupon.isValidCoupon()) {
    throw Object.assign(new Error("Coupon invalid or expired"), { statusCode: 400 });
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw Object.assign(new Error("Cart is empty"), { statusCode: 400 });
  }

  calculateCartTotals(cart);

  if (
    coupon.minimumOrderAmount &&
    cart.totals.subtotal < coupon.minimumOrderAmount
  ) {
    throw Object.assign(new Error(`Minimum order amount should be ₹${coupon.minimumOrderAmount}`), { statusCode: 400 });
  }

  if (coupon.type === "product") {
    const hasEligibleProduct = cart.items.some((item) =>
      coupon.applicableProducts
        .map((id) => id.toString())
        .includes(item.product.toString()),
    );

    if (!hasEligibleProduct) {
      throw Object.assign(new Error("Coupon not applicable on cart products"), { statusCode: 400 });
    }
  }

  cart.coupon = coupon._id;
  cart.couponCode = coupon.code;
  coupon.usedCount = (coupon.usedCount || 0) + 1;
  await coupon.save();

  calculateCartTotals(cart, coupon);
  await cart.save();
  return cart;
};

export const removeCoupon = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  cart.coupon = null;
  cart.couponCode = null;

  calculateCartTotals(cart);
  await cart.save();
  return cart;
};

export const updateItemById = async (userId, id, quantity) => {
  if (quantity < 0) {
    throw Object.assign(new Error("Invalid quantity"), { statusCode: 400 });
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === id || (item._id && item._id.toString() === id),
  );

  if (itemIndex === -1) {
    throw Object.assign(new Error("Item not found in cart"), { statusCode: 404 });
  }

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const productId = cart.items[itemIndex].product;
    const variantId = cart.items[itemIndex].variant;
    let finalStock = 0;
    let finalPrice = 0;
    let basePrice = 0;
    let salePrice = 0;

    if (variantId) {
      const VariantModel = mongoose.model("Variants");
      const variantObj = await VariantModel.findById(variantId);
      if (!variantObj || variantObj.status !== "Active") {
        throw Object.assign(new Error("Variant no longer available"), { statusCode: 404 });
      }
      finalStock = variantObj.stock;
      basePrice = variantObj.price;
      salePrice = variantObj.discountPrice || 0;
      
      if (basePrice === undefined || basePrice <= 0) {
        const product = await Product.findById(productId);
        if (!product) {
          throw Object.assign(new Error("Parent product not found"), { statusCode: 404 });
        }
        basePrice = product.price;
        salePrice = product.discountPrice || 0;
      }
      finalPrice = salePrice > 0 ? salePrice : basePrice;
    } else {
      const product = await Product.findById(productId);
      if (!product || product.status !== "Active") {
        throw Object.assign(new Error("Product no longer available"), { statusCode: 404 });
      }
      finalStock = product.stock;
      basePrice = product.price;
      salePrice = product.discountPrice || 0;
      finalPrice = salePrice > 0 ? salePrice : basePrice;
    }

    if (quantity > finalStock) {
      throw Object.assign(new Error(`Only ${finalStock} items available`), { statusCode: 400 });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = basePrice;
    cart.items[itemIndex].salePrice = salePrice;
    cart.items[itemIndex].finalPrice = finalPrice;
    cart.items[itemIndex].stock = finalStock;
    cart.items[itemIndex].subtotal = finalPrice * quantity;
    cart.items[itemIndex].isAvailable = finalStock > 0;
  }

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const removeItemById = async (userId, id) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw Object.assign(new Error("Cart not found"), { statusCode: 404 });
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== id && (!item._id || item._id.toString() !== id),
  );

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

export const mergeCart = async (userId, items = []) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  }

  // Gather all product IDs to query them in a single batch
  const productIds = [...new Set(items.map((item) => item.product).filter(Boolean))];

  if (productIds.length === 0) {
    const coupon = await getValidCoupon(cart);
    calculateCartTotals(cart, coupon);
    cart.markModified("items");
    await cart.save();
    return cart;
  }

  // Fetch all products and active variants in bulk
  const VariantModel = mongoose.model("Variants");
  const [products, variants] = await Promise.all([
    Product.find({ _id: { $in: productIds }, status: "Active" }).lean(),
    VariantModel.find({ parentProduct: { $in: productIds }, status: "Active" }).lean(),
  ]);

  // Create Maps for O(1) lookups
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  
  // Group variants by parentProduct, size, and color to easily find a specific variant
  const variantMap = new Map(
    variants.map((v) => [
      `${v.parentProduct.toString()}:${v.size || ""}:${v.color || ""}`,
      v
    ])
  );

  for (const localItem of items) {
    const { product: productId, quantity = 1, size = "", color = "" } = localItem;
    if (!productId) continue;

    const product = productMap.get(productId.toString());
    if (!product) continue;

    const variantKey = `${productId.toString()}:${size || ""}:${color || ""}`;
    const matchedVariant = variantMap.get(variantKey) || null;

    const finalStock = matchedVariant ? matchedVariant.stock : product.stock;
    const finalImage = (matchedVariant && matchedVariant.image) ? matchedVariant.image : (product.image || "");
    const finalSku = matchedVariant ? matchedVariant.sku : product.sku;

    let basePrice = product.price;
    let salePrice = product.discountPrice || 0;

    if (matchedVariant) {
      if (matchedVariant.price !== undefined && matchedVariant.price > 0) {
        basePrice = matchedVariant.price;
        salePrice = matchedVariant.discountPrice || 0;
      }
    }

    const finalPrice = salePrice > 0 ? salePrice : basePrice;

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variant ? item.variant.toString() : "") === (matchedVariant ? matchedVariant._id.toString() : "") &&
        (item.size || "") === (size || "") &&
        (item.color || "") === (color || ""),
    );

    if (existingItemIndex > -1) {
      const newQty = Math.min(finalStock, cart.items[existingItemIndex].quantity + quantity);
      cart.items[existingItemIndex].quantity = newQty;
      cart.items[existingItemIndex].price = basePrice;
      cart.items[existingItemIndex].salePrice = salePrice;
      cart.items[existingItemIndex].finalPrice = finalPrice;
      cart.items[existingItemIndex].stock = finalStock;
      cart.items[existingItemIndex].subtotal = finalPrice * newQty;
      cart.items[existingItemIndex].isAvailable = finalStock > 0;
    } else {
      const newQty = Math.min(finalStock, quantity);
      cart.items.push({
        product: product._id,
        variant: matchedVariant ? matchedVariant._id : null,
        name: product.name,
        slug: product.slug,
        image: finalImage,
        sku: finalSku,
        quantity: newQty,
        price: basePrice,
        salePrice: salePrice,
        finalPrice,
        stock: finalStock,
        subtotal: finalPrice * newQty,
        isAvailable: finalStock > 0,
        size: size || "",
        color: color || "",
      });
    }
  }

  const coupon = await getValidCoupon(cart);
  calculateCartTotals(cart, coupon);
  cart.markModified("items");
  await cart.save();
  return cart;
};

