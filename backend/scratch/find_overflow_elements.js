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
  
  const overflowElements = await page.evaluate(() => {
    const els = [];
    const elements = document.querySelectorAll("*");
    const vpWidth = window.innerWidth;
    
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > vpWidth + 1) {
        els.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          width: rect.width,
          parentClass: el.parentElement ? el.parentElement.className : "none"
        });
      }
    });
    return els;
  });

  console.log("Elements causing horizontal overflow at 768px (viewport width = 768):");
  if (overflowElements.length === 0) {
    console.log("None found!");
  } else {
    overflowElements.forEach(el => {
      console.log(`- <${el.tagName}> id="${el.id}" class="${el.className}" width=${el.width.toFixed(1)}px (Parent: "${el.parentClass}")`);
    });
  }

  await browser.close();
}

run().catch(console.error);
