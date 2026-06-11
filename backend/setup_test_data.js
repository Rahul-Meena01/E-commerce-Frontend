import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import GiftCard from "./models/GiftCard.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in .env");
  process.exit(1);
}

async function setup() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    // 1. Create or update test customer
    const email = "customer@test.com";
    const plainPassword = "Password123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    let user = await User.findOne({ email });
    if (user) {
      console.log(`User ${email} already exists. Updating password...`);
      user.password = hashedPassword;
      await user.save();
    } else {
      console.log(`Creating user ${email}...`);
      user = await User.create({
        name: "Test Customer",
        email,
        password: hashedPassword,
        phone: "9876543210",
      });
    }
    console.log("User setup done:", user._id);

    // 2. Set up test gift cards
    const testCards = [
      {
        code: "GC_VALID",
        giftCardValue: 500,
        expiryDate: new Date("2026-12-31T23:59:59.000Z"),
        receiverName: "Test Customer",
        senderName: "LOFT Brand",
        description: "Valid test gift card worth 500",
        status: "active",
      },
      {
        code: "GC_EXPIRED",
        giftCardValue: 500,
        expiryDate: new Date("2020-01-01T00:00:00.000Z"),
        receiverName: "Test Customer",
        senderName: "LOFT Brand",
        description: "Expired gift card",
        status: "active",
      },
      {
        code: "GC_INACTIVE",
        giftCardValue: 500,
        expiryDate: new Date("2026-12-31T23:59:59.000Z"),
        receiverName: "Test Customer",
        senderName: "LOFT Brand",
        description: "Used/Inactive gift card",
        status: "inactive",
      },
      {
        code: "GC_VAL1000",
        giftCardValue: 2000,
        expiryDate: new Date("2026-12-31T23:59:59.000Z"),
        receiverName: "Test Customer",
        senderName: "LOFT Brand",
        description: "High value gift card worth 2000 to fully cover totals",
        status: "active",
      },
    ];

    for (const card of testCards) {
      const existing = await GiftCard.findOne({ code: card.code });
      if (existing) {
        console.log(`Gift card ${card.code} already exists. Updating details...`);
        Object.assign(existing, card);
        await existing.save();
      } else {
        console.log(`Creating gift card ${card.code}...`);
        await GiftCard.create(card);
      }
    }

    console.log("All test gift cards initialized successfully.");
  } catch (error) {
    console.error("Error setting up test data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

setup();
