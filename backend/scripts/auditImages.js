import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not set in environment variables.");
  process.exit(1);
}

const UPLOADS_DIR = path.resolve("uploads");

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;

    const products = await db.collection("products").find({}).toArray();
    const vendorProducts = await db.collection("vendorproducts").find({}).toArray();

    const allProducts = [
      ...products.map(p => ({ ...p, type: "AdminProduct" })),
      ...vendorProducts.map(vp => ({ ...vp, type: "VendorProduct" }))
    ];

    const missingReports = [];

    for (const prod of allProducts) {
      const imageFields = ["image", "image1", "image2", "image3", "image4"];
      const missingFields = [];

      for (const field of imageFields) {
        const imgPath = prod[field];
        if (imgPath) {
          // If it is a relative path or starts with /uploads or uploads
          if (imgPath.startsWith("/uploads/") || imgPath.startsWith("uploads/")) {
            const relativePath = imgPath.replace(/^\/?uploads\//, "");
            const fullPath = path.join(UPLOADS_DIR, relativePath);
            if (!fs.existsSync(fullPath)) {
              missingFields.push({ field, path: imgPath, resolvedPath: fullPath });
            }
          } else if (!imgPath.startsWith("http://") && !imgPath.startsWith("https://") && !imgPath.startsWith("data:")) {
            // Check in uploads directly
            const fullPath = path.join(UPLOADS_DIR, imgPath);
            if (!fs.existsSync(fullPath)) {
              missingFields.push({ field, path: imgPath, resolvedPath: fullPath });
            }
          }
        }
      }

      // Also check images array if it exists
      if (Array.isArray(prod.images)) {
        prod.images.forEach((imgUrl, idx) => {
          if (imgUrl && (imgUrl.startsWith("/uploads/") || imgUrl.startsWith("uploads/"))) {
            const relativePath = imgUrl.replace(/^\/?uploads\//, "");
            const fullPath = path.join(UPLOADS_DIR, relativePath);
            if (!fs.existsSync(fullPath)) {
              missingFields.push({ field: `images[${idx}]`, path: imgUrl, resolvedPath: fullPath });
            }
          }
        });
      }

      if (missingFields.length > 0) {
        missingReports.push({
          id: prod._id,
          name: prod.name,
          brand: prod.brand,
          type: prod.type,
          missing: missingFields
        });
      }
    }

    // Generate Markdown Report
    let mdContent = `# Missing Product Images Report\n\n`;
    mdContent += `Generated on: ${new Date().toISOString()}\n\n`;
    mdContent += `This report lists all products in the database that reference local image files (under \`/uploads\`) that do not exist on the server disk.\n\n`;
    mdContent += `Total Products Audited: ${allProducts.length}\n`;
    mdContent += `Products with Missing Images: ${missingReports.length}\n\n`;

    if (missingReports.length === 0) {
      mdContent += `## 🎉 All local product images exist on disk!\n`;
    } else {
      mdContent += `| Product ID | Name | Brand | Type | Field | Missing Path |\n`;
      mdContent += `| --- | --- | --- | --- | --- | --- |\n`;
      
      for (const rep of missingReports) {
        for (const mis of rep.missing) {
          mdContent += `| \`${rep.id}\` | ${rep.name} | ${rep.brand} | ${rep.type} | \`${mis.field}\` | \`${mis.path}\` |\n`;
        }
      }
    }

    const reportPath = path.join(
      "C:\\Users\\dell\\.gemini\\antigravity\\brain\\72b651db-4fc4-4f76-a43e-202051537339",
      "missing_images_report.md"
    );

    fs.writeFileSync(reportPath, mdContent, "utf8");
    console.log(`Missing images report successfully written to: ${reportPath}`);

    process.exit(0);
  } catch (err) {
    console.error("Audit failed:", err);
    process.exit(1);
  }
}

run();
