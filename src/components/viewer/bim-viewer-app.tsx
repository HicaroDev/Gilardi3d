"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  Camera,
  EyeOff,
  Focus,
  Ghost,
  Layers,
  ListTree,
  Maximize,
  MousePointer2,
  Ruler,
  Scissors,
  Shapes,
  SlidersHorizontal,
  Upload,
  Eye,
  Crosshair,
  Box,
  X,
  Info,
} from "lucide-react";
import type { BimViewer } from "@/viewer/engine/bim-viewer";
import { treeNodeToMap, prettyCategory } from "@/viewer/engine/bim-viewer";
import type {
  CategoryInfo,
  ElementInfo,
  LoadProgress,
  ModelIdMap,
  ModelStats,
  StoreyInfo,
  TreeNode,
} from "@/viewer/engine/types";
import { ModelTree } from "./model-tree";
import { PropertiesPanel } from "./properties-panel";
import { Logo } from "@/components/ui/logo";

export interface ViewerSource {
  kind: "ifc" | "frag";
  url: string;
  name: string;
  /** Tamanho em bytes (opcional, só para exibir progresso de download). */
  size?: number;
}

export interface ProcessedResult {
  fragments: ArrayBuffer;
  thumbnail: Blob | null;
  stats: ModelStats;
}

interface Props {
  source?: ViewerSource | null;
  title: string;
  subtitle?: string;
  backHref?: string;
  allowLocalFiles?: boolean;
  headerActions?: ReactNode;
  onProcessed?: (result: ProcessedResult) => Promise<void> | void;
  onLoadStart?: (kind: "ifc" | "frag") => void;
  onLoadError?: (message: string) => void;
  /** Conteúdo extra sobreposto ao canvas (ex.: aviso de salvamento). */
  overlay?: ReactNode;
}

type LeftTab = "tree" | "storeys" | "categories";
type Tool = "select" | "measure" | "clip";

export function BimViewerApp({
  source,
  title,
  subtitle,
  backHref,
  allowLocalFiles = false,
  headerActions,
  onProcessed,
  onLoadStart,
  onLoadError,
  overlay,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BimViewer | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [storeys, setStoreys] = useState<StoreyInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [selection, setSelection] = useState<ModelIdMap | null>(null);
  const [info, setInfo] = useState<ElementInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [activeStorey, setActiveStorey] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("tree");
  const [tool, setToolState] = useState<Tool>("select");
  const [ghost, setGhost] = useState(false);
  const [ortho, setOrtho] = useState(false);
  const [filter, setFilter] = useState("");
  // null = padrão por CSS (aberto no desktop, fechado no celular).
  const [leftOpen, setLeftOpen] = useState<boolean | null>(null);
  const [rightOpen, setRightOpen] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [modelName, setModelName] = useState<string | null>(source?.name ?? null);
  const loadedRef = useRef(false);

  const refreshData = useCallback(async () => {
    const v = viewerRef.current;
    if (!v) return;
    const [t, s, c, st] = await Promise.all([v.getSpatialTree(), v.getStoreys(), v.getCategories(), v.getStats()]);
    setTree(t);
    setStoreys(s);
    setCategories(c);
    setStats(st);
    return st;
  }, []);

  const handleSelect = useCallback(async (items: ModelIdMap | null) => {
    setSelection(items);
    const v = viewerRef.current;
    if (!v || !items) {
      setInfo(null);
      return;
    }
    const first = Object.entries(items).find(([, ids]) => ids.size > 0);
    if (!first) {
      setInfo(null);
      return;
    }
    const [modelId, ids] = first;
    setInfoLoading(true);
    setRightOpen(true);
    try {
      setInfo(await v.getElementInfo(modelId, [...ids][0]));
    } finally {
      setInfoLoading(false);
    }
  }, []);

  // Inicializa o motor 3D apenas no cliente.
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;
    (async () => {
      try {
        const { BimViewer } = await import("@/viewer/engine/bim-viewer");
        if (cancelled) return;
        const v = new BimViewer(el);
        viewerRef.current = v;
        (window as unknown as { __g3dViewer?: BimViewer }).__g3dViewer = v;
        await v.init({ onSelect: (m) => void handleSelect(m) });
        if (cancelled) {
          v.dispose();
          return;
        }
        setReady(true);
      } catch (e) {
        console.error(e);
        setError("Não foi possível iniciar o visualizador 3D. Verifique se o navegador suporta WebGL.");
      }
    })();
    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, [handleSelect]);

  const loadBuffer = useCallback(
    async (buffer: ArrayBuffer, name: string, kind: "ifc" | "frag") => {
      const v = viewerRef.current;
      if (!v) return;
      setError(null);
      setModelName(name);
      let st: ModelStats | undefined;
      try {
        onLoadStart?.(kind);
        if (kind === "ifc") {
          await v.loadIfc(buffer, name, setProgress);
        } else {
          setProgress({ stage: "fragments", percent: 90, label: "Abrindo modelo otimizado" });
          await v.loadFragments(buffer, name);
        }
        setProgress({ stage: "done", percent: 100, label: "Pronto" });
        st = await refreshData();
        setProgress(null);
        setFinished(true);
      } catch (e) {
        console.error(e);
        setProgress(null);
        setFinished(true);
        const msg = "Falha ao processar o modelo. Confirme se o arquivo é um IFC válido (IFC2x3, IFC4 ou IFC4.3).";
        setError(msg);
        onLoadError?.(e instanceof Error ? `${msg} (${e.message.slice(0, 200)})` : msg);
        return;
      }
      // O modelo já está na tela; salvar a versão otimizada é um passo à parte.
      if (kind === "ifc" && onProcessed && st) {
        try {
          const fragments = await v.exportFragments();
          await new Promise((r) => setTimeout(r, 400));
          const thumbnail = await v.thumbnail();
          if (fragments) await onProcessed({ fragments, thumbnail, stats: st });
        } catch (e) {
          console.error("[viewer] falha ao salvar modelo processado", e);
        }
      }
    },
    [onProcessed, onLoadStart, onLoadError, refreshData],
  );

  // Carrega a fonte inicial (IFC ou fragments).
  useEffect(() => {
    if (!ready || !source || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      try {
        setProgress({ stage: "download", percent: 0, label: "Baixando modelo" });
        const buffer = await download(source.url, source.size, (p) =>
          setProgress({ stage: "download", percent: p, label: "Baixando modelo" }),
        );
        await loadBuffer(buffer, source.name, source.kind);
      } catch (e) {
        console.error(e);
        setProgress(null);
        setFinished(true);
        setError("Não foi possível baixar o modelo.");
      }
    })();
  }, [ready, source, loadBuffer]);

  const openLocalFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "ifc" && ext !== "frag") {
        setError("Formato não suportado. Envie um arquivo .ifc");
        return;
      }
      const buffer = await file.arrayBuffer();
      await loadBuffer(buffer, file.name, ext === "frag" ? "frag" : "ifc");
    },
    [loadBuffer],
  );

  // ---------------------------------------------------------------- actions

  const selectedKeys = useMemo(() => {
    const s = new Set<string>();
    if (!selection) return s;
    for (const [m, ids] of Object.entries(selection)) for (const id of ids) s.add(`${m}:${id}`);
    return s;
  }, [selection]);

  const hasSelection = selectedKeys.size > 0;

  const setTool = (t: Tool) => {
    setToolState(t);
    viewerRef.current?.setTool(t);
  };

  const onTreeSelect = async (node: TreeNode) => {
    const v = viewerRef.current;
    if (!v) return;
    const map = node.localId !== null && node.children.length === 0 ? { [node.modelId]: new Set([node.localId]) } : treeNodeToMap(node);
    await v.select(map, true);
    if (node.localId !== null) {
      setSelection(map);
      setInfoLoading(true);
      setRightOpen(true);
      try {
        setInfo(await v.getElementInfo(node.modelId, node.localId));
      } finally {
        setInfoLoading(false);
      }
    }
  };

  const onTreeToggle = async (node: TreeNode) => {
    const v = viewerRef.current;
    if (!v) return;
    const map = treeNodeToMap(node);
    const next = new Set(hiddenNodes);
    if (next.has(node.key)) {
      next.delete(node.key);
      await v.show(map);
    } else {
      next.add(node.key);
      await v.hide(map);
    }
    setHiddenNodes(next);
  };

  const hideSelected = async () => {
    if (!selection) return;
    await viewerRef.current?.hide(selection);
    await viewerRef.current?.clearSelection();
  };

  const isolateSelected = async () => {
    if (!selection) return;
    await viewerRef.current?.isolate(selection);
  };

  const showAll = async () => {
    await viewerRef.current?.resetView();
    setToolState("select");
    setSelection(null);
    setInfo(null);
    setGhost(false);
    setHiddenNodes(new Set());
    setHiddenCats(new Set());
    setActiveStorey(null);
  };

  const toggleGhost = async () => {
    const v = viewerRef.current;
    if (!v) return;
    const next = !ghost;
    setGhost(next);
    await v.setGhost(next ? (selection ?? {}) : null);
  };

  const fit = async () => {
    const v = viewerRef.current;
    if (!v) return;
    if (selection && hasSelection) await v.fitTo(selection);
    else await v.fitAll();
  };

  const toggleOrtho = () => {
    const next = !ortho;
    setOrtho(next);
    viewerRef.current?.setProjection(next ? "Orthographic" : "Perspective");
  };

  const pickStorey = async (s: StoreyInfo | null) => {
    const v = viewerRef.current;
    if (!v) return;
    if (!s || activeStorey === s.key) {
      setActiveStorey(null);
      await v.showAll();
      return;
    }
    setActiveStorey(s.key);
    await v.isolate({ [s.modelId]: new Set(s.itemIds) });
  };

  const toggleCategory = async (c: CategoryInfo) => {
    const v = viewerRef.current;
    if (!v) return;
    const items = await v.getItemsOfCategory(c.category);
    const next = new Set(hiddenCats);
    if (next.has(c.category)) {
      next.delete(c.category);
      await v.show(items);
    } else {
      next.add(c.category);
      await v.hide(items);
    }
    setHiddenCats(next);
  };

  const selectCategory = async (c: CategoryInfo) => {
    const v = viewerRef.current;
    if (!v) return;
    const items = await v.getItemsOfCategory(c.category);
    await v.select(items, true);
    setSelection(items);
  };

  const screenshot = () => {
    const v = viewerRef.current;
    if (!v) return;
    const url = v.screenshot();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(modelName ?? "gilardi3d").replace(/\.[^.]+$/, "")}.png`;
    a.click();
  };

  const fullscreen = () => {
    const root = document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen?.();
  };

  const loading = progress !== null && progress.stage !== "done";
  const empty = ready && !loading && !error && tree.length === 0;

  return (
    <div
      className="fixed inset-0 flex flex-col bg-bg text-fg"
      data-viewer-state={error ? "error" : loading || !ready ? "loading" : tree.length ? "ready" : source && !finished ? "loading" : "empty"}
      onDragOver={(e) => {
        if (!allowLocalFiles) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!allowLocalFiles) return;
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) void openLocalFile(f);
      }}
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/95 px-3 backdrop-blur md:px-4">
        {backHref && (
          <Link
            href={backHref}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <Link href="/" className="hidden items-center gap-2 sm:flex" aria-label="Gilardi 3D">
          <Logo />
        </Link>
        <div className="min-w-0 flex-1 border-l border-line pl-3">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="truncate text-[11px] text-muted">{subtitle ?? modelName ?? "Visualizador BIM"}</p>
        </div>
        {stats && (
          <div className="hidden items-center gap-4 text-[11px] text-muted lg:flex">
            <Stat label="Elementos" value={stats.elements} />
            <Stat label="Categorias" value={stats.categories} />
            <Stat label="Pavimentos" value={stats.storeys} />
            {stats.schema && <Stat label="Schema" value={stats.schema} />}
          </div>
        )}
        {allowLocalFiles && (
          <label className="btn-ghost cursor-pointer">
            <Upload className="size-4" />
            <span className="hidden sm:inline">Abrir IFC</span>
            <input
              type="file"
              accept=".ifc,.frag"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void openLocalFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {headerActions}
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Painel esquerdo */}
        <aside
          className={clsx(
            "absolute inset-y-0 left-0 z-20 flex w-[min(320px,88vw)] flex-col border-r border-line bg-panel transition-transform md:static md:z-auto",
            leftOpen === true ? "translate-x-0" : leftOpen === false ? "-translate-x-full md:hidden" : "-translate-x-full md:translate-x-0",
          )}
        >
          <div className="flex items-center gap-1 border-b border-line p-2">
            <TabButton active={leftTab === "tree"} onClick={() => setLeftTab("tree")} icon={<ListTree className="size-4" />}>
              Árvore
            </TabButton>
            <TabButton active={leftTab === "storeys"} onClick={() => setLeftTab("storeys")} icon={<Layers className="size-4" />}>
              Pavimentos
            </TabButton>
            <TabButton active={leftTab === "categories"} onClick={() => setLeftTab("categories")} icon={<Shapes className="size-4" />}>
              Classes
            </TabButton>
            <button
              type="button"
              className="ml-auto grid size-8 place-items-center rounded-md text-muted hover:bg-white/5 md:hidden"
              onClick={() => setLeftOpen(false)}
              aria-label="Fechar painel"
            >
              <X className="size-4" />
            </button>
          </div>
          {leftTab === "tree" && (
            <div className="border-b border-line p-2">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar elemento…"
                className="input h-9 text-[13px]"
                aria-label="Buscar elemento na árvore"
              />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {tree.length === 0 && <p className="p-3 text-sm text-muted">Nenhum modelo carregado.</p>}
            {leftTab === "tree" && (
              <ModelTree
                nodes={tree}
                selected={selectedKeys}
                hidden={hiddenNodes}
                onSelect={(n) => void onTreeSelect(n)}
                onToggleVisibility={(n) => void onTreeToggle(n)}
                filter={filter}
              />
            )}
            {leftTab === "storeys" && (
              <ul className="space-y-1">
                {storeys.length > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => void pickStorey(null)}
                      className={clsx("list-row", activeStorey === null && "list-row-active")}
                    >
                      <Layers className="size-4" /> Todos os pavimentos
                    </button>
                  </li>
                )}
                {[...storeys].reverse().map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => void pickStorey(s)}
                      className={clsx("list-row", activeStorey === s.key && "list-row-active")}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-muted">
                        {s.elevation !== null ? `${s.elevation >= 0 ? "+" : ""}${s.elevation.toFixed(2)}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {leftTab === "categories" && (
              <ul className="space-y-1">
                {categories.map((c) => {
                  const hidden = hiddenCats.has(c.category);
                  return (
                    <li key={c.category} className={clsx("flex items-center gap-1", hidden && "opacity-45")}>
                      <button type="button" className="list-row flex-1" onClick={() => void selectCategory(c)}>
                        <span className="truncate">{prettyCategory(c.category)}</span>
                        <span className="ml-auto text-[11px] text-muted">{c.count}</span>
                      </button>
                      <button
                        type="button"
                        className="grid size-9 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
                        onClick={() => void toggleCategory(c)}
                        aria-label={hidden ? `Mostrar ${c.category}` : `Ocultar ${c.category}`}
                      >
                        {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="relative min-w-0 flex-1">
          <div ref={containerRef} className="absolute inset-0" data-testid="viewer-canvas" />

          {!leftOpen && (
            <button
              type="button"
              className={clsx("floating-btn left-3 top-3", leftOpen === null && "md:hidden")}
              onClick={() => setLeftOpen(true)}
              aria-label="Abrir árvore do modelo"
            >
              <ListTree className="size-4" />
            </button>
          )}
          {!rightOpen && (
            <button
              type="button"
              className={clsx("floating-btn right-3 top-3", rightOpen === null && "md:hidden")}
              onClick={() => setRightOpen(true)}
              aria-label="Abrir propriedades"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          )}

          {tool !== "select" && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-accent/40 bg-panel/90 px-4 py-1.5 text-[12px] text-fg shadow-lg">
              {tool === "measure"
                ? "Medição: dê dois cliques no modelo para marcar pontos · Esc cancela · Del apaga"
                : "Corte: dê dois cliques numa face para criar o plano · Del apaga"}
            </div>
          )}

          {(loading || (!ready && !error)) && (
            <div className="absolute inset-0 grid place-items-center bg-bg/70 backdrop-blur-sm">
              <div className="w-[min(360px,86vw)] rounded-2xl border border-line bg-panel p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="size-10 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  <div>
                    <p className="text-sm font-semibold">{progress?.label ?? "Iniciando motor 3D"}</p>
                    <p className="text-[12px] text-muted">{modelName ?? "Gilardi 3D"}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${progress?.percent ?? 5}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-[12px] tabular-nums text-muted">{progress?.percent ?? 0}%</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-3 top-16 mx-auto max-w-md rounded-xl border border-red-500/40 bg-red-950/80 p-4 text-sm text-red-100 shadow-xl">
              {error}
            </div>
          )}

          {empty && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="max-w-sm rounded-2xl border border-dashed border-line bg-panel/80 p-8 text-center">
                <Upload className="mx-auto mb-3 size-8 text-accent" />
                <p className="font-semibold">Arraste um arquivo .IFC aqui</p>
                <p className="mt-1 text-sm text-muted">O processamento acontece no seu navegador, com web-ifc.</p>
              </div>
            </div>
          )}

          {overlay}

          {dragging && (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-2xl border-2 border-dashed border-accent bg-accent/10 text-lg font-semibold">
              Solte o IFC para abrir
            </div>
          )}

          {/* Toolbar */}
          <nav
            className="absolute bottom-3 left-1/2 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-panel/95 p-1.5 shadow-2xl backdrop-blur"
            aria-label="Ferramentas do visualizador"
          >
            <ToolButton label="Selecionar" active={tool === "select"} onClick={() => setTool("select")}>
              <MousePointer2 className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Medir" active={tool === "measure"} onClick={() => setTool(tool === "measure" ? "select" : "measure")}>
              <Ruler className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Corte" active={tool === "clip"} onClick={() => setTool(tool === "clip" ? "select" : "clip")}>
              <Scissors className="size-[18px]" />
            </ToolButton>
            <Divider />
            <ToolButton label="Ocultar" disabled={!hasSelection} onClick={() => void hideSelected()}>
              <EyeOff className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Isolar" disabled={!hasSelection} onClick={() => void isolateSelected()}>
              <Crosshair className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Raio-X" active={ghost} onClick={() => void toggleGhost()}>
              <Ghost className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Mostrar tudo" onClick={() => void showAll()}>
              <Eye className="size-[18px]" />
            </ToolButton>
            <Divider />
            <ToolButton label="Enquadrar" onClick={() => void fit()}>
              <Focus className="size-[18px]" />
            </ToolButton>
            <ToolButton label={ortho ? "Ortográfica" : "Perspectiva"} active={ortho} onClick={toggleOrtho}>
              <Box className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Imagem" onClick={screenshot}>
              <Camera className="size-[18px]" />
            </ToolButton>
            <ToolButton label="Tela cheia" onClick={fullscreen}>
              <Maximize className="size-[18px]" />
            </ToolButton>
          </nav>
        </main>

        {/* Painel direito */}
        <aside
          className={clsx(
            "absolute inset-y-0 right-0 z-20 flex w-[min(340px,92vw)] flex-col border-l border-line bg-panel transition-transform md:static md:z-auto",
            rightOpen === true ? "translate-x-0" : rightOpen === false ? "translate-x-full md:hidden" : "translate-x-full md:translate-x-0",
          )}
        >
          <div className="flex h-12 items-center gap-2 border-b border-line px-3">
            <Info className="size-4 text-accent" />
            <h2 className="text-sm font-semibold">Propriedades</h2>
            <button
              type="button"
              className="ml-auto grid size-8 place-items-center rounded-md text-muted hover:bg-white/5"
              onClick={() => setRightOpen(false)}
              aria-label="Fechar propriedades"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PropertiesPanel info={info} loading={infoLoading} />
          </div>
        </aside>
      </div>
    </div>
  );
}

async function download(url: string, size: number | undefined, onProgress: (p: number) => void) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || size || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(Math.min(99, Math.round((received / total) * 100)));
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out.buffer;
}

function ToolButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
        active ? "bg-accent text-white" : "text-muted hover:bg-white/5 hover:text-fg",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-8 w-px shrink-0 bg-line" aria-hidden />;
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium",
        active ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right leading-tight">
      <p className="font-semibold tabular-nums text-fg">{value}</p>
      <p>{label}</p>
    </div>
  );
}

