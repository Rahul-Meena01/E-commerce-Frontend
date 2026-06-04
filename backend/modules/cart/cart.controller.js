// backend/modules/cart/cart.controller.js
import * as cartService from "./cart.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const cart = await cartService.getCart(userId);
  return res.status(200).json({
    success: true,
    message: "Cart fetched successfully",
    data: cart,
  });
});

export const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const cart = await cartService.addToCart(userId, req.body);
  return res.status(200).json({
    success: true,
    message: "Item added to cart",
    data: cart,
  });
});

export const updateQuantity = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { productId } = req.params;
  const { quantity } = req.body;
  const cart = await cartService.updateQuantity(userId, productId, quantity);
  return res.status(200).json({
    success: true,
    message: "Cart updated successfully",
    data: cart,
  });
});

export const removeItem = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { productId } = req.params;
  const cart = await cartService.removeItem(userId, productId);
  return res.status(200).json({
    success: true,
    message: "Item removed successfully",
    data: cart,
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const cart = await cartService.clearCart(userId);
  return res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
    data: cart,
  });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { code } = req.body;
  const cart = await cartService.applyCoupon(userId, code);
  return res.status(200).json({
    success: true,
    message: "Coupon applied successfully",
    data: cart,
  });
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const cart = await cartService.removeCoupon(userId);
  return res.status(200).json({
    success: true,
    message: "Coupon removed successfully",
    data: cart,
  });
});

export const updateItemById = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { id } = req.params;
  const { quantity } = req.body;
  const cart = await cartService.updateItemById(userId, id, quantity);
  return res.status(200).json({
    success: true,
    message: "Cart updated successfully",
    data: cart,
  });
});

export const removeItemById = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { id } = req.params;
  const cart = await cartService.removeItemById(userId, id);
  return res.status(200).json({
    success: true,
    message: "Item removed successfully",
    data: cart,
  });
});

export const mergeCart = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { items } = req.body;
  const cart = await cartService.mergeCart(userId, items);
  return res.status(200).json({
    success: true,
    message: "Cart merged successfully",
    data: cart,
  });
});
