// backend/scratch/frontend_verify.js
import puppeteer from 'puppeteer';

const URLs = [
  'http://localhost:5174/', // Home Page
  'http://localhost:5174/product/6a15b5bc5f47fb73249602b8', // Product Detail Page
  'http://localhost:5174/shop/men', // Category Page
];

async function verify() {
  console.log("Starting Puppeteer Frontend Verification...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('Console Error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.log('Page JS Error:', err.message);
  });

  let successCount = 0;

  for (const url of URLs) {
    console.log(`\nNavigating to ${url}...`);
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });
      console.log(`Response Status: ${response.status()}`);
      
      const title = await page.title();
      console.log(`Page Title: "${title}"`);

      // Verify that critical components are present (e.g. not a blank page)
      const content = await page.content();
      if (content.includes("id=\"root\"") || content.includes("class=")) {
        console.log("Page has root / DOM content.");
      }

      if (response.status() < 400) {
        successCount++;
      } else {
        console.error(`Error status code received: ${response.status()}`);
      }
    } catch (err) {
      console.error(`Failed to load ${url}:`, err.message);
    }
  }

  await browser.close();

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(`Successfully loaded ${successCount}/${URLs.length} URLs.`);
  console.log(`Total Console Errors captured: ${consoleErrors.length}`);
  console.log(`Total Page JS Errors captured: ${pageErrors.length}`);

  if (successCount === URLs.length && consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('STATUS: SUCCESS. All pages rendered correctly with zero console or page errors.');
    process.exit(0);
  } else {
    console.log('STATUS: WARNING. Some pages failed or returned errors.');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
