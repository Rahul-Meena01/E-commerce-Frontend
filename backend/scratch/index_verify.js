// backend/scratch/index_verify.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load models to register schemas
import User from "../models/User.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";

dotenv.config();

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected successfully.\n");

  const models = [
    { name: "User", model: User },
    { name: "Products", model: Product },
    { name: "Variants", model: Variant },
    { name: "Cart", model: Cart },
    { name: "Order", model: Order },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    collections: {},
    buildFailures: [],
  };

  for (const m of models) {
    console.log(`Syncing indexes for collection: ${m.name}...`);
    try {
      // Force Mongoose to create/sync any newly defined schema indexes in the database
      const syncResult = await m.model.syncIndexes();
      console.log(`  Sync completed. Created: ${syncResult.length} indexes.`);
    } catch (err) {
      console.error(`  Index sync failed for ${m.name}:`, err.message);
      report.buildFailures.push({ collection: m.name, error: err.message });
    }

    console.log(`Listing live indexes for collection: ${m.name}...`);
    try {
      const dbIndexes = await m.model.collection.listIndexes().toArray();
      report.collections[m.name] = dbIndexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: !!idx.unique,
        sparse: !!idx.sparse,
        weights: idx.weights,
      }));
      console.log(`  Found ${dbIndexes.length} live indexes.`);
    } catch (err) {
      console.error(`  Failed to list indexes for ${m.name}:`, err.message);
    }
  }

  // Audit for duplicates (indexes with identical key definitions)
  const duplicateChecks = {};
  for (const [colName, idxList] of Object.entries(report.collections)) {
    const keysSeen = new Set();
    const duplicates = [];
    for (const idx of idxList) {
      const keyStr = JSON.stringify(idx.key);
      if (keysSeen.has(keyStr)) {
        duplicates.push(idx.name);
      } else {
        keysSeen.add(keyStr);
      }
    }
    if (duplicates.length > 0) {
      duplicateChecks[colName] = duplicates;
    }
  }
  report.duplicateIndexes = duplicateChecks;

  // Write report to baseline/INDEX_REPORT.json
  const baselineDir = path.resolve(process.cwd(), "../baseline");
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }
  const reportPath = path.join(baselineDir, "INDEX_REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport generated and saved to: ${reportPath}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
