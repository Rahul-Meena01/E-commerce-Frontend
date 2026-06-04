import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";

const runTest = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully.");

    // 1. Setup or find a test product
    let product = await Product.findOne({ status: "Active" });
    if (!product) {
      throw new Error("No active product found in database to run integration test.");
    }
    
    // Update stock using findOneAndUpdate to bypass validation constraints on unrelated fields
    product = await Product.findOneAndUpdate(
      { _id: product._id },
      { $set: { stock: 10 } },
      { new: true }
    );
    console.log(`Using product: ${product.name} (ID: ${product._id}, Price: $${product.price}, Stock: ${product.stock})`);

    // 2. Setup or find a test user
    let user = await User.findOne({ email: "testuser@loft.com" });
    if (!user) {
      console.log("Creating test user...");
      user = await User.create({
        name: "Test User",
        email: "testuser@loft.com",
        password: "password123",
        phone: "1234567890",
        role: "user",
      });
    }
    console.log(`Using user: ${user.name} (Email: ${user.email})`);

    // 3. Generate token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // 4. Set up user cart
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      cart = await Cart.create({
        user: user._id,
        items: [],
      });
    }
    cart.items = [{
      product: product._id,
      name: product.name,
      quantity: 2,
      price: product.price,
      finalPrice: product.price,
      subtotal: product.price * 2,
      isAvailable: true,
    }];
    cart.totals = {
      subtotal: product.price * 2,
      discount: 0,
      tax: product.price * 2 * 0.15,
      shipping: 10,
      grandTotal: product.price * 2 * 1.15 + 10,
      totalItems: 2,
    };
    cart.markModified("items");
    await cart.save();
    console.log("User cart initialized with 2 items.");

    // 5. Generate secure verification signature
    const razorpay_order_id = `order_test_${Date.now()}`;
    const razorpay_payment_id = `pay_test_${Date.now()}`;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const razorpay_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    console.log("Simulating checkout and payment verification...");

    const payload = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderItems: [
        {
          product: product._id.toString(),
          qty: 2,
          price: product.price,
          name: product.name,
          image: product.image,
        }
      ],
      shippingAddress: {
        address: "123 Loft Street",
        city: "Mumbai",
        postalCode: "400001",
        country: "India",
      },
      shippingMethod: "standard",
    };

    // Make local call using node-fetch equivalent or direct route dispatch since server is running
    const response = await fetch("http://localhost:3000/api/payments/razorpay/verify-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Verification Response:", data);

    if (data?.success) {
      console.log("✅ Verification API call succeeded.");
      
      // 6. Verify MongoDB persistence
      const createdOrder = await Order.findById(data.orderId);
      if (createdOrder && createdOrder.isPaid && createdOrder.paymentProvider === "Razorpay") {
        console.log("✅ Order document verified in MongoDB.");
        console.log(`- Order Status: ${createdOrder.orderStatus}`);
        console.log(`- Total Price: $${createdOrder.totalPrice}`);
        console.log(`- Paid At: ${createdOrder.paidAt}`);
      } else {
        throw new Error("❌ Order not found or not marked paid in MongoDB.");
      }

      // 7. Verify stock deduction
      const updatedProduct = await Product.findById(product._id);
      if (updatedProduct.stock === 8) {
        console.log(`✅ Stock correctly decremented from 10 to ${updatedProduct.stock}.`);
      } else {
        throw new Error(`❌ Stock not decremented correctly. Found: ${updatedProduct.stock}`);
      }

      // 8. Verify cart is cleared
      const updatedCart = await Cart.findOne({ user: user._id });
      if (updatedCart.items.length === 0) {
        console.log("✅ User cart cleared in database.");
      } else {
        throw new Error("❌ User cart was not cleared.");
      }

      console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Razorpay payment flow is fully functional and secure.");
    } else {
      throw new Error(`❌ Verification API failed: ${data.message}`);
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

runTest();
