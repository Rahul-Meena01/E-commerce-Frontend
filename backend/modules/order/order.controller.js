// backend/modules/order/order.controller.js
import * as orderService from "./order.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const createOrder = asyncHandler(async (req, res) => {
  const formattedOrder = await orderService.createOrder(req.user, req.body);
  return res.status(201).json(formattedOrder);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getMyOrders(req.user._id, req.query.pageNumber);
  return res.json(result);
});

export const getOrders = asyncHandler(async (req, res) => {
  if (req.user.role === "admin") {
    const result = await orderService.getOrdersForAdmin({
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      pageNumber: req.query.pageNumber
    });
    return res.json(result);
  } else {
    const result = await orderService.getOrdersForUser(req.user._id, req.query.pageNumber);
    return res.json(result);
  }
});

export const getOrderById = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const order = await orderService.getOrderById(req.params.id, req.user._id, isAdmin);
  return res.json(order);
});

export const payOrder = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const order = await orderService.payOrder(req.params.id, req.user._id, isAdmin, req.body);
  return res.json(order);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user._id, req.body.note);
  return res.json(order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status, req.body.note);
  return res.json(order);
});
