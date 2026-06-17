import puppeteer from "puppeteer";

const url = process.argv[2] ?? "http://localhost:5173/";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];

page.on("pageerror", (e) => errors.push(`PAGE: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`CONSOLE: ${m.text()}`);
});

await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
const html = await page.$eval("#root", (el) => el.innerHTML);
console.log("URL:", url);
console.log("ROOT_LEN:", html.length);
console.log("ROOT_PREVIEW:", html.slice(0, 300));
console.log("ERRORS:", JSON.stringify(errors, null, 2));

await browser.close();
