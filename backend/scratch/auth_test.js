// backend/scratch/auth_test.js


const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api/auth`;

const uniqueId = Math.random().toString(36).substring(7);
const testUser = {
  name: "Test User",
  email: `testuser_${uniqueId}@example.com`,
  password: "testpassword123",
  phone: "1234567890",
};

const testAdmin = {
  name: "Test Admin",
  email: `testadmin_${uniqueId}@example.com`,
  password: "testpassword123",
  phone: "0987654321",
  secretKey: "replace_with_a_secure_random_admin_secret", // ADMIN_SECRET from .env
};

async function runTests() {
  console.log("Starting Auth Regression Tests...");
  let cookieHeader = "";
  let userToken = "";
  let adminToken = "";

  try {
    // 1. Register User
    console.log("\n1. Testing User Registration...");
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    console.log("Status:", regRes.status);
    console.log("Body:", regData);

    if (regRes.status !== 201 || !regData.success || !regData.token) {
      throw new Error("User registration failed");
    }
    userToken = regData.token;

    // Extract cookie
    const setCookie = regRes.headers.get("set-cookie");
    if (setCookie) {
      cookieHeader = setCookie.split(";")[0];
      console.log("Cookie captured:", cookieHeader);
    }

    // 2. Register Admin (should succeed if ADMIN_SECRET matches)
    console.log("\n2. Testing Admin Registration...");
    const regAdminRes = await fetch(`${BASE_URL}/register-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testAdmin),
    });
    const regAdminData = await regAdminRes.json();
    console.log("Status:", regAdminRes.status);
    console.log("Body:", regAdminData);

    if (regAdminRes.status !== 201 || !regAdminData.success || !regAdminData.token) {
      throw new Error("Admin registration failed");
    }
    adminToken = regAdminData.token;

    // 3. User Login
    console.log("\n3. Testing User Login...");
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginData = await loginRes.json();
    console.log("Status:", loginRes.status);
    console.log("Body:", loginData);

    if (loginRes.status !== 200 || !loginData.success || !loginData.token) {
      throw new Error("User login failed");
    }

    // 4. Get Profile (Protected Route)
    console.log("\n4. Testing Profile Retrieval (PUT with empty body to verify access)...");
    const profileRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({}),
    });
    const profileData = await profileRes.json();
    console.log("Status:", profileRes.status);
    console.log("Body:", profileData);

    if (profileRes.status !== 200 || !profileData.success) {
      throw new Error("Profile retrieval failed");
    }

    // 5. Update Profile
    console.log("\n5. Testing Profile Update...");
    const updateRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "Updated Test Name", location: "San Francisco" }),
    });
    const updateData = await updateRes.json();
    console.log("Status:", updateRes.status);
    console.log("Body:", updateData);

    if (updateRes.status !== 200 || !updateData.success || updateData.user.name !== "Updated Test Name") {
      throw new Error("Profile update failed");
    }

    // 6. Logout
    console.log("\n6. Testing Logout...");
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
    });
    const logoutData = await logoutRes.json();
    console.log("Status:", logoutRes.status);
    console.log("Body:", logoutData);

    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error("Logout failed");
    }

    console.log("\nAll Auth tests completed successfully!");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runTests();
