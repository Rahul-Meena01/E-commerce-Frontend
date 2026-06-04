import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";

const baseUrl = "http://localhost:3000";

async function run() {
  // 1. Create/find active user
  const email = `test_${Date.now()}@loft.com`;
  const password = "password123";
  
  console.log("Creating user...");
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "API Test User",
      email,
      password,
      phone: "1234567890"
    })
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) throw new Error(registerData.message);
  const token = registerData.token;
  const userId = registerData.user.id || registerData.user._id;
  console.log("Token acquired:", token, "User ID:", userId);

  // Connect to DB to set up a cart item
  await mongoose.connect(process.env.MONGO_URI);
  let product = await Product.findOne({ status: "Active" });
  if (!product) {
    product = await Product.create({
      name: "API Test Product",
      slug: "api-test-product-" + Date.now(),
      description: "Desc",
      price: 145,
      discountPrice: 145,
      stock: 10,
      status: "Active",
      brand: "Loft",
      category: new mongoose.Types.ObjectId(),
      subCategory: new mongoose.Types.ObjectId(),
    });
  }
  
  // Add item to cart via DB directly for speed
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{
        product: product._id,
        name: product.name,
        quantity: 1,
        price: product.price,
        finalPrice: product.price,
        subtotal: product.price
      }],
      totals: {
        subtotal: product.price,
        discount: 0,
        tax: product.price * 0.18,
        shipping: 99,
        grandTotal: product.price * 1.18 + 99,
        totalItems: 1
      }
    });
  } else {
    cart.items = [{
      product: product._id,
      name: product.name,
      quantity: 1,
      price: product.price,
      finalPrice: product.price,
      subtotal: product.price
    }];
    cart.totals = {
      subtotal: product.price,
      discount: 0,
      tax: product.price * 0.18,
      shipping: 99,
      grandTotal: product.price * 1.18 + 99,
      totalItems: 1
    };
    await cart.save();
  }
  console.log("Cart totals set to:", cart.totals);

  // 2. Create Razorpay Order
  console.log("Creating Razorpay Order...");
  const rzpRes = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const rzpData = await rzpRes.json();
  if (!rzpRes.ok) throw new Error(rzpData.message);
  console.log("Razorpay Order ID:", rzpData.rzpOrderId);

  // 3. Verify Payment and create Order
  console.log("Verifying Razorpay Payment...");
  const crypto = await import("crypto");
  const rzpPaymentId = `pay_test_${Date.now()}`;
  const sign = rzpData.rzpOrderId + "|" + rzpPaymentId;
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest("hex");

  const verifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      razorpay_payment_id: rzpPaymentId,
      razorpay_order_id: rzpData.rzpOrderId,
      razorpay_signature: signature,
      shippingAddress: {
        address: "123 Street",
        city: "Mumbai",
        postalCode: "400001",
        country: "India"
      },
      shippingMethod: "standard"
    })
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(verifyData.message);
  const orderId = verifyData.orderId;
  console.log("Order created with ID:", orderId);

  // 4. Hit GET /api/orders/:id
  console.log("Hitting GET /api/orders/:id ...");
  const getOrderRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const getOrderData = await getOrderRes.json();
  console.log("GET Order Status Code:", getOrderRes.status);
  console.log("GET Order Response:", JSON.stringify(getOrderData, null, 2));

  // Clean up
  await User.deleteOne({ _id: userId });
  await Cart.deleteOne({ user: userId });
  await Order.deleteOne({ _id: orderId });
  await mongoose.disconnect();
}

run().catch(console.error);
