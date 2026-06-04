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
    const bodyScroll = document.body.scrollWidth;
    
    const els = [];
    const elements = document.querySelectorAll("*");
    
    elements.forEach(el => {
      const w = el.offsetWidth;
      const rect = el.getBoundingClientRect();
      const width = rect.width;
      
      // If element is wider than clientWidth by at least 1px
      if (width > docWidth + 1) {
        els.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          width: width,
          parentClass: el.parentElement ? el.parentElement.className : "none"
        });
      }
    });
    return {
      docWidth,
      scrollWidth,
      bodyScroll,
      elements: els
    };
  });

  console.log(`Document clientWidth: ${results.docWidth}px`);
  console.log(`Document scrollWidth: ${results.scrollWidth}px`);
  console.log(`Body scrollWidth: ${results.bodyScroll}px`);
  console.log("Elements wider than document clientWidth:");
  if (results.elements.length === 0) {
    console.log("None found!");
  } else {
    results.elements.forEach(el => {
      console.log(`- <${el.tagName}> id="${el.id}" class="${el.className}" width=${el.width.toFixed(1)}px (Parent: "${el.parentClass}")`);
    });
  }

  await browser.close();
}

run().catch(console.error);
