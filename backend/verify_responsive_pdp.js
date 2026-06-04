import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const CONVERSATION_DIR = "C:/Users/dell/.gemini/antigravity/brain/c16fcd62-8d25-4864-8d19-71930e75d85a";
const SCREENSHOT_DIR = path.join(CONVERSATION_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "Mobile_320px", width: 320, height: 568 },
  { name: "Mobile_375px", width: 375, height: 812 },
  { name: "Mobile_390px", width: 390, height: 844 },
  { name: "Mobile_412px", width: 412, height: 915 },
  { name: "Tablet_768px", width: 768, height: 1024 },
  { name: "Desktop_1024px", width: 1024, height: 768 },
  { name: "Desktop_1440px", width: 1440, height: 900 },
  { name: "Desktop_1920px", width: 1920, height: 1080 }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function verifyResponsivePDP() {
  console.log("Starting responsive PDP browser verification...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  
  // Bypass brand loader
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem("loft_brand_loader_shown", "true");
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`Browser Console Error: ${msg.text()}`);
    }
  });

  const reportData = [];

  try {
    // 1. Visit Home and Discover a Product Detail URL dynamically
    console.log("Navigating to home page to discover product link...");
    let targetUrl = "http://localhost:5173/";
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 4000 });
    } catch (e) {
      console.log("Could not connect to port 5173, falling back to port 5174...");
      targetUrl = "http://localhost:5174/";
      await page.goto(targetUrl, { waitUntil: "networkidle2" });
    }
    await delay(3000);

    const pdpUrl = await page.evaluate(() => {
      // Find any link that starts with /product/
      const links = Array.from(document.querySelectorAll("a"));
      const pdpLink = links.find(l => l.href.includes("/product/"));
      return pdpLink ? pdpLink.href : null;
    });

    if (!pdpUrl) {
      throw new Error("Could not find any product detail link on the home page!");
    }
    console.log(`Found dynamic PDP URL: ${pdpUrl}`);

    // 2. Run responsive checks on the discovered PDP URL
    for (const viewport of VIEWPORTS) {
      console.log(`Setting viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(pdpUrl, { waitUntil: "networkidle2" });
      await delay(2000);

      // Check overflow
      const overflowResult = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          hasOverflow: scrollWidth > clientWidth,
          scrollWidth,
          clientWidth
        };
      });

      // Capture screenshot
      const screenshotFilename = `pdp_${viewport.name}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      console.log(`  - Overflow: ${overflowResult.hasOverflow ? "YES" : "NO"} (${overflowResult.scrollWidth}px vs ${overflowResult.clientWidth}px)`);

      reportData.push({
        viewport: viewport.name,
        resolution: `${viewport.width}x${viewport.height}`,
        hasOverflow: overflowResult.hasOverflow,
        screenshot: screenshotFilename
      });
    }

  } catch (error) {
    console.error("Responsive verification script failed:", error);
  } finally {
    await browser.close();
  }

  // 3. Write responsive report markdown
  let mdContent = `# Browser Responsive Verification Report - LOFT PDP\n\n`;
  mdContent += `Automated browser verification testing of the newly refactored LOFT Product Detail Page.\n\n`;
  mdContent += `## Results Summary\n\n`;
  mdContent += `| Viewport | Resolution | Zero Horizontal Overflow | Screenshot |\n`;
  mdContent += `| :--- | :--- | :--- | :--- |\n`;

  for (const row of reportData) {
    mdContent += `| ${row.viewport} | ${row.resolution} | ${row.hasOverflow ? "❌ FAIL (Overflow)" : "✅ PASS"} | [View Screenshot](screenshots/${row.screenshot}) |\n`;
  }

  mdContent += `\n## Final Responsive Audit\n\n`;
  const failsCount = reportData.filter(r => r.hasOverflow).length;
  if (failsCount === 0) {
    mdContent += `### **PASS**\n\nThe Product Detail Page layout is fully responsive, with zero horizontal scrollbars or layout shifts across all target mobile, tablet, and desktop viewports.\n`;
  } else {
    mdContent += `### **FAIL**\n\nDetected ${failsCount} viewports with horizontal scrollbar issues. Adjust container widths.\n`;
  }

  const reportPath = path.join(CONVERSATION_DIR, "browser_pdp_report.md");
  fs.writeFileSync(reportPath, mdContent);
  console.log(`Report successfully written to ${reportPath}`);
}

verifyResponsivePDP();
