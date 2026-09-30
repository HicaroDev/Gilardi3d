import { chromium } from "@playwright/test";
const browser = await chromium.launch({ executablePath: "C:/Users/Ione/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(process.argv[2], { timeout: 180000 });
await page.waitForFunction(() => document.querySelector("[data-viewer-state]")?.getAttribute("data-viewer-state") === "ready", null, { timeout: 400000, polling: 1000 });
const out = await page.evaluate(async () => {
  const v = window.__g3dViewer;
  const m = v.models[0];
  const raw = await m.getSpatialStructure();
  const pr = (n, d = 0) => d > 5 ? "" : "  ".repeat(d) + `${n.category} ${n.localId} (${n.children?.length ?? 0})\n` + (n.children ?? []).slice(0, 4).map((c) => pr(c, d + 1)).join("");
  const c = document.querySelector("[data-testid=viewer-canvas]"); const logo = [...c.querySelectorAll("*")].filter(e=>e.tagName!=="CANVAS").slice(0,4).map(e=>e.outerHTML.slice(0,400)); const all=[...document.body.children].map(e=>e.tagName+"."+e.className+" "+e.outerHTML.slice(0,200));logo.push(...all);
  return pr(raw) + "\nLOGO:\n" + logo.join("\n");
});
console.log(out);
await browser.close();
