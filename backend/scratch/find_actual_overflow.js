import puppeteer from "puppeteer";

const VIEWPORTS = [320, 375, 390, 412, 768];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem("loft_brand_loader_shown", "true");
  });

  const url = "http://localhost:5173/product/6a1d4d2ad7adf03d86739d91";
  await page.goto(url, { waitUntil: "networkidle2" });

  for (const width of VIEWPORTS) {
    console.log(`\n=================== Testing viewport width: ${width}px ===================`);
    await page.setViewport({ width, height: 800 });
    // let layout settle
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1000));

    const results = await page.evaluate((w) => {
      const els = [];
      const allElements = document.querySelectorAll("*");
      
      allElements.forEach(el => {
        // Skip elements inside similar products slider or search overlay
        if (el.closest(".pd-similar-grid") || el.closest("#search-overlay")) {
          return;
        }
        
        const rect = el.getBoundingClientRect();
        if (rect.right > w + 1 && rect.width > 0 && rect.height > 0) {
          // Find path
          let path = el.tagName;
          if (el.id) path += `#${el.id}`;
          if (el.className) path += `.${el.className.split(" ").filter(Boolean).join(".")}`;
          
          els.push({
            path,
            width: rect.width,
            left: rect.left,
            right: rect.right,
            parentClass: el.parentElement ? el.parentElement.className : "none"
          });
        }
      });
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overflowingElements: els
      };
    }, width);

    console.log(`Document scrollWidth: ${results.docScrollWidth}px`);
    console.log(`Body scrollWidth: ${results.bodyScrollWidth}px`);
    console.log("Overflowing elements (excluding similar grid & search overlay):");
    if (results.overflowingElements.length === 0) {
      console.log("  None found!");
    } else {
      results.overflowingElements.forEach(el => {
        console.log(`  - ${el.path} (width=${el.width.toFixed(1)}px, left=${el.left.toFixed(1)}px, right=${el.right.toFixed(1)}px)`);
      });
    }
  }

  await browser.close();
}

run().catch(console.error);
