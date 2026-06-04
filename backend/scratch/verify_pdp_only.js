import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/dell/.gemini/antigravity/brain/dd46b8a6-9e8c-4167-b250-f1577730d0cf";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "320px", width: 320, height: 568 },
  { name: "375px", width: 375, height: 667 },
  { name: "390px", width: 390, height: 844 },
  { name: "412px", width: 412, height: 915 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1024px", width: 1024, height: 768 },
  { name: "1440px", width: 1440, height: 900 },
  { name: "1920px", width: 1920, height: 1080 }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  console.log("Launching browser for PDP responsive testing...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Bypass brand loader
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem("loft_brand_loader_shown", "true");
  });

  const url = "http://localhost:5173/product/6a1d4d2ad7adf03d86739d91";
  console.log("Navigating to product page:", url);
  
  // Go once to let page load/settle
  await page.goto(url, { waitUntil: "networkidle2" });
  await delay(2000);

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await delay(1000);

    // Scroll to the bottom to trigger lazy loading and check layout
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await delay(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(800);

    // Check overflow
    const overflowResult = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const vpWidth = window.innerWidth;
      const bodyScroll = document.body.scrollWidth;
      
      const hasOverflow = scrollWidth > vpWidth || bodyScroll > vpWidth;
      return {
        hasOverflow,
        scrollWidth,
        clientWidth: vpWidth
      };
    });

    const screenshotPath = path.join(SCREENSHOT_DIR, `pdp_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot pdp_${vp.name}.png - Overflow: ${overflowResult.hasOverflow ? "YES" : "NO"}`);
    
    results.push({
      viewport: vp.name,
      resolution: `${vp.width}x${vp.height}`,
      hasOverflow: overflowResult.hasOverflow,
      screenshot: `pdp_${vp.name}.png`
    });
  }

  await browser.close();
  console.log("Verification finished.");

  // Write md report
  let md = `## Responsive Layout Verification Report\n\n`;
  md += `Viewport testing for the reconstructed Aero Knit Running Shoes PDP.\n\n`;
  md += `| Viewport | Resolution | Zero Horizontal Overflow | Screenshot |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const r of results) {
    md += `| ${r.viewport} | ${r.resolution} | ${r.hasOverflow ? "❌ FAIL" : "✅ PASS"} | [pdp_${r.viewport}](screenshots/${r.screenshot}) |\n`;
  }
  
  fs.writeFileSync(path.join(ARTIFACT_DIR, "pdp_responsive_report.md"), md);
  console.log("Saved report as pdp_responsive_report.md");
}

run().catch(console.error);
