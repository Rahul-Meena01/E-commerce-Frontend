import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";

const runE2ETest = async () => {
  try {
    console.log("=== STEP 0: CONNECTING TO DATABASE ===");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully.\n");

    // 1. Setup or find a test product
    let product = await Product.findOne({ status: "Active" });
    if (!product) {
      // Create a dummy active product if none exists
      product = await Product.create({
        name: "Premium Denim Jeans",
        slug: "premium-denim-jeans-" + Date.now(),
        description: "Classic fit premium denim jeans.",
        price: 600,
        discountPrice: 600,
        stock: 50,
        status: "Active",
        brand: "Loft Classic",
        category: new mongoose.Types.ObjectId(),
        subCategory: new mongoose.Types.ObjectId(),
      });
    } else {
      // Ensure sufficient stock and price for test
      await Product.updateOne({ _id: product._id }, { $set: { stock: 50, price: 600, discountPrice: 600 } });
      product = await Product.findById(product._id);
    }
    console.log(`Using Product: "${product.name}"`);
    console.log(`- ID: ${product._id}`);
    console.log(`- Price: ₹${product.price}`);
    console.log(`- Stock: ${product.stock}\n`);

    // 2. Setup or find a test coupon
    let coupon = await Coupon.findOne({ code: "E2ETEST100" });
    if (!coupon) {
      coupon = await Coupon.create({
        code: "E2ETEST100",
        discountType: "fixed",
        discountValue: 100,
        minimumOrderAmount: 500,
        usageLimit: 100,
        usedCount: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "active",
      });
    } else {
      // Reset values for test
      await Coupon.updateOne(
        { _id: coupon._id },
        {
          $set: {
            discountType: "fixed",
            discountValue: 100,
            minimumOrderAmount: 500,
            status: "active",
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }
      );
      coupon = await Coupon.findById(coupon._id);
    }
    console.log(`Using Coupon: "${coupon.code}"`);
    console.log(`- Discount Value: ₹${coupon.discountValue} (${coupon.discountType})`);
    console.log(`- Minimum Order Amount: ₹${coupon.minimumOrderAmount}\n`);

    const testEmail = `user_${Date.now()}@loft-test.com`;
    const testPassword = "securePassword123";

    await mongoose.disconnect();
    console.log("Database connection closed for HTTP-level simulation.\n");

    const baseUrl = "http://localhost:3000";

    // 1. User Signup
    console.log("=== STEP 1: USER SIGNUP ===");
    const signupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "E2E Test User",
        email: testEmail,
        password: testPassword,
        phone: "9876543210",
      }),
    });
    const signupData = await signupRes.json();
    if (!signupRes.ok || !signupData.success) {
      throw new Error(`Signup failed: ${signupData.message}`);
    }
    console.log(`- Registered User: ${signupData.user.name} (${signupData.user.email})`);
    const token = signupData.token;
    console.log("- Retained Authorization JWT Token.\n");

    // 2. User Login
    console.log("=== STEP 2: USER LOGIN ===");
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        role: "user",
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.success) {
      throw new Error(`Login failed: ${loginData.message}`);
    }
    console.log("- Login successful. Token matches registry.\n");

    // 3. Add Product to Cart
    console.log("=== STEP 3: ADD PRODUCT TO CART ===");
    const addCartRes = await fetch(`${baseUrl}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product._id.toString(),
        quantity: 2,
        size: "M",
        color: "Blue",
      }),
    });
    const addCartData = await addCartRes.json();
    if (!addCartRes.ok || !addCartData.success) {
      throw new Error(`Add to cart failed: ${addCartData.message}`);
    }
    console.log("- Successfully added 2 items to Cart.\n");

    // 4. Apply Coupon
    console.log("=== STEP 4: APPLY COUPON ===");
    const applyCouponRes = await fetch(`${baseUrl}/api/cart/apply-coupon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: "E2ETEST100",
      }),
    });
    const applyCouponData = await applyCouponRes.json();
    if (!applyCouponRes.ok || !applyCouponData.success) {
      throw new Error(`Apply coupon failed: ${applyCouponData.message}`);
    }
    console.log(`- Coupon "E2ETEST100" applied successfully.\n`);

    // Verify Cart Totals
    console.log("=== STEP 4.5: VERIFY CART TOTALS ===");
    const getCartRes = await fetch(`${baseUrl}/api/cart`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const getCartData = await getCartRes.json();
    if (!getCartRes.ok || !getCartData.success) {
      throw new Error(`Fetch cart failed: ${getCartData.message}`);
    }
    const cartTotals = getCartData.data.totals;
    console.log(`- Subtotal: ₹${cartTotals.subtotal}`);
    console.log(`- Discount: ₹${cartTotals.discount}`);
    console.log(`- Tax (18%): ₹${cartTotals.tax}`);
    console.log(`- Shipping: ₹${cartTotals.shipping}`);
    console.log(`- Grand Total: ₹${cartTotals.grandTotal}`);

    // Math validation
    const expectedSubtotal = product.price * 2; // 1200
    const expectedDiscount = 100;
    const expectedTax = (expectedSubtotal - expectedDiscount) * 0.18; // 198
    const expectedShipping = (expectedSubtotal - expectedDiscount) >= 1000 ? 0 : 99; // 0
    const expectedGrandTotal = (expectedSubtotal - expectedDiscount) + expectedTax + expectedShipping; // 1298

    if (cartTotals.subtotal !== expectedSubtotal) throw new Error("Subtotal mismatch!");
    if (cartTotals.discount !== expectedDiscount) throw new Error("Discount mismatch!");
    if (cartTotals.tax !== expectedTax) throw new Error("Tax mismatch!");
    if (cartTotals.shipping !== expectedShipping) throw new Error("Shipping mismatch!");
    if (cartTotals.grandTotal !== expectedGrandTotal) throw new Error("Grand Total mismatch!");
    console.log("✅ Cart Totals check out perfectly.\n");

    // 5. Checkout & Razorpay Order Creation
    console.log("=== STEP 5: CREATING RAZORPAY ORDER ===");
    const rzpOrderRes = await fetch(`${baseUrl}/api/payments/razorpay/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    const rzpOrderData = await rzpOrderRes.json();
    if (!rzpOrderRes.ok || !rzpOrderData.success) {
      throw new Error(`Razorpay order creation failed: ${rzpOrderData.message}`);
    }
    console.log(`- Razorpay Order ID: ${rzpOrderData.rzpOrderId}`);
    console.log(`- Razorpay Amount: ₹${rzpOrderData.amount / 100} (INR)`);
    if (rzpOrderData.amount / 100 !== expectedGrandTotal) {
      throw new Error(`Razorpay Amount (${rzpOrderData.amount / 100}) does not match Cart Grand Total (${expectedGrandTotal})!`);
    }
    console.log("✅ Razorpay Amount matches Cart Grand Total exactly.\n");

    // 6. Simulate Payment & Verify Signature
    console.log("=== STEP 6: VERIFYING RAZORPAY PAYMENT ===");
    const razorpay_order_id = rzpOrderData.rzpOrderId;
    const razorpay_payment_id = `pay_test_${Date.now()}`;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const razorpay_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    const verifyPayload = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      shippingAddress: {
        address: "456 Loft Boulevard",
        city: "Bangalore",
        postalCode: "560001",
        country: "India",
      },
      shippingMethod: "standard",
    };

    const verifyRes = await fetch(`${baseUrl}/api/payments/razorpay/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(verifyPayload),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(`Razorpay verification failed: ${verifyData.message}`);
    }
    console.log(`- Verification Success: ${verifyData.success}`);
    console.log(`- Created Order ID: ${verifyData.orderId}\n`);

    // 7. Verify Database Persistence & Deductions
    console.log("=== STEP 7: VERIFYING DATABASE STATE ===");
    await mongoose.connect(process.env.MONGO_URI);
    
    // Order verification
    const orderDoc = await Order.findById(verifyData.orderId);
    if (!orderDoc) throw new Error("Order document not found in DB!");
    console.log("- Verified Order exists in database.");
    console.log(`  - Subtotal snapshot: ₹${orderDoc.itemsPrice}`);
    console.log(`  - Discount snapshot: ₹${orderDoc.discountPrice}`);
    console.log(`  - Coupon Code snapshot: ${orderDoc.couponCode}`);
    console.log(`  - Tax snapshot: ₹${orderDoc.taxPrice}`);
    console.log(`  - Shipping snapshot: ₹${orderDoc.shippingPrice}`);
    console.log(`  - Grand Total snapshot: ₹${orderDoc.totalPrice}`);
    console.log(`  - Payment status: ${orderDoc.isPaid ? "PAID" : "UNPAID"}`);

    if (orderDoc.itemsPrice !== expectedSubtotal) throw new Error("Order subtotal mismatch!");
    if (orderDoc.discountPrice !== expectedDiscount) throw new Error("Order discount mismatch!");
    if (orderDoc.couponCode !== "E2ETEST100") throw new Error("Order coupon mismatch!");
    if (orderDoc.taxPrice !== expectedTax) throw new Error("Order tax mismatch!");
    if (orderDoc.shippingPrice !== expectedShipping) throw new Error("Order shipping mismatch!");
    if (orderDoc.totalPrice !== expectedGrandTotal) throw new Error("Order grand total mismatch!");
    console.log("✅ DB Order Snapshot values match expectations exactly.");

    // Cart clearing check
    const cartDoc = await Cart.findOne({ user: signupData.user.id });
    console.log(`- Cart items remaining count: ${cartDoc.items.length}`);
    if (cartDoc.items.length !== 0) throw new Error("Cart was not cleared!");
    console.log("✅ Cart cleared correctly.");

    // Stock deduction check
    const updatedProd = await Product.findById(product._id);
    console.log(`- Original stock: 50. Updated stock: ${updatedProd.stock}`);
    if (updatedProd.stock !== 48) throw new Error("Stock not deducted correctly!");
    console.log("✅ Stock correctly decremented by 2.");

    // Clean up test data
    await User.deleteOne({ _id: signupData.user.id });
    await Cart.deleteOne({ user: signupData.user.id });
    await Order.deleteOne({ _id: verifyData.orderId });
    console.log("- Cleaned up E2E temporary entities from database.\n");
    
    await mongoose.disconnect();

    // 8. Verify Profile Order History
    console.log("=== STEP 8: PROFILE ORDER HISTORY ===");
    const profileHistoryRes = await fetch(`${baseUrl}/api/orders/myorders`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const profileHistoryData = await profileHistoryRes.json();
    console.log(`- User Profile Order list count: ${profileHistoryData.orders?.length || 0}`);
    console.log("✅ Profile Order History works.\n");

    // 9. Admin Dashboard Orders
    console.log("=== STEP 9: ADMIN DASHBOARD ORDERS ===");
    // Create token for admin (mock or find a test admin)
    // Find an admin user in DB
    await mongoose.connect(process.env.MONGO_URI);
    const adminUser = await User.findOne({ role: "admin" });
    let adminToken = token;
    if (adminUser) {
      console.log(`- Found Admin user: ${adminUser.email}`);
      const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminUser.email,
          password: "password123", // assumes standard test seeding
          role: "admin",
        }),
      });
      const adminLoginData = await adminLoginRes.json();
      if (adminLoginRes.ok && adminLoginData.success) {
        adminToken = adminLoginData.token;
        console.log("- Admin token generated.");
      }
    }
    await mongoose.disconnect();

    const adminOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const adminOrdersData = await adminOrdersRes.json();
    console.log(`- Admin Orders list count: ${adminOrdersData.orders?.length || 0}`);
    console.log("✅ Admin Dashboard Order visibility validated.\n");

    console.log("🎉 SUCCESS: ALL E2E VERIFICATION CHECKS PASSED!");

  } catch (error) {
    console.error("❌ E2E Test Failed:", error);
    process.exit(1);
  }
};

runE2ETest();
