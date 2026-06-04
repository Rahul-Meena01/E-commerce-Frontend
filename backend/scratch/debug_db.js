import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import SubCategory from "../models/SubCategory.js";

const debugDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const categories = await Category.find();
    console.log("=== CATEGORIES ===");
    categories.forEach(c => {
      console.log(`- ID: ${c._id}, Name: ${c.name}, Slug: ${c.slug}`);
    });

    const subcategories = await SubCategory.find().populate("parentCategory");
    console.log("\n=== SUBCATEGORIES ===");
    subcategories.forEach(s => {
      console.log(`- ID: ${s._id}, Name: ${s.name}, Slug: ${s.slug}, ParentCategory: ${s.parentCategory?.name} (ID: ${s.parentCategory?._id})`);
    });

    const products = await Product.find().populate({
      path: "subCategory",
      populate: { path: "parentCategory" }
    });
    console.log("\n=== PRODUCTS ===");
    products.forEach(p => {
      console.log(`- ID: ${p._id}, Name: ${p.name}, Slug: ${p.slug}, Status: ${p.status}, SubCat: ${p.subCategory?.name} (Slug: ${p.subCategory?.slug}), ParentCat: ${p.subCategory?.parentCategory?.name} (Slug: ${p.subCategory?.parentCategory?.slug})`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

debugDB();
