import "dotenv/config";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  const carts = await Cart.find().limit(5);
  for (const c of carts) {
    console.log("Cart ID:", c._id);
    console.log("User ID:", c.user);
    console.log("Totals:", JSON.stringify(c.totals));
    console.log("Items Count:", c.items.length);
    if (c.items.length > 0) {
      console.log("First Item Price:", c.items[0].price);
      console.log("First Item FinalPrice:", c.items[0].finalPrice);
    }
    console.log("----------------------------");
  }
  await mongoose.disconnect();
}

check().catch(console.error);
