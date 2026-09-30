import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectRole, hasRole } from "@/lib/permissions";
import { storageDriver } from "@/lib/env";
import { loadViewerModel } from "@/server/viewer-source";
import { PlatformViewer } from "./platform-viewer";

export const metadata: Metadata = { title: "Visualizador" };

export default async function ViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ versao?: string }>;
}) {
  const { modelId } = await params;
  const { versao } = await searchParams;
  const user = await requireUser();
  const data = await loadViewerModel(modelId, versao);
  if (!data) notFound();
  const role = await getProjectRole(user.id, data.model.projectId);
  if (!hasRole(role, "VIEWER")) notFound();
  const canEdit = hasRole(role, "EDITOR");

  return (
    <PlatformViewer
      title={data.model.name}
      subtitle={`${data.model.project.name}${data.version ? ` · v${data.version.version}` : ""}`}
      backHref={`/projects/${data.model.projectId}`}
      shareHref={canEdit ? `/projects/${data.model.projectId}/share?modelo=${data.model.id}` : undefined}
      source={data.source}
      target={
        canEdit && data.needsProcessing && data.version
          ? {
              driver: storageDriver(),
              projectId: data.model.projectId,
              modelId: data.model.id,
              versionId: data.version.id,
              version: data.version.version,
            }
          : null
      }
    />
  );
}
