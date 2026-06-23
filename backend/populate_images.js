import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/category';

async function fetchFromPexels(keyword) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('No PEXELS_API_KEY set');

  const searchRes = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=5&orientation=square`,
    { headers: { Authorization: apiKey } }
  );
  if (!searchRes.ok) throw new Error(`Pexels search failed: ${searchRes.status}`);

  const data = await searchRes.json();
  if (!data.photos?.length) throw new Error('No Pexels result found');
  return data.photos; // return all photos
}

async function fetchFromPixabay(keyword) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) throw new Error('No PIXABAY_API_KEY set');

  const searchRes = await fetch(
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=5&min_width=600`
  );
  if (!searchRes.ok) throw new Error(`Pixabay search failed: ${searchRes.status}`);

  const data = await searchRes.json();
  if (!data.hits?.length) throw new Error('No Pixabay result found');
  return data.hits.map(h => ({ url: h.largeImageURL }));
}

async function fetchImages(keyword) {
  try {
    const photos = await fetchFromPexels(keyword);
    console.log(`  ✓ Got images from Pexels`);
    return photos.map(p => p.src.large);
  } catch (err) {
    console.log(`  ✗ Pexels: ${err.message}`);
  }

  try {
    const photos = await fetchFromPixabay(keyword);
    console.log(`  ✓ Got images from Pixabay`);
    return photos.map(p => p.url);
  } catch (err) {
    console.log(`  ✗ Pixabay: ${err.message}`);
  }

  throw new Error('All image sources failed');
}

async function downloadImage(url, uploadsDir) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png'
             : contentType.includes('webp') ? 'webp'
             : 'jpg';

  const filename = `${Date.now()}-${Math.floor(Math.random() * 1000000)}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, Buffer.from(buffer));

  return `/uploads/${filename}`;
}

function needsImage(value) {
  return !value || value === '' || value.includes('placeholder');
}

async function run() {
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB');

  const ProductSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

  // Sabhi products lo
  const products = await Product.find({});
  console.log(`Total products found: ${products.length}\n`);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const imageFields = ['image', 'image1', 'image2', 'image3', 'image4'];

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const product of products) {
    // Check karo ki koi bhi image field missing hai
    const missingFields = imageFields.filter(f => needsImage(product[f]));

    if (missingFields.length === 0) {
      console.log(`Skipping (all images OK): ${product.name}`);
      skipCount++;
      continue;
    }

    console.log(`Processing: ${product.name} — missing: ${missingFields.join(', ')}`);

    try {
      const keyword = product.name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .slice(0, 2)
        .join(' ');

      // Ek baar mein 5 images fetch karo
      const imageUrls = await fetchImages(keyword);

      // Har missing field ke liye ek image download karo
      for (let i = 0; i < missingFields.length; i++) {
        const field = missingFields[i];
        const url = imageUrls[i] || imageUrls[0]; // fallback to first if not enough

        const savedPath = await downloadImage(url, uploadsDir);
        product[field] = savedPath;

        // images array bhi update karo agar hai
        if (field === 'image') {
          product.images = [savedPath];
        }

        console.log(`  ✓ ${field} → ${savedPath}`);
        await new Promise(r => setTimeout(r, 200)); // small delay
      }

      await product.save();
      console.log(`  Saved!\n`);
      successCount++;

      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.log(`  Failed: ${err.message}\n`);
      failCount++;
    }
  }

  console.log('─'.repeat(40));
  console.log(`✓ Updated:  ${successCount}`);
  console.log(`⟳ Skipped:  ${skipCount}`);
  console.log(`✗ Failed:   ${failCount}`);
  process.exit(0);
}

run().catch(console.error);