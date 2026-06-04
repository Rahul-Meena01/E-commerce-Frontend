// backend/modules/order/order.service.js
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import Cart from "../../models/Cart.js";
import { calculateTotals } from "../../utils/calculateCartTotal.js";
import { sendOrderConfirmationEmail } from "../../utils/emailService.js";

const getShortId = (objectId) => objectId.toString().slice(-6).toUpperCase();

const formatOrder = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  const shortId = getShortId(obj._id);
  return {
    ...obj,
    shortId,
    orderNumber: shortId,
    items: obj.orderItems,
    status: obj.orderStatus ? obj.orderStatus.toLowerCase() : undefined,
  };
};

export const createOrder = async (user, { shippingAddress, paymentMethod, shippingMethod }) => {
  if (!paymentMethod) {
    throw Object.assign(new Error("Payment method is required"), { statusCode: 400 });
  }

  const validPaymentMethods = ["Stripe", "PayPal", "Razorpay", "COD"];
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw Object.assign(new Error(`Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`), { statusCode: 400 });
  }

  if (
    !shippingAddress?.address ||
    !shippingAddress?.city ||
    !shippingAddress?.postalCode ||
    !shippingAddress?.country
  ) {
    throw Object.assign(new Error("Complete shipping address is required"), { statusCode: 400 });
  }

  const cart = await Cart.findOne({ user: user._id })
    .populate("coupon")
    .populate("items.product")
    .populate("items.variant");

  if (!cart || !cart.items || cart.items.length === 0) {
    throw Object.assign(new Error("Your cart is empty. Cannot place order."), { statusCode: 400 });
  }

  for (const item of cart.items) {
    if (!item.product) {
      throw Object.assign(new Error(`Product "${item.name}" is no longer available in the catalog.`), { statusCode: 400 });
    }
    if (item.product.status !== "Active") {
      throw Object.assign(new Error(`Product "${item.product.name}" is currently deactivated.`), { statusCode: 400 });
    }
    if (item.variant) {
      if (item.variant.status !== "Active") {
        throw Object.assign(new Error(`Selected variant of product "${item.product.name}" (${item.size}/${item.color}) is currently deactivated.`), { statusCode: 400 });
      }
      if (item.variant.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for product "${item.product.name}" (${item.size}/${item.color}). Available: ${item.variant.stock}, requested: ${item.quantity}.`), { statusCode: 400 });
      }
    } else {
      if (item.product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for product "${item.product.name}". Available: ${item.product.stock}, requested: ${item.quantity}.`), { statusCode: 400 });
      }
    }
  }

  const totals = calculateTotals(cart.items, cart.coupon);

  const orderItems = cart.items.map((item) => ({
    name: item.name,
    qty: item.quantity,
    image: item.image || (item.variant && item.variant.image) || item.product.image || "",
    price: item.finalPrice || item.price,
    product: item.product._id,
    variant: item.variant ? item.variant._id : null,
    size: item.size || "",
    color: item.color || "",
  }));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [createdOrder] = await Order.create(
      [
        {
          user: user._id,
          orderItems,
          shippingAddress,
          paymentMethod,
          paymentProvider: paymentMethod,
          shippingMethod: shippingMethod || "standard",
          itemsPrice: totals.subtotal,
          discountPrice: totals.discount,
          couponCode: cart.couponCode || null,
          taxPrice: totals.tax,
          shippingPrice: totals.shipping,
          totalPrice: totals.grandTotal,
        },
      ],
      { session },
    );

    const productBulkOps = [];
    const variantBulkOps = [];

    for (const item of orderItems) {
      if (item.variant) {
        variantBulkOps.push({
          updateOne: {
            filter: { _id: item.variant, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          }
        });
      } else {
        productBulkOps.push({
          updateOne: {
            filter: { _id: item.product, stock: { $gte: item.qty } },
            update: { $inc: { stock: -item.qty } },
          }
        });
      }
    }

    if (variantBulkOps.length > 0) {
      const VariantModel = mongoose.model("Variants");
      const variantResult = await VariantModel.bulkWrite(variantBulkOps, { session });
      if (variantResult.modifiedCount !== variantBulkOps.length) {
        throw Object.assign(new Error("Insufficient stock for one or more variant items. Stock deduction failed."), { statusCode: 400 });
      }
    }

    if (productBulkOps.length > 0) {
      const productResult = await Product.bulkWrite(productBulkOps, { session });
      if (productResult.modifiedCount !== productBulkOps.length) {
        throw Object.assign(new Error("Insufficient stock for one or more product items. Stock deduction failed."), { statusCode: 400 });
      }
    }

    await Cart.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          items: [],
          coupon: null,
          couponCode: null,
          totals: {
            subtotal: 0,
            discount: 0,
            tax: 0,
            shipping: 0,
            grandTotal: 0,
            totalItems: 0,
          },
        },
      },
      { session },
    );

    await session.commitTransaction();

    const shortId = createdOrder._id.toString().slice(-6).toUpperCase();
    sendOrderConfirmationEmail({
      customerName: user.name,
      customerEmail: user.email,
      orderId: createdOrder._id,
      shortId,
      orderItems,
      amountPaid: totals.grandTotal,
      shippingAddress,
    }).catch((e) => console.error("Standard order confirmation email failure:", e));

    return formatOrder(createdOrder);
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

export const getMyOrders = async (userId, pageNumber) => {
  const pageSize = 10;
  const page = Math.max(1, Number(pageNumber) || 1);
  const filter = { user: userId };
  const count = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  return {
    orders: orders.map(formatOrder),
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count,
  };
};

export const getOrdersForUser = async (userId, pageNumber) => {
  const pageSize = 10;
  const page = Math.max(1, Number(pageNumber) || 1);
  const filter = { user: userId };
  const count = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const formatted = orders.map(formatOrder);
  return {
    orders: formatted,
    data: formatted,
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count,
  };
};

export const getOrdersForAdmin = async ({ status, from, to, pageNumber }) => {
  const pageSize = 20;
  const page = Math.max(1, Number(pageNumber) || 1);

  const filter = {};
  if (status) filter.orderStatus = status;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to + "T23:59:59.999Z");
  }

  const count = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .populate("user", "id name email phone")
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const formatted = orders.map(formatOrder);
  return {
    orders: formatted,
    data: formatted,
    page,
    pages: Math.ceil(count / pageSize),
    totalOrders: count,
  };
};

export const getOrderById = async (orderId, userId, isAdmin) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw Object.assign(new Error("Invalid order ID format"), { statusCode: 400 });
  }

  const order = await Order.findById(orderId).populate("user", "name email phone");
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  const isOwner = order.user._id.toString() === userId.toString();
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error("Not authorised to view this order"), { statusCode: 403 });
  }

  return formatOrder(order);
};

export const payOrder = async (orderId, userId, isAdmin, paymentResult) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw Object.assign(new Error("Invalid order ID format"), { statusCode: 400 });
  }

  if (!paymentResult.id || !paymentResult.status || !paymentResult.update_time) {
    throw Object.assign(new Error("Payment result must include id, status, and update_time"), { statusCode: 400 });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  if (order.isPaid) {
    throw Object.assign(new Error("Order is already marked as paid"), { statusCode: 400 });
  }

  const isOwner = order.user.toString() === userId.toString();
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error("Not authorised to update this order"), { statusCode: 403 });
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: paymentResult.id,
    status: paymentResult.status,
    update_time: paymentResult.update_time,
    email_address: paymentResult.email_address,
  };

  const updatedOrder = await order.save();
  return formatOrder(updatedOrder);
};

export const cancelOrder = async (orderId, userId, note) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw Object.assign(new Error("Invalid order ID format"), { statusCode: 400 });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  if (order.user.toString() !== userId.toString()) {
    throw Object.assign(new Error("Not authorised to cancel this order"), { statusCode: 403 });
  }

  const cancellableStatuses = ["Pending", "Processing"];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    throw Object.assign(new Error(`Order cannot be cancelled once it is ${order.orderStatus}`), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    order.orderStatus = "Cancelled";
    order.cancelledBy = "user";
    order.cancelledAt = Date.now();
    order.cancellationNote = note || "";

    const productRestoreOps = [];
    const variantRestoreOps = [];

    for (const item of order.orderItems) {
      if (item.variant) {
        variantRestoreOps.push({
          updateOne: {
            filter: { _id: item.variant },
            update: { $inc: { stock: item.qty } },
          }
        });
      } else {
        productRestoreOps.push({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { stock: item.qty } },
          }
        });
      }
    }

    await order.save({ session });

    if (variantRestoreOps.length > 0) {
      const VariantModel = mongoose.model("Variants");
      await VariantModel.bulkWrite(variantRestoreOps, { session });
    }

    if (productRestoreOps.length > 0) {
      await Product.bulkWrite(productRestoreOps, { session });
    }

    await session.commitTransaction();
    return formatOrder(order);
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};

export const updateOrderStatus = async (orderId, status, note) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw Object.assign(new Error("Invalid order ID format"), { statusCode: 400 });
  }

  const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
  if (!status || !validStatuses.includes(status)) {
    throw Object.assign(new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`), { statusCode: 400 });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  const terminalStatuses = ["Delivered", "Cancelled"];
  if (terminalStatuses.includes(order.orderStatus)) {
    throw Object.assign(new Error(`Cannot change status of a ${order.orderStatus} order`), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    order.orderStatus = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === "COD" && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }

    if (status === "Cancelled") {
      order.cancelledBy = "admin";
      order.cancelledAt = Date.now();
      order.cancellationNote = note || "";

      const productRestoreOps = [];
      const variantRestoreOps = [];

      for (const item of order.orderItems) {
        if (item.variant) {
          variantRestoreOps.push({
            updateOne: {
              filter: { _id: item.variant },
              update: { $inc: { stock: item.qty } },
            }
          });
        } else {
          productRestoreOps.push({
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: item.qty } },
            }
          });
        }
      }

      if (variantRestoreOps.length > 0) {
        const VariantModel = mongoose.model("Variants");
        await VariantModel.bulkWrite(variantRestoreOps, { session });
      }

      if (productRestoreOps.length > 0) {
        await Product.bulkWrite(productRestoreOps, { session });
      }
    }

    const updatedOrder = await order.save({ session });
    await session.commitTransaction();
    return formatOrder(updatedOrder);
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
};
