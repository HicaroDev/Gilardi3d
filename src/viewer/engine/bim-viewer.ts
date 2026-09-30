import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import type * as FRAGS from "@thatopen/fragments";
import type {
  CategoryInfo,
  ElementInfo,
  LoadProgress,
  ModelIdMap,
  ModelStats,
  PropertyEntry,
  PropertyGroup,
  StoreyInfo,
  TreeNode,
} from "./types";

type World = OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>;

export interface BimViewerOptions {
  wasmPath?: string;
  workerUrl?: string;
  background?: string;
}

export interface BimViewerEvents {
  onSelect?: (items: ModelIdMap | null) => void;
}

const SELECT_COLOR = new THREE.Color("#f97316");

/**
 * Fachada sobre o That Open Engine: isola o restante da aplicação
 * (React, estado, UI) dos detalhes de Three.js / Fragments / web-ifc.
 */
export class BimViewer {
  readonly components = new OBC.Components();
  private world!: World;
  private fragments!: OBC.FragmentsManager;
  private ifcLoader!: OBC.IfcLoader;
  private highlighter!: OBF.Highlighter;
  private hider!: OBC.Hider;
  private clipper!: OBC.Clipper;
  private length!: OBF.LengthMeasurement;
  private grid: OBC.SimpleGrid | null = null;
  private disposed = false;
  private treeCache = new Map<string, TreeNode>();
  private events: BimViewerEvents = {};
  private activeTool: "select" | "measure" | "clip" = "select";

  constructor(
    private readonly container: HTMLElement,
    private readonly options: BimViewerOptions = {},
  ) {}

  async init(events: BimViewerEvents = {}) {
    this.events = events;
    const worlds = this.components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();
    world.scene = new OBC.SimpleScene(this.components);
    world.scene.setup();
    world.scene.three.background = new THREE.Color(this.options.background ?? "#0b1220");
    world.renderer = new OBF.PostproductionRenderer(this.components, this.container);
    world.camera = new OBC.OrthoPerspectiveCamera(this.components);
    await world.camera.controls.setLookAt(30, 22, 30, 0, 0, 0);
    this.world = world;

    this.components.init();

    this.grid = this.components.get(OBC.Grids).create(world);
    this.grid.config.color = new THREE.Color("#334155");

    this.fragments = this.components.get(OBC.FragmentsManager);
    this.fragments.init(this.options.workerUrl ?? "/fragments/worker.mjs");

    world.camera.controls.addEventListener("update", () => this.fragments.core.update());
    world.onCameraChanged.add((camera) => {
      for (const [, model] of this.fragments.list) model.useCamera(camera.three);
      this.fragments.core.update(true);
    });

    this.fragments.list.onItemSet.add(({ value: model }) => {
      model.useCamera(world.camera.three);
      world.scene.three.add(model.object);
      this.fragments.core.update(true);
    });

    // Evita z-fighting entre faces coplanares (paredes/pisos).
    this.fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
      if (!("isLodMaterial" in material && material.isLodMaterial)) {
        material.polygonOffset = true;
        material.polygonOffsetUnits = 1;
        material.polygonOffsetFactor = Math.random();
      }
    });

    this.ifcLoader = this.components.get(OBC.IfcLoader);
    await this.ifcLoader.setup({
      autoSetWasm: false,
      wasm: { path: this.options.wasmPath ?? "/wasm/", absolute: true },
    });

    this.components.get(OBC.Raycasters).get(world);

    this.highlighter = this.components.get(OBF.Highlighter);
    this.highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: SELECT_COLOR,
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      },
    });
    this.highlighter.zoomToSelection = false;
    this.highlighter.events.select.onHighlight.add((map) => this.events.onSelect?.(toSetMap(map)));
    this.highlighter.events.select.onClear.add(() => this.events.onSelect?.(null));

    this.hider = this.components.get(OBC.Hider);

    this.clipper = this.components.get(OBC.Clipper);
    this.clipper.enabled = false;

    this.length = this.components.get(OBF.LengthMeasurement);
    this.length.world = world;
    this.length.enabled = false;

    this.container.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("keydown", this.onKeyDown);
  }

  // ---------------------------------------------------------------- loading

  /** Converte um IFC em Fragments dentro do navegador (web-ifc WASM). */
  async loadIfc(
    buffer: ArrayBuffer | Uint8Array,
    name: string,
    onProgress?: (p: LoadProgress) => void,
  ): Promise<FRAGS.FragmentsModel> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    onProgress?.({ stage: "parse", percent: 0, label: "Lendo IFC" });
    const model = await this.ifcLoader.load(bytes, true, uniqueId(name), {
      processData: {
        progressCallback: (progress) => {
          const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
          onProgress?.({
            stage: percent < 60 ? "geometry" : "fragments",
            percent,
            label: percent < 60 ? "Extraindo geometria" : "Otimizando modelo",
          });
        },
      },
    });
    await this.afterModelLoaded();
    onProgress?.({ stage: "done", percent: 100, label: "Pronto" });
    return model;
  }

  /** Carrega um modelo já processado (.frag) — muito mais rápido que IFC. */
  async loadFragments(buffer: ArrayBuffer | Uint8Array, name: string) {
    const model = await this.fragments.core.load(buffer, {
      modelId: uniqueId(name),
      camera: this.world.camera.three,
    });
    await this.afterModelLoaded();
    return model;
  }

  private async afterModelLoaded() {
    await this.fragments.core.update(true);
    await this.fitAll();
  }

  get models() {
    return [...this.fragments.list.values()];
  }

  async exportFragments(modelId?: string): Promise<ArrayBuffer | null> {
    const model = modelId ? this.fragments.list.get(modelId) : this.models[0];
    if (!model) return null;
    return model.getBuffer(false);
  }

  // ---------------------------------------------------------------- camera

  async fitAll() {
    const box = new THREE.Box3();
    for (const model of this.models) box.union(model.box);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    await this.world.camera.controls.fitToSphere(sphere, true);
  }

  async fitTo(items: ModelIdMap) {
    await this.world.camera.fitToItems(items);
  }

  setProjection(mode: "Perspective" | "Orthographic") {
    this.world.camera.projection.set(mode);
  }

  setNavigation(mode: "Orbit" | "FirstPerson" | "Plan") {
    this.world.camera.set(mode);
  }

  // ---------------------------------------------------------------- selection

  async select(items: ModelIdMap, zoom = false) {
    await this.highlighter.highlightByID("select", items, true, zoom);
  }

  async clearSelection() {
    await this.highlighter.clear("select");
  }

  getSelection(): ModelIdMap {
    return toSetMap(this.highlighter.selection.select ?? {});
  }

  // ---------------------------------------------------------------- visibility

  async hide(items: ModelIdMap) {
    await this.hider.set(false, items);
    await this.fragments.core.update(true);
  }

  async show(items: ModelIdMap) {
    await this.hider.set(true, items);
    await this.fragments.core.update(true);
  }

  async isolate(items: ModelIdMap) {
    await this.hider.isolate(items);
    await this.fragments.core.update(true);
  }

  async showAll() {
    await this.hider.set(true);
    await this.fragments.core.update(true);
  }

  async setGhost(items: ModelIdMap | null) {
    for (const [id, model] of this.fragments.list) {
      await model.resetOpacity(undefined);
      if (!items) continue;
      const keep = items[id] ?? new Set<number>();
      const all = await model.getItemsWithGeometry();
      const others: number[] = [];
      for (const item of all) {
        const localId = await item.getLocalId();
        if (localId !== null && !keep.has(localId)) others.push(localId);
      }
      if (others.length) await model.setOpacity(others, 0.12);
    }
    await this.fragments.core.update(true);
  }

  // ---------------------------------------------------------------- tools

  setTool(tool: "select" | "measure" | "clip") {
    this.activeTool = tool;
    this.highlighter.config.selectEnabled = tool === "select";
    this.length.enabled = tool === "measure";
    this.clipper.enabled = tool === "clip";
  }

  clearMeasurements() {
    this.length.list.clear();
  }

  clearClipping() {
    this.clipper.deleteAll();
  }

  private onDoubleClick = () => {
    if (this.activeTool === "measure") void this.length.create();
    if (this.activeTool === "clip") void this.clipper.create(this.world);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (this.activeTool === "measure") this.length.delete();
      if (this.activeTool === "clip") void this.clipper.delete(this.world);
    }
    if (e.key === "Escape") {
      if (this.activeTool === "measure") this.length.cancelCreation();
      else void this.clearSelection();
    }
  };

  // ---------------------------------------------------------------- data

  async getSpatialTree(): Promise<TreeNode[]> {
    const roots: TreeNode[] = [];
    for (const [modelId, model] of this.fragments.list) {
      const cached = this.treeCache.get(modelId);
      if (cached) {
        roots.push(cached);
        continue;
      }
      const raw = await model.getSpatialStructure();
      const ids: number[] = [];
      collectIds(raw, ids);
      const names = await this.getNames(model, ids);
      const root = buildTree(modelId, raw, names);
      this.treeCache.set(modelId, root);
      roots.push(root);
    }
    return roots;
  }

  async getStoreys(): Promise<StoreyInfo[]> {
    const storeys: StoreyInfo[] = [];
    const trees = await this.getSpatialTree();
    for (const tree of trees) {
      const model = this.fragments.list.get(tree.modelId);
      if (!model) continue;
      const found: TreeNode[] = [];
      walk(tree, (n) => {
        if (n.category === "IFCBUILDINGSTOREY" && n.localId !== null) found.push(n);
      });
      const data = found.length
        ? await model.getItemsData(
            found.map((n) => n.localId!),
            { attributesDefault: false, attributes: ["Elevation"] },
          )
        : [];
      found.forEach((node, i) => {
        const itemIds: number[] = [];
        walk(node, (n) => {
          if (n.localId !== null) itemIds.push(n.localId);
        });
        const elevation = attrValue(data[i]?.Elevation);
        storeys.push({
          key: node.key,
          modelId: tree.modelId,
          localId: node.localId!,
          name: node.name,
          elevation: typeof elevation === "number" ? elevation : null,
          itemIds,
        });
      });
    }
    return storeys.sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0));
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const counts = new Map<string, number>();
    for (const [, model] of this.fragments.list) {
      const cats = await model.getItemsWithGeometryCategories();
      for (const c of cats) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getItemsOfCategory(category: string): Promise<ModelIdMap> {
    const result: ModelIdMap = {};
    for (const [modelId, model] of this.fragments.list) {
      const found = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
      const ids = Object.values(found).flat();
      if (ids.length) result[modelId] = new Set(ids);
    }
    return result;
  }

  async getStats(): Promise<ModelStats> {
    let elements = 0;
    for (const [, model] of this.fragments.list) {
      elements += (await model.getItemsWithGeometryCategories()).length;
    }
    const [categories, storeys] = await Promise.all([this.getCategories(), this.getStoreys()]);
    let schema: string | null = null;
    const first = this.models[0];
    if (first) {
      try {
        const meta = await first.getMetadata<{ schema?: string }>();
        schema = meta?.schema ?? null;
      } catch {
        schema = null;
      }
    }
    return { elements, categories: categories.length, storeys: storeys.length, schema };
  }

  async getElementInfo(modelId: string, localId: number): Promise<ElementInfo | null> {
    const model = this.fragments.list.get(modelId);
    if (!model) return null;
    const [data] = await model.getItemsData([localId], {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        IsTypedBy: { attributes: true, relations: false },
        HasAssociations: { attributes: true, relations: false },
        DefinesOccurrence: { attributes: false, relations: false },
      },
    });
    if (!data) return null;

    const attributes: PropertyEntry[] = [];
    const groups: PropertyGroup[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) continue;
      if (key.startsWith("_")) continue;
      const v = formatValue(value?.value);
      if (v !== "") attributes.push({ name: key, value: v });
    }

    const defs = (data.IsDefinedBy as FRAGS.ItemData[] | undefined) ?? [];
    for (const def of defs) {
      const groupName = String(attrValue(def.Name) ?? attrValue(def._category) ?? "Propriedades");
      const entries: PropertyEntry[] = [];
      const props = (def.HasProperties as FRAGS.ItemData[] | undefined) ?? [];
      for (const p of props) {
        const value = attrValue(p.NominalValue) ?? attrValue(p.EnumerationValues) ?? "";
        entries.push({ name: String(attrValue(p.Name) ?? "?"), value: formatValue(value) });
      }
      const quantities = (def.Quantities as FRAGS.ItemData[] | undefined) ?? [];
      for (const q of quantities) {
        const value =
          attrValue(q.LengthValue) ??
          attrValue(q.AreaValue) ??
          attrValue(q.VolumeValue) ??
          attrValue(q.CountValue) ??
          attrValue(q.WeightValue) ??
          "";
        entries.push({ name: String(attrValue(q.Name) ?? "?"), value: formatValue(value) });
      }
      if (entries.length) groups.push({ name: groupName, entries });
    }

    const types = (data.IsTypedBy as FRAGS.ItemData[] | undefined) ?? [];
    for (const t of types) {
      const entries: PropertyEntry[] = [];
      for (const [key, value] of Object.entries(t)) {
        if (Array.isArray(value) || key.startsWith("_")) continue;
        const v = formatValue(value?.value);
        if (v) entries.push({ name: key, value: v });
      }
      if (entries.length) groups.push({ name: `Tipo: ${attrValue(t.Name) ?? ""}`, entries });
    }

    const assoc = (data.HasAssociations as FRAGS.ItemData[] | undefined) ?? [];
    const materials = assoc
      .filter((a) => String(attrValue(a._category) ?? "").includes("MATERIAL"))
      .map((a) => String(attrValue(a.Name) ?? attrValue(a._category)));
    if (materials.length) {
      groups.push({ name: "Materiais", entries: materials.map((m, i) => ({ name: `#${i + 1}`, value: m })) });
    }

    return {
      modelId,
      localId,
      category: String(attrValue(data._category) ?? ""),
      guid: (attrValue(data._guid) as string | null) ?? null,
      name: String(attrValue(data.Name) ?? attrValue(data._category) ?? `#${localId}`),
      attributes,
      groups,
    };
  }

  // ---------------------------------------------------------------- misc

  screenshot(): string {
    const renderer = this.world.renderer!.three;
    renderer.render(this.world.scene.three, this.world.camera.three);
    return renderer.domElement.toDataURL("image/png");
  }

  async thumbnail(width = 640, height = 400): Promise<Blob | null> {
    const dataUrl = this.screenshot();
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const scale = Math.max(width / img.width, height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.85));
  }

  setGridVisible(visible: boolean) {
    if (this.grid) this.grid.visible = visible;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.container.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("keydown", this.onKeyDown);
    this.treeCache.clear();
    try {
      this.components.dispose();
    } catch {
      // componentes já descartados
    }
  }

  private async getNames(model: FRAGS.FragmentsModel, ids: number[]) {
    const names = new Map<number, string>();
    if (!ids.length) return names;
    const data = await model.getItemsData(ids, {
      attributesDefault: false,
      attributes: ["Name", "LongName"],
    });
    data.forEach((d, i) => {
      const name = attrValue(d.Name) ?? attrValue(d.LongName);
      if (name) names.set(ids[i], String(name));
    });
    return names;
  }
}

// ------------------------------------------------------------------ helpers

let counter = 0;
function uniqueId(name: string) {
  counter += 1;
  return `${name.replace(/\.[^.]+$/, "")}-${counter}`;
}

function toSetMap(map: Record<string, Set<number>> | OBC.ModelIdMap): ModelIdMap {
  const out: ModelIdMap = {};
  for (const [k, v] of Object.entries(map)) out[k] = new Set(v);
  return out;
}

function attrValue(attr: unknown): string | number | boolean | null {
  if (!attr || Array.isArray(attr)) return null;
  if (typeof attr === "object" && "value" in (attr as Record<string, unknown>)) {
    const v = (attr as { value: unknown }).value;
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return v as string | number | boolean;
  }
  return null;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, "");
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

function collectIds(item: FRAGS.SpatialTreeItem, out: number[]) {
  if (item.localId !== null) out.push(item.localId);
  item.children?.forEach((c) => collectIds(c, out));
}

const SPATIAL = new Set(["IFCPROJECT", "IFCSITE", "IFCBUILDING", "IFCBUILDINGSTOREY", "IFCSPACE", "IFCFACILITY", "IFCFACILITYPART"]);

/**
 * A estrutura espacial do Fragments alterna nós de categoria (localId null)
 * e nós de item (category null). Convertemos para uma árvore mais legível:
 * itens espaciais aparecem direto; elementos ficam agrupados por classe IFC.
 */
function buildTree(modelId: string, raw: FRAGS.SpatialTreeItem, names: Map<number, string>): TreeNode {
  const convert = (node: FRAGS.SpatialTreeItem, parentCategory: string | null, path: string): TreeNode[] => {
    if (node.localId === null) {
      const category = node.category;
      const items = (node.children ?? []).flatMap((c, i) => convert(c, category, `${path}.${i}`));
      if (!category || SPATIAL.has(category)) return items;
      return [
        {
          key: `${modelId}:${path}`,
          modelId,
          localId: null,
          category,
          name: prettyCategory(category) ?? category,
          children: items,
        },
      ];
    }
    const category = node.category ?? parentCategory;
    return [
      {
        key: `${modelId}:${path}`,
        modelId,
        localId: node.localId,
        category,
        name: names.get(node.localId) ?? prettyCategory(category) ?? `#${node.localId}`,
        children: (node.children ?? []).flatMap((c, i) => convert(c, null, `${path}.${i}`)),
      },
    ];
  };
  const roots = convert(raw, null, "0");
  if (roots.length === 1) return roots[0];
  return { key: `${modelId}:root`, modelId, localId: null, category: null, name: "Modelo", children: roots };
}

export function prettyCategory(category: string | null) {
  if (!category) return null;
  return category.replace(/^IFC/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function walk(node: TreeNode, fn: (n: TreeNode) => void) {
  fn(node);
  node.children.forEach((c) => walk(c, fn));
}

export function treeNodeToMap(node: TreeNode): ModelIdMap {
  const ids = new Set<number>();
  walk(node, (n) => {
    if (n.localId !== null) ids.add(n.localId);
  });
  return { [node.modelId]: ids };
}
