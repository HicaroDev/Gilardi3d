// Uso: node scripts/shot.mjs <url> <saida.png> [largura] [altura] [esperaMs] [clickX,clickY]
import { chromium } from "@playwright/test";
const [url, out, w = "1440", h = "900", wait = "60000", click] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Users/Ione/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
if (process.env.EMULATE_AR) {
  // Simula o Safari do iPhone (suporte a rel="ar" do AR Quick Look).
  await page.addInitScript(() => {
    const orig = DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports = function (t) {
      return t === "ar" ? true : orig.call(this, t);
    };
  });
}
const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
try {
  await page.waitForFunction(() => ["ready", "error", "empty"].includes(document.querySelector("[data-viewer-state]")?.getAttribute("data-viewer-state") ?? ""), null, { timeout: +wait, polling: 1000 });
} catch { logs.push("[timeout] carregamento não terminou"); }
await page.waitForTimeout(2500);
if (click) {
  for (const step of click.split("|")) {
    if (step.startsWith("text:")) await page.getByText(step.slice(5), { exact: true }).first().click();
    else { const [x, y] = step.split(",").map(Number); await page.mouse.click(x, y); }
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: out });
console.log(`tempo ${(Date.now() - t0) / 1000}s`);
console.log(logs.slice(0, 25).join("\n"));
await browser.close();
