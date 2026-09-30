// Compartilhado entre cliente e servidor: o caminho no storage é determinístico,
// e o servidor só autoriza upload exatamente neste caminho.
export type FileKindName = "IFC_SOURCE" | "FRAGMENTS" | "THUMBNAIL" | "METADATA";

export const EXT_BY_KIND: Record<FileKindName, string> = {
  IFC_SOURCE: "ifc",
  FRAGMENTS: "frag",
  THUMBNAIL: "webp",
  METADATA: "json",
};

export const MIME_BY_KIND: Record<FileKindName, string> = {
  IFC_SOURCE: "application/x-step",
  FRAGMENTS: "application/octet-stream",
  THUMBNAIL: "image/webp",
  METADATA: "application/json",
};

export function safeName(name: string) {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
  return cleaned || "arquivo";
}

export function buildStorageKey(parts: {
  projectId: string;
  modelId: string;
  version: number;
  kind: FileKindName;
  fileName?: string;
}) {
  const ext = EXT_BY_KIND[parts.kind];
  const base =
    parts.kind === "IFC_SOURCE" && parts.fileName ? safeName(parts.fileName) : `${parts.kind.toLowerCase()}.${ext}`;
  return `projects/${parts.projectId}/models/${parts.modelId}/v${parts.version}/${base}`;
}
