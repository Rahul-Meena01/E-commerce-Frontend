import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: "products",
    select: "name price image image1 image2 image3 image4 slug",
  });

  if (!wishlist) {
    return res.status(200).json({
      success: true,
      data: { products: [] },
    });
  }

  res.status(200).json({
    success: true,
    data: wishlist,
  });
});

export const addToWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.body;

  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: userId,
      products: [productId],
    });
  } else {
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: "Already in wishlist",
      });
    }

    wishlist.products.push(productId);
    await wishlist.save();
  }

  res.status(200).json({
    success: true,
    message: "Added to wishlist",
    data: wishlist,
  });
});

export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    return res.status(404).json({
      success: false,
      message: "Wishlist not found",
    });
  }

  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId.toString()
  );

  await wishlist.save();

  res.status(200).json({
    success: true,
    message: "Removed from wishlist",
    data: wishlist,
  });
});

export const clearWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    return res.status(404).json({
      success: false,
      message: "Wishlist not found",
    });
  }

  wishlist.products = [];
  await wishlist.save();

  res.status(200).json({
    success: true,
    message: "Wishlist cleared",
    data: wishlist,
  });
});
