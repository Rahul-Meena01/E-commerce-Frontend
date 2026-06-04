import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  const userCount = await User.countDocuments();
  console.log(`Total Users: ${userCount}`);
  
  const admins = await User.find({ role: "admin" });
  console.log("Admins:");
  admins.forEach(u => console.log(`- ${u.name} | ${u.email} | ${u.role}`));

  const vendors = await User.find({ role: "vendor" });
  console.log("Vendors:");
  vendors.forEach(u => console.log(`- ${u.name} | ${u.email} | ${u.role} | approved: ${u.isApproved}`));

  const customers = await User.find({ role: "user" });
  console.log("Customers (limit 5):");
  customers.slice(0, 5).forEach(u => console.log(`- ${u.name} | ${u.email} | ${u.role}`));
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
