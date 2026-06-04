import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

const audit = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const totalProducts = await Product.countDocuments();
    const productsNoSlug = await Product.countDocuments({ $or: [{ slug: { $exists: false } }, { slug: null }] });
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Products without slug: ${productsNoSlug}`);

    // Let's find some products without slug
    const sampleNoSlug = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: null }] }).limit(5);
    console.log("Sample products without slug:");
    sampleNoSlug.forEach(p => console.log(`- ID: ${p._id}, Name: ${p.name}, Brand: ${p.brand}`));

    const totalCarts = await Cart.countDocuments();
    const cartsNoUser = await Cart.countDocuments({ $or: [{ user: { $exists: false } }, { user: null }] });
    console.log(`\nTotal Carts: ${totalCarts}`);
    console.log(`Carts without user: ${cartsNoUser}`);

    // Check duplicate users in Carts
    const duplicateUsers = await Cart.aggregate([
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    console.log("Duplicate users in Carts:", duplicateUsers);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

audit();
