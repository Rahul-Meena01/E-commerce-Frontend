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
    console.log("Found product to update:", product.name, "ID:", product._id);
    
    // Set product pricing: original price = 196, discounted price = 145, discount = 26%
    product.price = 196;
    product.discountPrice = 145;
    product.discountPercent = 26;
    await product.save();
    console.log("Updated product pricing.");
    
    // Update variants pricing
    // For Black, Navy, Charcoal: price = 196, discountPrice = 145, discountPercent = 26
    const resStandard = await Variant.updateMany(
      { parentProduct: product._id, color: { $in: ["Black", "Navy", "Charcoal"] } },
      {
        $set: {
          price: 196,
          discountPrice: 145,
          discountPercent: 26
        }
      }
    );
    console.log(`Updated ${resStandard.modifiedCount} standard variants.`);

    // For Beige: price = 216, discountPrice = 160, discountPercent = 26
    const resBeige = await Variant.updateMany(
      { parentProduct: product._id, color: "Beige" },
      {
        $set: {
          price: 216,
          discountPrice: 160,
          discountPercent: 26
        }
      }
    );
    console.log(`Updated ${resBeige.modifiedCount} beige variants.`);
  } else {
    console.log("Aero Knit Running Shoes not found.");
  }
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
