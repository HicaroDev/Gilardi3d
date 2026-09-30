import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectRole, hasRole } from "@/lib/permissions";
import { env, storageDriver } from "@/lib/env";
import { UploadPanel } from "@/components/app/upload-panel";
import { ModelList, type ModelRowData } from "@/components/app/model-list";

export default async function ProjectModelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const role = await getProjectRole(user.id, id);
  const canEdit = hasRole(role, "EDITOR");
  const project = await db.project.findUniqueOrThrow({ where: { id }, select: { status: true, description: true } });

  const models = await db.bimModel.findMany({
    where: { projectId: id },
    orderBy: [{ discipline: "asc" }, { updatedAt: "desc" }],
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { files: { select: { id: true, kind: true, size: true, name: true } }, uploadedBy: { select: { name: true } } },
      },
    },
  });

  const rows: ModelRowData[] = models.map((m) => {
    const current = m.versions.find((v) => v.id === m.currentVersionId) ?? null;
    const latest = m.versions[0] ?? null;
    const shown = current ?? latest;
    const thumb = shown?.files.find((f) => f.kind === "THUMBNAIL");
    const source = shown?.files.find((f) => f.kind === "IFC_SOURCE");
    return {
      id: m.id,
      name: m.name,
      discipline: m.discipline,
      status: m.status,
      updatedAt: m.updatedAt.toISOString(),
      thumbnailFileId: thumb?.id ?? null,
      sourceFileId: source?.id ?? null,
      sourceName: source?.name ?? null,
      sourceSize: source ? Number(source.size) : null,
      elementCount: shown?.elementCount ?? null,
      storeyCount: shown?.storeyCount ?? null,
      ifcSchema: shown?.ifcSchema ?? null,
      versions: m.versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        uploadedBy: v.uploadedBy.name,
        isCurrent: v.id === m.currentVersionId,
        error: v.errorMessage,
      })),
    };
  });

  const archived = project.status === "ARCHIVED";

  return (
    <div className="space-y-6">
      {project.description && <p className="max-w-3xl whitespace-pre-line text-sm text-muted">{project.description}</p>}
      {canEdit && !archived && <UploadPanel projectId={id} driver={storageDriver()} maxMb={env().MAX_UPLOAD_MB} />}
      <ModelList
        projectId={id}
        models={rows}
        canEdit={canEdit && !archived}
        driver={storageDriver()}
        maxMb={env().MAX_UPLOAD_MB}
      />
    </div>
  );
}
