import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";

dotenv.config();

const IMAGES = {
  image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", // Red shoe main
  image1: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", // Brown shoe
  image2: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80", // White sole/detail
  image3: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80", // Red knit texture
  image4: "https://images.unsplash.com/photo-1508609348619-e14b77f5f3fc?w=800&q=80", // Red shoe back/detail
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const product = await Product.findOne({ name: /Aero/i });
  if (product) {
    console.log("Found product to update:", product.name, "ID:", product._id);
    
    // Update product images
    product.image = IMAGES.image;
    product.image1 = IMAGES.image1;
    product.image2 = IMAGES.image2;
    product.image3 = IMAGES.image3;
    product.image4 = IMAGES.image4;
    await product.save();
    console.log("Updated product images.");
    
    // Update variant images
    const result = await Variant.updateMany(
      { parentProduct: product._id },
      {
        $set: {
          image: IMAGES.image,
          image1: IMAGES.image1,
          image2: IMAGES.image2,
          image3: IMAGES.image3,
          image4: IMAGES.image4,
        }
      }
    );
    console.log(`Updated ${result.modifiedCount} variants.`);
  } else {
    console.log("Aero Knit Running Shoes not found.");
  }
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
