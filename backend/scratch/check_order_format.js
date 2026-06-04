import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { getOrderById } from "../modules/order/order.service.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  // Find a paid order
  const orderDoc = await Order.findOne({ isPaid: true });
  if (!orderDoc) {
    console.log("No paid orders found in database!");
    await mongoose.disconnect();
    return;
  }
  
  console.log("Order Document ID:", orderDoc._id);
  
  // Call service method
  const formatted = await getOrderById(orderDoc._id, orderDoc.user, true);
  console.log("Formatted Order Keys:", Object.keys(formatted));
  console.log("Formatted Order details:");
  console.log("totalPrice:", formatted.totalPrice);
  console.log("itemsPrice (subtotal):", formatted.itemsPrice);
  console.log("discountPrice:", formatted.discountPrice);
  console.log("taxPrice:", formatted.taxPrice);
  console.log("shippingPrice:", formatted.shippingPrice);
  console.log("totalAmount:", formatted.totalAmount);
  console.log("grandTotal:", formatted.grandTotal);
  console.log("Full Object:", JSON.stringify(formatted, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);
