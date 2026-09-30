"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BimViewerApp } from "@/components/viewer/bim-viewer-app";

const SAMPLES: Record<string, { url: string; name: string; title: string; size?: number }> = {
  pianicad: {
    url: "/ifc/26610_ese_pianicad_20260929_IFC.ifc",
    name: "26610_ese_pianicad_20260929_IFC.ifc",
    title: "Projeto 26610 — Pianicad",
    size: 36384719,
  },
  haus: { url: "/ifc/AC20-FZK-Haus.ifc", name: "AC20-FZK-Haus.ifc", title: "Casa FZK (exemplo)", size: 2570803 },
};

function Inner() {
  const params = useSearchParams();
  const key = params.get("modelo") ?? "pianicad";
  const sample = key === "vazio" ? null : (SAMPLES[key] ?? SAMPLES.pianicad);
  return (
    <BimViewerApp
      title={sample?.title ?? "Visualizador BIM"}
      subtitle={sample ? `${sample.name} · processado no navegador` : "Arraste um arquivo .IFC"}
      source={sample ? { kind: "ifc", url: sample.url, name: sample.name, size: sample.size } : null}
      allowLocalFiles
      backHref="/"
    />
  );
}

export function DemoViewer() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
