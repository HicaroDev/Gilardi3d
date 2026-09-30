/**
 * Chave geral da plataforma (login, projetos, upload, compartilhamento).
 * Desligada: o site público mostra apenas o modelo em destaque, sem login —
 * e não precisa de banco nem de storage para rodar.
 * Ligar: NEXT_PUBLIC_PLATFORM_ENABLED=true (+ DATABASE_URL, AUTH_SECRET, BLOB_READ_WRITE_TOKEN).
 */
export const PLATFORM_ENABLED = process.env.NEXT_PUBLIC_PLATFORM_ENABLED === "true";

/** Modelo exibido na página inicial (arquivo da pasta .ifc/, publicado em /ifc/). */
export const FEATURED_MODEL = {
  title: "Projeto 26610 — Pianicad",
  fileName: "26610_ese_pianicad_20260929_IFC.ifc",
  url: "/ifc/26610_ese_pianicad_20260929_IFC.ifc",
  size: 36384719,
};

/** Arquivos de realidade aumentada (iPhone / AR Quick Look), gerados por scripts/ifc-to-ar.mjs. */
export const FEATURED_AR = {
  maquete: "/ar/26610_ese_pianicad_20260929_IFC-maquete.usdz",
  real: "/ar/26610_ese_pianicad_20260929_IFC-real.usdz",
  maqueteScale: "1:50",
  sizeMeters: { x: 16.78, y: 21.61, z: 12.82 },
  sizeMb: 13,
};
