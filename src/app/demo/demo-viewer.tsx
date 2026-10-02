"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BimViewerApp } from "@/components/viewer/bim-viewer-app";
import { PLATFORM_ENABLED, PUBLIC_PROJECTS, findProject, ifcUrl } from "@/lib/features";
import { ArButton } from "@/components/viewer/ar-button";

const HAUS = { url: "/ifc/AC20-FZK-Haus.ifc", name: "AC20-FZK-Haus.ifc", title: "Casa FZK (exemplo)", size: 2570803 };

function ProjectSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Projeto"
      data-testid="project-select"
      className="h-9 max-w-[8rem] sm:max-w-[14rem] rounded-lg border border-line bg-panel px-2 text-sm"
      value={value}
      onChange={(e) => router.push(`?projeto=${e.target.value}`)}
    >
      {PUBLIC_PROJECTS.map((p) => (
        <option key={p.slug} value={p.slug}>
          {p.title}
        </option>
      ))}
    </select>
  );
}

function Inner({ featuredOnly }: { featuredOnly: boolean }) {
  const params = useSearchParams();
  const modelo = featuredOnly ? null : params.get("modelo");
  const project = modelo === "haus" || modelo === "vazio" ? null : findProject(params.get("projeto"));
  const sample = project
    ? { url: ifcUrl(project), name: project.fileName, title: project.title, size: project.size }
    : modelo === "haus"
      ? HAUS
      : null;
  // Vindo pelo QR de AR: não baixa o IFC (pesado para o celular), só oferece o AR.
  const arOnly = params.get("ar") === "1" && !!project;
  return (
    <BimViewerApp
      // Trocar de projeto remonta o viewer (ele carrega a fonte uma única vez).
      key={sample?.url ?? "vazio"}
      title={sample?.title ?? "Visualizador BIM"}
      subtitle={sample ? sample.name : "Arraste um arquivo .IFC"}
      source={sample && !arOnly ? { kind: "ifc", url: sample.url, name: sample.name, size: sample.size } : null}
      overlay={
        arOnly ? (
          <div className="absolute inset-0 grid place-items-center bg-bg p-6 text-center">
            <div className="max-w-xs">
              <p className="text-lg font-semibold">Realidade aumentada</p>
              <p className="mt-2 text-sm text-muted">Toque em “Ver em AR” no topo para colocar o prédio no ambiente.</p>
              <Link href={`?projeto=${project?.slug}`} className="btn-secondary mt-5">
                Abrir o modelo 3D completo
              </Link>
            </div>
          </div>
        ) : null
      }
      allowLocalFiles={!featuredOnly}
      backHref={featuredOnly ? undefined : "/"}
      headerActions={
        project ? (
          <>
            <ProjectSelect value={project.slug} />
            <ArButton key={project.slug} assets={project.ar} />
          </>
        ) : null
      }
    />
  );
}

/** Viewer público. Com a plataforma desligada, mostra somente os projetos públicos. */
export function DemoViewer({ featuredOnly = !PLATFORM_ENABLED }: { featuredOnly?: boolean }) {
  return (
    <Suspense>
      <Inner featuredOnly={featuredOnly} />
    </Suspense>
  );
}
