// Fluxo ponta a ponta com Playwright: cadastro → projeto → upload IFC →
// processamento no navegador → modelo pronto → link público.
// Uso: node tests/e2e/flow.mjs [baseUrl] [arquivo.ifc] [pastaDePrints]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const ifc = resolve(process.argv[3] ?? ".ifc/AC20-FZK-Haus.ifc");
const out = resolve(process.argv[4] ?? "test-results/e2e");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "C:/Users/Ione/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 500 && errors.push(`HTTP ${r.status()} ${r.url()}`));

const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  console.log(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
};
const shot = (n) => page.screenshot({ path: join(out, `${n}.png`) });
const email = `teste+${Date.now()}@gilardi3d.dev`;

try {
  await step("landing", async () => {
    await page.goto(base, { timeout: 180000 });
    await shot("01-landing");
  });
  await step("rota protegida redireciona para login", async () => {
    await page.goto(`${base}/dashboard`, { timeout: 180000 });
    await page.waitForURL(/\/login/, { timeout: 60000 });
  });
  await step("cadastro", async () => {
    await page.goto(`${base}/register`, { timeout: 180000 });
    await page.fill("#f-name", "Hícaro Teste");
    await page.fill("#f-email", email);
    await page.fill("#f-password", "senha-forte-123");
    await shot("02-cadastro");
    await page.click("button[type=submit]");
    await page.waitForURL(/\/dashboard/, { timeout: 120000 });
    await shot("03-dashboard-vazio");
  });
  await step("criar projeto", async () => {
    await page.goto(`${base}/projects/new`, { timeout: 180000 });
    await page.fill("#f-name", "Residencial Teste E2E");
    await page.fill("#f-location", "Lugano, TI");
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await page.waitForURL((u) => /^\/projects\/(?!new$)[a-z0-9]+$/.test(u.pathname), { timeout: 120000 });
    await shot("04-projeto");
  });
  const projectUrl = page.url();
  await step("upload IFC", async () => {
    await page.setInputFiles("input[type=file][accept='.ifc']", ifc);
    await page.getByText("Enviar e processar").click();
    await page.waitForURL(/\/viewer\//, { timeout: 300000 });
  });
  await step("processamento no navegador + salvar otimizado", async () => {
    await page.waitForFunction(
      () => ["ready", "error"].includes(document.querySelector("[data-viewer-state]")?.getAttribute("data-viewer-state") ?? ""),
      null,
      { timeout: 600000, polling: 1000 },
    );
    await page.getByText("Modelo otimizado salvo").waitFor({ timeout: 300000 });
    await shot("05-viewer-processado");
  });
  await step("modelo PRONTO na lista", async () => {
    await page.goto(projectUrl, { timeout: 180000 });
    await page.getByText("Pronto", { exact: true }).first().waitFor({ timeout: 60000 });
    await shot("06-projeto-modelo-pronto");
  });
  await step("reabrir (Fragments, rápido)", async () => {
    await page.getByText("Abrir 3D").first().click();
    await page.waitForFunction(
      () => document.querySelector("[data-viewer-state]")?.getAttribute("data-viewer-state") === "ready",
      null,
      { timeout: 300000, polling: 500 },
    );
    await page.waitForTimeout(1500);
    await shot("07-viewer-fragments");
  });
  let shareUrl = "";
  await step("criar link público + QR", async () => {
    await page.goto(`${projectUrl}/share`, { timeout: 180000 });
    await page.getByText("Gerar link e QR Code").click();
    await page.getByText("Link criado!").waitFor({ timeout: 60000 });
    shareUrl = await page.locator("input[aria-label=Link]").first().inputValue();
    await page.getByText("QR Code", { exact: true }).first().click();
    await shot("08-compartilhar");
  });
  await step("abrir link público sem login", async () => {
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await anon.newPage();
    await p.goto(shareUrl.replace(/^https?:\/\/[^/]+/, base), { timeout: 180000 });
    await p.screenshot({ path: join(out, "09-share-celular.png") });
    await p.locator("a[href*='/m/']").first().click();
    await p.waitForFunction(
      () => document.querySelector("[data-viewer-state]")?.getAttribute("data-viewer-state") === "ready",
      null,
      { timeout: 300000, polling: 500 },
    );
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(out, "10-share-viewer-celular.png") });
    await anon.close();
  });
  console.log("\nOK — fluxo completo");
} catch (e) {
  console.error("\nFALHOU:", e.message);
  await shot("erro").catch(() => {});
  process.exitCode = 1;
} finally {
  if (errors.length) console.log("\nErros capturados:\n" + [...new Set(errors)].slice(0, 20).join("\n"));
  await browser.close();
}
