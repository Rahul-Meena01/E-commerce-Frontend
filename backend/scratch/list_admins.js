import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function list() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to database.");
  const admins = await User.find({ role: "admin" });
  console.log("Found", admins.length, "admin users:");
  for (const a of admins) {
    console.log(`- Email: ${a.email}, Name: ${a.name}`);
  }
  await mongoose.disconnect();
}

list().catch(console.error);
