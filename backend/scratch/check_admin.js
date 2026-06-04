import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB.");

  const users = await User.find({ role: "admin" });
  console.log("Admin Users in DB:");
  users.forEach((u) => {
    console.log(`- Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  });

  const rahul = await User.findOne({ email: "rahul12345@gmail.com" });
  if (rahul) {
    console.log(`Rahul exists: Role=${rahul.role}, Email=${rahul.email}`);
  } else {
    console.log("Rahul user does not exist in DB!");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
