import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Vendor from "./models/VendorSchema.js";
import Product from "./models/Product.js";
import Category from "./models/Category.js";
import SubCategory from "./models/SubCategory.js";
import Coupon from "./models/Coupon.js";
import Order from "./models/Order.js";
import Cart from "./models/Cart.js";
import Wishlist from "./models/Wishlist.js";

// Import vendor models so they register on mongoose
import VendorCategory from "./models/Vendor/vendorCategory.js";
import VendorSubCategory from "./models/Vendor/vendorSubCategory.js";
import VendorProduct from "./models/Vendor/vendorProduct.js";
import VendorCoupon from "./models/Vendor/vendorCoupon.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Cleanup past E2E test data
  const emails = ["admin_e2e@loft-test.com", "vendor_e2e@loft-test.com", "customer_e2e@loft-test.com"];
  
  // Find vendor profiles to delete
  const testUsers = await User.find({ email: { $in: emails } });
  const vendorProfileIds = testUsers.map(u => u.vendorProfile).filter(Boolean);
  
  if (vendorProfileIds.length > 0) {
    await Vendor.deleteMany({ _id: { $in: vendorProfileIds } });
    console.log(`Deleted ${vendorProfileIds.length} vendor profiles.`);
  }

  const userResult = await User.deleteMany({ email: { $in: emails } });
  console.log(`Deleted ${userResult.deletedCount} users.`);

  // Delete E2E Vendor assets
  const catDel = await VendorCategory.deleteMany({ name: /E2E/ });
  const subDel = await VendorSubCategory.deleteMany({ name: /E2E/ });
  const prodDel = await VendorProduct.deleteMany({ name: /E2E/ });
  const coupDel = await VendorCoupon.deleteMany({ code: /E2E/ });

  console.log(`Deleted E2E Vendor assets: categories=${catDel.deletedCount}, subcategories=${subDel.deletedCount}, products=${prodDel.deletedCount}, coupons=${coupDel.deletedCount}`);

  // Clear orders created by customer_e2e
  const customerUser = await User.findOne({ email: "customer_e2e@loft-test.com" });
  if (customerUser) {
    const orderDel = await Order.deleteMany({ user: customerUser._id });
    const cartDel = await Cart.deleteMany({ user: customerUser._id });
    const wishDel = await Wishlist.deleteMany({ user: customerUser._id });
    console.log(`Deleted orders=${orderDel.deletedCount}, carts=${cartDel.deletedCount}, wishlists=${wishDel.deletedCount}`);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // Insert Admin
  const adminUser = new User({
    name: "Admin E2E",
    email: "admin_e2e@loft-test.com",
    password: hashedPassword,
    role: "admin",
    phone: "9999999999"
  });
  await adminUser.save();
  console.log("Created Admin E2E.");

  // Insert Customer
  const custUser = new User({
    name: "Customer E2E",
    email: "customer_e2e@loft-test.com",
    password: hashedPassword,
    role: "user",
    phone: "8888888888"
  });
  await custUser.save();
  console.log("Created Customer E2E.");

  await mongoose.disconnect();
  console.log("Database seeded successfully.");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
