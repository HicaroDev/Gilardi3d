"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BimViewerApp } from "@/components/viewer/bim-viewer-app";
import { FEATURED_AR, FEATURED_MODEL, PLATFORM_ENABLED } from "@/lib/features";
import { ArButton } from "@/components/viewer/ar-button";

const SAMPLES: Record<string, { url: string; name: string; title: string; size?: number }> = {
  pianicad: { url: FEATURED_MODEL.url, name: FEATURED_MODEL.fileName, title: FEATURED_MODEL.title, size: FEATURED_MODEL.size },
  haus: { url: "/ifc/AC20-FZK-Haus.ifc", name: "AC20-FZK-Haus.ifc", title: "Casa FZK (exemplo)", size: 2570803 },
};

function Inner({ featuredOnly }: { featuredOnly: boolean }) {
  const params = useSearchParams();
  const key = featuredOnly ? "pianicad" : (params.get("modelo") ?? "pianicad");
  const sample = key === "vazio" ? null : (SAMPLES[key] ?? SAMPLES.pianicad);
  // Vindo pelo QR de AR: não baixa o IFC (pesado para o celular), só oferece o AR.
  const arOnly = params.get("ar") === "1" && key === "pianicad";
  return (
    <BimViewerApp
      title={sample?.title ?? "Visualizador BIM"}
      subtitle={sample ? sample.name : "Arraste um arquivo .IFC"}
      source={sample && !arOnly ? { kind: "ifc", url: sample.url, name: sample.name, size: sample.size } : null}
      overlay={
        arOnly ? (
          <div className="absolute inset-0 grid place-items-center bg-bg p-6 text-center">
            <div className="max-w-xs">
              <p className="text-lg font-semibold">Realidade aumentada</p>
              <p className="mt-2 text-sm text-muted">Toque em “Ver em AR” no topo para colocar o prédio no ambiente.</p>
              <Link href="/" className="btn-secondary mt-5">
                Abrir o modelo 3D completo
              </Link>
            </div>
          </div>
        ) : null
      }
      allowLocalFiles={!featuredOnly}
      backHref={featuredOnly ? undefined : "/"}
      headerActions={key === "pianicad" && sample ? <ArButton assets={FEATURED_AR} /> : null}
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
