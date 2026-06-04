import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Variant from "./models/Variant.js";

dotenv.config();

const COLOR_OPTIONS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "Navy", hex: "#1b2a4a" },
  { name: "Beige", hex: "#c8b896" },
  { name: "Charcoal", hex: "#444444" },
];
const SIZES = ["S", "M", "L", "XL"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Clear existing variants
  const deletedCount = await Variant.deleteMany({});
  console.log(`Cleared ${deletedCount.deletedCount} existing variants.`);

  // Find all active products
  const activeProducts = await Product.find({ status: "Active" });
  console.log(`Found ${activeProducts.length} active products.`);

  let seededCount = 0;
  for (const product of activeProducts) {
    const parentId = product._id;
    // Get last 4 characters of the product ID to ensure uniqueness
    const prodShortId = parentId.toString().slice(-4).toUpperCase();
    const baseName = (product.name || "PRODUCT").slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // For each product, seed 16 variants (4 sizes * 4 colors)
    const variantsToInsert = [];
    for (const colorOpt of COLOR_OPTIONS) {
      for (const size of SIZES) {
        const baseColor = colorOpt.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
        const baseSize = size.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const rand = Math.floor(1000 + Math.random() * 9000);
        // LOFT-NAME-COLOR-SIZE-PROD_SHORT-RAND
        const sku = `LOFT-${baseName}-${baseColor}-${baseSize}-${prodShortId}-${rand}`;

        // Set pricing overrides randomly for Beige color
        let priceOverride = undefined;
        let discountPercentOverride = undefined;
        let discountPriceOverride = undefined;

        if (colorOpt.name === "Beige") {
          priceOverride = Math.round(product.price * 1.1); // 10% premium for Beige
          if (product.discountPercent) {
            discountPercentOverride = product.discountPercent;
            discountPriceOverride = Math.round(priceOverride * (1 - discountPercentOverride / 100));
          }
        }

        variantsToInsert.push({
          parentProduct: parentId,
          image: product.image,
          image1: product.image1,
          image2: product.image2,
          image3: product.image3,
          image4: product.image4,
          name: `${product.name} - ${colorOpt.name} / ${size}`,
          brand: product.brand,
          price: priceOverride || product.price,
          discountPercent: discountPercentOverride || product.discountPercent,
          discountPrice: discountPriceOverride || product.discountPrice,
          sku: sku,
          size: size,
          color: colorOpt.name,
          colorHex: colorOpt.hex,
          stock: Math.floor(Math.random() * 25) + 5, // 5 to 29 stock
          status: "Active"
        });
      }
    }

    await Variant.insertMany(variantsToInsert);
    seededCount += variantsToInsert.length;
  }

  console.log(`Seeded ${seededCount} variants successfully for ${activeProducts.length} products.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
