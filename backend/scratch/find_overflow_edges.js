import puppeteer from "puppeteer";

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
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto(url, { waitUntil: "networkidle2" });
  
  const results = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    
    const els = [];
    const elements = document.querySelectorAll("*");
    
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // If the right boundary is past document clientWidth
      if (rect.right > docWidth + 1) {
        // Only log visible elements
        if (rect.width > 0 && rect.height > 0) {
          els.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            width: rect.width,
            left: rect.left,
            right: rect.right,
            parentClass: el.parentElement ? el.parentElement.className : "none"
          });
        }
      }
    });
    return {
      docWidth,
      scrollWidth,
      elements: els
    };
  });

  console.log(`Document clientWidth: ${results.docWidth}px`);
  console.log(`Document scrollWidth: ${results.scrollWidth}px`);
  console.log("Elements extending past the right viewport boundary:");
  if (results.elements.length === 0) {
    console.log("None found!");
  } else {
    results.elements.forEach(el => {
      console.log(`- <${el.tagName}> id="${el.id}" class="${el.className}" rect.left=${el.left.toFixed(1)}px rect.right=${el.right.toFixed(1)}px (Parent: "${el.parentClass}")`);
    });
  }

  await browser.close();
}

run().catch(console.error);
