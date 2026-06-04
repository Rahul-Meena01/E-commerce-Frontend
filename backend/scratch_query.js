import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Variant from "./models/Variant.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  const productCount = await Product.countDocuments();
  const variantCount = await Variant.countDocuments();
  console.log(`Products: ${productCount}, Variants: ${variantCount}`);
  
  const products = await Product.find().limit(5);
  console.log("Sample Products:");
  for (const p of products) {
    console.log(`- ${p.name} (ID: ${p._id}, Status: ${p.status}, Stock: ${p.stock})`);
  }

  const variants = await Variant.find().limit(5);
  console.log("Sample Variants:");
  for (const v of variants) {
    console.log(`- ${v.name} (Parent: ${v.parentProduct}, SKU: ${v.sku}, Stock: ${v.stock}, Status: ${v.status})`);
  }
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
