import type { ArAssets } from "@/components/viewer/ar-button";

/**
 * Chave geral da plataforma (login, projetos, upload, compartilhamento).
 * Desligada: o site público mostra apenas os projetos públicos abaixo, sem login —
 * e não precisa de banco nem de storage para rodar.
 * Ligar: NEXT_PUBLIC_PLATFORM_ENABLED=true (+ DATABASE_URL, AUTH_SECRET, BLOB_READ_WRITE_TOKEN).
 */
export const PLATFORM_ENABLED = process.env.NEXT_PUBLIC_PLATFORM_ENABLED === "true";

export interface PublicProject {
  /** Identificador na URL: /?projeto=<slug>. */
  slug: string;
  title: string;
  /** Arquivo da pasta .ifc/, publicado em /ifc/. */
  fileName: string;
  size: number;
  /** Realidade aumentada (iPhone / AR Quick Look), gerada por scripts/ifc-to-ar.mjs. */
  ar: ArAssets;
}

/** Projetos do site público. O primeiro abre na página inicial. */
export const PUBLIC_PROJECTS: PublicProject[] = [
  {
    slug: "26610",
    title: "Projeto 26610 — Pianicad",
    fileName: "26610_ese_pianicad_20260929_IFC.ifc",
    size: 36384719,
    ar: {
      maquete: "/ar/26610_ese_pianicad_20260929_IFC-maquete.usdz",
      real: "/ar/26610_ese_pianicad_20260929_IFC-real.usdz",
      maqueteScale: "1:50",
      sizeMeters: { x: 16.78, y: 21.61, z: 12.82 },
      sizeMb: 13,
    },
  },
  {
    slug: "bel-4845",
    title: "Projeto BEL 4845",
    fileName: "BEL_4845V4.ifc",
    size: 23294072,
    ar: {
      maquete: "/ar/BEL_4845V4-maquete.usdz",
      real: "/ar/BEL_4845V4-real.usdz",
      maqueteScale: "1:100",
      sizeMeters: { x: 42.7, y: 11.93, z: 14.14 },
      sizeMb: 7.7,
    },
  },
  {
    slug: "office",
    title: "Office building",
    fileName: "Office building.ifc",
    size: 22474651,
    ar: {
      maquete: "/ar/Office%20building-maquete.usdz",
      real: "/ar/Office%20building-real.usdz",
      maqueteScale: "1:200",
      sizeMeters: { x: 93.16, y: 30, z: 93.57 },
      sizeMb: 69,
    },
  },
];

export function ifcUrl(project: PublicProject) {
  return `/ifc/${encodeURIComponent(project.fileName)}`;
}

export function findProject(slug: string | null | undefined) {
  return PUBLIC_PROJECTS.find((p) => p.slug === slug) ?? PUBLIC_PROJECTS[0];
}
