import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const product = await Product.findOne({ name: /Aero/i });
  if (product) {
    console.log("Found Aero Product:", JSON.stringify(product, null, 2));
    
    const variants = await Variant.find({ parentProduct: product._id });
    console.log(`Found ${variants.length} variants:`);
    for (const v of variants) {
      console.log(`- ${v.name} (SKU: ${v.sku}, Stock: ${v.stock}, Price: ${v.price}, Size: ${v.size}, Color: ${v.color})`);
    }
  } else {
    console.log("Aero Knit Running Shoes NOT found in DB. Let's list the first 10 products:");
    const products = await Product.find().limit(10);
    console.log(products.map(p => `- ${p.name} (${p._id})`));
  }
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
