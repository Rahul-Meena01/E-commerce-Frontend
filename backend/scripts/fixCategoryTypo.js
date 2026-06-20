import mongoose from "mongoose";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not set in environment variables.");
  process.exit(1);
}

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;

    // We will update the collections case-insensitively
    const collectionsToUpdate = [
      "categories",
      "subcategories",
      "vendorcategories",
      "vendorsubcategories"
    ];

    for (const colName of collectionsToUpdate) {
      const col = db.collection(colName);
      const docs = await col.find({}).toArray();
      console.log(`Documents in "${colName}":`, docs.map(d => ({ name: d.name, slug: d.slug })));
      
      const nameTypos = ["Wodden", "woden", "Woden", "wodden", "Wodden "];
      for (const typo of nameTypos) {
        const res = await col.updateMany(
          { name: typo },
          { $set: { name: "Wooden" } }
        );
        if (res.modifiedCount > 0) {
          console.log(`Collection "${colName}": Updated name typo "${typo}" -> "Wooden" for ${res.modifiedCount} docs.`);
        }
      }

      const slugTypos = ["wodden", "woden"];
      for (const typo of slugTypos) {
        const res = await col.updateMany(
          { slug: typo },
          { $set: { slug: "wooden" } }
        );
        if (res.modifiedCount > 0) {
          console.log(`Collection "${colName}": Updated slug typo "${typo}" -> "wooden" for ${res.modifiedCount} docs.`);
        }
      }
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
