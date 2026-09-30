// Prepara os arquivos estáticos do motor BIM em public/:
//  - web-ifc WASM + worker do Fragments (sem depender de CDN em produção)
//  - modelos IFC de demonstração da pasta .ifc/ (servidos em /ifc/<arquivo>)
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");

const copies = [
  [join(nm, "web-ifc/web-ifc.wasm"), "public/wasm/web-ifc.wasm"],
  [join(nm, "web-ifc/web-ifc-mt.wasm"), "public/wasm/web-ifc-mt.wasm"],
  [join(nm, "@thatopen/fragments/dist/Worker/worker.mjs"), "public/fragments/worker.mjs"],
];

const demoDir = join(root, ".ifc");
if (existsSync(demoDir)) {
  for (const file of readdirSync(demoDir)) {
    if (file.toLowerCase().endsWith(".ifc")) copies.push([join(demoDir, file), `public/ifc/${file}`]);
  }
}

// Realidade aumentada (USDZ para AR Quick Look), gerada por scripts/ifc-to-ar.mjs.
const arDir = join(demoDir, "ar");
if (existsSync(arDir)) {
  for (const file of readdirSync(arDir)) {
    if (file.toLowerCase().endsWith(".usdz")) copies.push([join(arDir, file), `public/ar/${file}`]);
  }
}

for (const [src, to] of copies) {
  const dest = join(root, to);
  if (!existsSync(src)) {
    console.warn(`[bim-assets] não encontrado: ${src}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[bim-assets] -> ${to}`);
}
