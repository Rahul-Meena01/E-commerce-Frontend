// backend/scratch/smoke_test.js
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

const uniqueId = Math.random().toString(36).substring(7);
const testUser = {
  name: "Smoke Test User",
  email: `smoketest_${uniqueId}@example.com`,
  password: "smoketestpassword",
  phone: "1234567890",
};

async function runSmokeTests() {
  console.log("Starting Controller Smoke Tests...");
  let userToken = "";

  try {
    // 0. Register & Login to get a valid token
    console.log("\n0. Authenticating test user...");
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.success) {
      throw new Error("Failed to register smoke test user");
    }
    userToken = regData.token;
    console.log("User authenticated successfully.");

    // 1. Product APIs
    console.log("\n1. Testing Product APIs...");
    const productsRes = await fetch(`${BASE_URL}/products`);
    const productsData = await productsRes.json();
    console.log("GET /products status:", productsRes.status);
    console.log("GET /products data length:", productsData.data?.length);
    if (productsRes.status !== 200 || !productsData.success) {
      throw new Error("Product listing API failed");
    }

    const productDetailRes = await fetch(`${BASE_URL}/products/public/6a15b5bc5f47fb73249602b8`);
    const productDetailData = await productDetailRes.json();
    console.log("GET /products/:id status:", productDetailRes.status);
    console.log("GET /products/:id name:", productDetailData.data?.name);
    if (productDetailRes.status !== 200 || !productDetailData.success) {
      throw new Error("Product detail API failed");
    }

    // 2. Cart APIs
    console.log("\n2. Testing Cart APIs (Protected)...");
    const cartRes = await fetch(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const cartData = await cartRes.json();
    console.log("GET /cart status:", cartRes.status);
    console.log("GET /cart success:", cartData.success);
    if (cartRes.status !== 200 || !cartData.success) {
      throw new Error("Cart API failed");
    }

    // 3. Coupon APIs (Unauthorized Verification)
    console.log("\n3. Testing Coupon APIs (Verify 401 Unauthorized propagation)...");
    const couponRes = await fetch(`${BASE_URL}/coupon/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ couponCode: "WELCOME10", cartTotal: 1200 }),
    });
    const couponData = await couponRes.json();
    console.log("POST /coupon/apply status (no token):", couponRes.status);
    console.log("POST /coupon/apply response:", couponData);
    if (couponRes.status !== 401 || couponData.success !== false) {
      throw new Error("Global error handler failed to catch unauthorized coupon apply");
    }

    // 4. Order APIs
    console.log("\n4. Testing Order APIs (Protected)...");
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const orderData = await orderRes.json();
    console.log("GET /orders status:", orderRes.status);
    console.log("GET /orders response data items:", orderData.data?.length);
    if (orderRes.status !== 200) {
      throw new Error("Orders API failed");
    }

    // 5. Payment Order Creation API
    console.log("\n5. Testing Payment Order Creation (Protected)...");
    const paymentRes = await fetch(`${BASE_URL}/payments/razorpay/create-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json"
      },
    });
    const paymentData = await paymentRes.json();
    console.log("POST /payments/razorpay/order status:", paymentRes.status);
    console.log("POST /payments/razorpay/order response:", paymentData);
    if ((paymentRes.status === 200 && paymentData.success) || (paymentRes.status === 400 && paymentData.message === "Your cart is empty")) {
      console.log("POST /payments/razorpay/create-order verified successfully.");
    } else {
      throw new Error("Payment order creation failed");
    }

    // 6. Admin Order Management (Forbidden Verification)
    console.log("\n6. Testing Admin Operations (Verify 403 Forbidden propagation for user)...");
    const adminRes = await fetch(`${BASE_URL}/coupon`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const adminData = await adminRes.json();
    console.log("GET /coupon status (for user):", adminRes.status);
    console.log("GET /coupon response:", adminData);
    if (adminRes.status !== 403 || adminData.success !== false) {
      throw new Error("Global error handler failed to catch forbidden admin operation");
    }

    console.log("\nAll smoke tests passed successfully!");
  } catch (error) {
    console.error("Smoke test execution failed:", error);
    process.exit(1);
  }
}

runSmokeTests();
