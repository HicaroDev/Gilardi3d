// Converte um IFC em USDZ para realidade aumentada no iPhone (AR Quick Look).
// Gera duas versões: maquete (escala reduzida, para a mesa) e tamanho real (1:1).
//
// Uso: node scripts/ifc-to-ar.mjs <entrada.ifc> [pastaSaida=.ifc/ar] [escalaMaquete=50]
// Saída: <nome>-maquete.usdz, <nome>-real.usdz e <nome>-ar.json (metadados)
//
// Escrevemos o USDA à mão (em vez do USDZExporter do three.js) para manter o
// arquivo leve: coordenadas com precisão de milímetro, vértices compartilhados
// e sem normais (o Quick Look calcula o sombreamento).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import * as THREE from "three";
import { zipSync, strToU8 } from "three/examples/jsm/libs/fflate.module.js";
import * as WebIFC from "web-ifc";

const [input, outDir = ".ifc/ar", scaleArg = "50"] = process.argv.slice(2);
if (!input) {
  console.error("Uso: node scripts/ifc-to-ar.mjs <entrada.ifc> [pastaSaida] [escalaMaquete]");
  process.exit(1);
}
const name = basename(input).replace(/\.ifc$/i, "");
const t0 = Date.now();

const api = new WebIFC.IfcAPI();
await api.Init();
api.SetLogLevel?.(WebIFC.LogLevel?.LOG_LEVEL_OFF ?? 6);
const modelID = api.OpenModel(new Uint8Array(readFileSync(input)), { COORDINATE_TO_ORIGIN: true });

// Agrupa por cor (um mesh por material) e solda vértices idênticos (1 mm).
const groups = new Map();
const m = new THREE.Matrix4();
const v = new THREE.Vector3();
let triangles = 0;

api.StreamAllMeshes(modelID, (mesh) => {
  const placed = mesh.geometries;
  for (let i = 0; i < placed.size(); i++) {
    const pg = placed.get(i);
    const geom = api.GetGeometry(modelID, pg.geometryExpressID);
    const verts = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
    const idx = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());
    geom.delete();
    if (!idx.length) continue;
    const c = pg.color;
    const key = [c.x, c.y, c.z, c.w].map((x) => Math.round(x * 40)).join("_");
    let g = groups.get(key);
    if (!g) {
      g = { color: c, points: [], lookup: new Map(), indices: [] };
      groups.set(key, g);
    }
    m.fromArray(pg.flatTransformation);
    const local = new Array(verts.length / 6);
    for (let k = 0, j = 0; k < verts.length; k += 6, j++) {
      v.set(verts[k], verts[k + 1], verts[k + 2]).applyMatrix4(m);
      const q = [Math.round(v.x * 1000), Math.round(v.y * 1000), Math.round(v.z * 1000)];
      const h = `${q[0]},${q[1]},${q[2]}`;
      let id = g.lookup.get(h);
      if (id === undefined) {
        id = g.points.length / 3;
        g.points.push(q[0], q[1], q[2]);
        g.lookup.set(h, id);
      }
      local[j] = id;
    }
    for (let k = 0; k < idx.length; k += 3) {
      const a = local[idx[k]], b = local[idx[k + 1]], cc = local[idx[k + 2]];
      if (a === b || b === cc || a === cc) continue; // triângulo degenerado
      g.indices.push(a, b, cc);
      triangles++;
    }
  }
});
api.CloseModel(modelID);

// Limites (em mm) para apoiar no chão e centralizar.
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const g of groups.values()) {
  for (let i = 0; i < g.points.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      if (g.points[i + a] < min[a]) min[a] = g.points[i + a];
      if (g.points[i + a] > max[a]) max[a] = g.points[i + a];
    }
  }
}
const offset = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2].map(Math.round);
const size = max.map((x, i) => (x - min[i]) / 1000);

const fmt = (mm) => {
  const s = (mm / 1000).toFixed(3);
  return s.replace(/\.?0+$/, "") || "0";
};

function buildUsda(scale) {
  const out = [];
  out.push(`#usda 1.0
(
    customLayerData = { string creator = "Gilardi 3D" }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root" (
    assetInfo = { string name = "${name}" }
    kind = "component"
)
{
    float3 xformOp:scale = (${scale}, ${scale}, ${scale})
    uniform token[] xformOpOrder = ["xformOp:scale"]

    def Scope "Materials"
    {`);
  let i = 0;
  for (const g of groups.values()) {
    const { x, y, z, w } = g.color;
    out.push(`        def Material "M${i}"
        {
            token outputs:surface.connect = </Root/Materials/M${i}/Shader.outputs:surface>
            def Shader "Shader"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})
                float inputs:opacity = ${w.toFixed(3)}
                float inputs:roughness = 0.85
                float inputs:metallic = 0
                token outputs:surface
            }
        }`);
    i++;
  }
  out.push("    }");
  i = 0;
  for (const g of groups.values()) {
    if (!g.indices.length) {
      i++;
      continue;
    }
    const pts = [];
    for (let k = 0; k < g.points.length; k += 3) {
      pts.push(`(${fmt(g.points[k] + offset[0])},${fmt(g.points[k + 1] + offset[1])},${fmt(g.points[k + 2] + offset[2])})`);
    }
    const counts = new Array(g.indices.length / 3).fill(3).join(",");
    out.push(`    def Mesh "G${i}" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        uniform bool doubleSided = 1
        int[] faceVertexCounts = [${counts}]
        int[] faceVertexIndices = [${g.indices.join(",")}]
        rel material:binding = </Root/Materials/M${i}>
        point3f[] points = [${pts.join(",")}]
        uniform token subdivisionScheme = "none"
    }`);
    i++;
  }
  out.push("}\n");
  return out.join("\n");
}

// USDZ = zip sem compressão com os dados alinhados em 64 bytes.
function packUsdz(usda) {
  const filename = "model.usda";
  const file = strToU8(usda);
  const headerSize = 30 + filename.length;
  const mod = headerSize % 64;
  const files = {};
  if (mod !== 0) {
    // campo "extra": 4 bytes de cabeçalho + preenchimento
    const pad = (64 - ((headerSize + 4) % 64)) % 64;
    files[filename] = [file, { extra: { 12345: new Uint8Array(pad) } }];
  } else {
    files[filename] = file;
  }
  return zipSync(files, { level: 0, mtime: new Date() });
}

mkdirSync(outDir, { recursive: true });
const scaleMaquete = 1 / Number(scaleArg);
const result = {};
for (const [suffix, scale] of [
  ["maquete", scaleMaquete],
  ["real", 1],
]) {
  const data = packUsdz(buildUsda(scale));
  const file = join(outDir, `${name}-${suffix}.usdz`);
  writeFileSync(file, data);
  result[suffix] = { file: basename(file), mb: +(data.byteLength / 1e6).toFixed(1) };
}

const meta = {
  source: basename(input),
  generatedAt: new Date().toISOString(),
  triangles,
  materials: groups.size,
  sizeMeters: { x: +size[0].toFixed(2), y: +size[1].toFixed(2), z: +size[2].toFixed(2) },
  maqueteScale: `1:${scaleArg}`,
  files: result,
};
writeFileSync(join(outDir, `${name}-ar.json`), JSON.stringify(meta, null, 2));
console.log(meta, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
