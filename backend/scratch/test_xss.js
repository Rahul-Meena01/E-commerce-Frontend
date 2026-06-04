import xssClean from "xss-clean";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const xssLib = require("xss-clean/lib/xss.js");

console.log("xssClean default:", typeof xssClean);
console.log("xssLib clean function:", typeof xssLib.clean);

const dirty = { html: "<script>alert(1)</script>hello" };
const cleanObj = xssLib.clean(dirty);
console.log("Cleaned:", cleanObj);
