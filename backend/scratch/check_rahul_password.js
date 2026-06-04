import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB.");

  const rahul = await User.findOne({ email: "rahul12345@gmail.com" });
  if (rahul) {
    console.log(`Rahul exists: Role=${rahul.role}, Email=${rahul.email}`);
    const isMatch = await bcrypt.compare("password123", rahul.password);
    console.log(`Password "password123" matches? ${isMatch}`);
    
    // Also print out other potential passwords or reset it if it doesn't match
    if (!isMatch) {
      console.log("Password does not match! Resetting password to 'password123'...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      rahul.password = hashedPassword;
      await rahul.save();
      console.log("Password reset successfully.");
    }
  } else {
    console.log("Rahul user does not exist in DB!");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
