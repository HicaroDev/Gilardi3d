"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BimViewerApp } from "@/components/viewer/bim-viewer-app";
import { FEATURED_MODEL, PLATFORM_ENABLED } from "@/lib/features";

const SAMPLES: Record<string, { url: string; name: string; title: string; size?: number }> = {
  pianicad: { url: FEATURED_MODEL.url, name: FEATURED_MODEL.fileName, title: FEATURED_MODEL.title, size: FEATURED_MODEL.size },
  haus: { url: "/ifc/AC20-FZK-Haus.ifc", name: "AC20-FZK-Haus.ifc", title: "Casa FZK (exemplo)", size: 2570803 },
};

function Inner({ featuredOnly }: { featuredOnly: boolean }) {
  const params = useSearchParams();
  const key = featuredOnly ? "pianicad" : (params.get("modelo") ?? "pianicad");
  const sample = key === "vazio" ? null : (SAMPLES[key] ?? SAMPLES.pianicad);
  return (
    <BimViewerApp
      title={sample?.title ?? "Visualizador BIM"}
      subtitle={sample ? sample.name : "Arraste um arquivo .IFC"}
      source={sample ? { kind: "ifc", url: sample.url, name: sample.name, size: sample.size } : null}
      allowLocalFiles={!featuredOnly}
      backHref={featuredOnly ? undefined : "/"}
    />
  );
}

/** Viewer público. Com a plataforma desligada, mostra somente o modelo em destaque. */
export function DemoViewer({ featuredOnly = !PLATFORM_ENABLED }: { featuredOnly?: boolean }) {
  return (
    <Suspense>
      <Inner featuredOnly={featuredOnly} />
    </Suspense>
  );
}
