import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // 1. Clean up carts with null user
    console.log("Cleaning up carts with null/undefined user...");
    const cartDelResult = await Cart.deleteMany({ $or: [{ user: { $exists: false } }, { user: null }] });
    console.log(`Deleted ${cartDelResult.deletedCount} invalid carts.`);

    // 2. Generate slugs for products with missing/null/undefined slug
    console.log("Generating slugs for products...");
    const products = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }] });
    console.log(`Found ${products.length} products needing a slug.`);

    let updatedCount = 0;
    for (const prod of products) {
      let baseSlug = slugify(prod.name || "product");
      if (!baseSlug) {
        baseSlug = "product";
      }

      // Ensure uniqueness of slug
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug: uniqueSlug, _id: { $ne: prod._id } })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      prod.slug = uniqueSlug;
      await prod.save({ validateBeforeSave: false }); // Skip validation if other fields are weird
      updatedCount++;
    }
    console.log(`Successfully generated and saved slugs for ${updatedCount} products.`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

migrate();
