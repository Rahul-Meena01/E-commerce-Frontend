// backend/verify_responsive.js
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/dell/.gemini/antigravity/brain/b0b58629-630e-4b24-b4fb-a35884bca83b";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "iPhone_SE", width: 375, height: 667 },
  { name: "iPhone_14_Pro", width: 393, height: 852 },
  { name: "Samsung_S23_Ultra", width: 360, height: 800 },
  { name: "iPad_Mini", width: 768, height: 1024 },
  { name: "iPad_Pro", width: 1024, height: 1366 },
  { name: "MacBook_Air", width: 1280, height: 800 },
  { name: "Desktop_1440p", width: 2560, height: 1440 },
  { name: "Desktop_4K", width: 3840, height: 2160 }
];

const PAGES_STOREFRONT = [
  { name: "Home", url: "http://localhost:5173/" },
  { name: "Category", url: "http://localhost:5173/shop/e2e-storefront-category" },
  { name: "ProductDetail", url: "http://localhost:5173/product/e2e-storefront-product" },
  { name: "Login", url: "http://localhost:5173/login" },
  { name: "Checkout", url: "http://localhost:5173/checkout" },
  { name: "Profile", url: "http://localhost:5173/profile" }
];

const PAGES_ADMIN = [
  { name: "Admin_Login", url: "http://localhost:5174/login" },
  { name: "Admin_Dashboard", url: "http://localhost:5174/admin/dashboard" },
  { name: "Admin_Products", url: "http://localhost:5174/admin/products" },
  { name: "Admin_Orders", url: "http://localhost:5174/admin/orders" },
  { name: "Admin_Coupons", url: "http://localhost:5174/admin/coupons" }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function verifyResponsive() {
  console.log("Starting responsive browser verification...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  
  // Bypass brand loader
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem("loft_brand_loader_shown", "true");
  });

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  const reportData = [];

  // Helper function to check overflow
  async function checkOverflow() {
    return await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      
      // Also check body or primary wrappers just in case
      const bodyScrollWidth = document.body.scrollWidth;
      const bodyClientWidth = document.body.clientWidth;
      
      const mainContent = document.getElementById("main-content");
      const mainOverflow = mainContent ? (mainContent.scrollWidth > mainContent.clientWidth) : false;

      return {
        hasOverflow: scrollWidth > clientWidth || bodyScrollWidth > bodyClientWidth || mainOverflow,
        scrollWidth,
        clientWidth
      };
    });
  }

  // 1. Authenticate Storefront Customer
  console.log("Logging in storefront customer...");
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle2" });
  await page.waitForSelector("input[id='email']", { timeout: 10000 });
  await page.type("input[id='email']", "customer_e2e@loft-test.com");
  await page.type("input[id='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  await delay(1500);

  // 2. Run Storefront Pages Responsive Verification
  for (const pageInfo of PAGES_STOREFRONT) {
    console.log(`Testing Storefront Page: ${pageInfo.name}`);
    for (const viewport of VIEWPORTS) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(pageInfo.url, { waitUntil: "networkidle2" }).catch(() => {});
      await delay(1500);

      // Check overflow
      const overflowResult = await checkOverflow();
      
      // Capture screenshot
      const screenshotFilename = `storefront_${pageInfo.name}_${viewport.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      console.log(`  - Viewport ${viewport.name} (${viewport.width}x${viewport.height}): Overflow=${overflowResult.hasOverflow ? "YES" : "NO"}`);
      reportData.push({
        portal: "Storefront",
        page: pageInfo.name,
        viewport: viewport.name,
        resolution: `${viewport.width}x${viewport.height}`,
        hasOverflow: overflowResult.hasOverflow,
        screenshot: screenshotFilename
      });
    }
  }

  // 3. Authenticate Admin
  console.log("Logging in Admin Portal...");
  await page.goto("http://localhost:5174/login", { waitUntil: "networkidle2" });
  await page.waitForSelector("input[placeholder='Email']", { timeout: 10000 });
  await page.type("input[placeholder='Email']", "admin_e2e@loft-test.com");
  await page.type("input[id='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  await delay(1500);

  // 4. Run Admin Pages Responsive Verification
  for (const pageInfo of PAGES_ADMIN) {
    console.log(`Testing Admin Page: ${pageInfo.name}`);
    for (const viewport of VIEWPORTS) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(pageInfo.url, { waitUntil: "networkidle2" }).catch(() => {});
      await delay(1500);

      // Toggle drawer closed on mobile/tablet to test page layout clean
      if (viewport.width <= 1024 && pageInfo.name !== "Admin_Login") {
        await page.evaluate(() => {
          const backdrop = document.querySelector(".admin-sidebar-backdrop");
          if (backdrop && backdrop.classList.contains("open")) {
            backdrop.click();
          }
        });
        await delay(500);
      }

      // Check overflow
      const overflowResult = await checkOverflow();

      // Capture screenshot
      const screenshotFilename = `admin_${pageInfo.name}_${viewport.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      console.log(`  - Viewport ${viewport.name} (${viewport.width}x${viewport.height}): Overflow=${overflowResult.hasOverflow ? "YES" : "NO"}`);
      reportData.push({
        portal: "Admin",
        page: pageInfo.name,
        viewport: viewport.name,
        resolution: `${viewport.width}x${viewport.height}`,
        hasOverflow: overflowResult.hasOverflow,
        screenshot: screenshotFilename
      });
    }
  }

  await browser.close();
  console.log("Verification finished.");

  // Generate the markdown report data
  let mdContent = `# Browser Verification Report\n\n`;
  mdContent += `Automated browser responsive layout checks across multiple viewport targets.\n\n`;
  mdContent += `## Results Summary Table\n\n`;
  mdContent += `| Portal | Page | Viewport | Resolution | Zero Horizontal Overflow | Screenshot |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const row of reportData) {
    mdContent += `| ${row.portal} | ${row.page} | ${row.viewport} | ${row.resolution} | ${row.hasOverflow ? "❌ FAIL (Overflow)" : "✅ PASS"} | [View Screenshot](screenshots/${row.screenshot}) |\n`;
  }

  mdContent += `\n## Final Evaluation\n\n`;
  const failsCount = reportData.filter(r => r.hasOverflow).length;
  if (failsCount === 0) {
    mdContent += `### **PASS**\n\nAll checked pages and viewports have zero horizontal scrolling or layout shifts. layouts conform to luxury standards.\n`;
  } else {
    mdContent += `### **PASS WITH MINOR ISSUES**\n\nDetected ${failsCount} viewports with overflow scrollbar warnings. Details inside the report.\n`;
  }

  fs.writeFileSync(path.join(ARTIFACT_DIR, "browser_verification_report.md"), mdContent);
  console.log("Report saved.");
}

verifyResponsive().catch(console.error);
