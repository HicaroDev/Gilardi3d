import "server-only";
import { db } from "@/lib/db";
import { downloadUrl } from "@/lib/storage";
import type { ViewerSource } from "@/components/viewer/bim-viewer-app";

/**
 * Decide o que o viewer deve abrir para um modelo:
 * - versão pronta → Fragments otimizados (.frag), carregamento rápido
 * - senão → IFC original, processado no navegador
 */
export async function loadViewerModel(modelId: string, versionId?: string | null, shareToken?: string) {
  const model = await db.bimModel.findUnique({
    where: { id: modelId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!model) return null;

  const version = await db.modelVersion.findFirst({
    where: versionId
      ? { id: versionId, modelId }
      : model.currentVersionId
        ? { id: model.currentVersionId }
        : { modelId },
    orderBy: { version: "desc" },
    include: { files: true },
  });
  if (!version) return { model, version: null, source: null, needsProcessing: false };

  const frag = version.files.find((f) => f.kind === "FRAGMENTS");
  const ifc = version.files.find((f) => f.kind === "IFC_SOURCE");
  let source: ViewerSource | null = null;
  let needsProcessing = false;
  if (frag && version.status === "READY") {
    source = { kind: "frag", url: await downloadUrl(frag, { shareToken }), name: ifc?.name ?? `${model.name}.frag`, size: Number(frag.size) };
  } else if (ifc) {
    source = { kind: "ifc", url: await downloadUrl(ifc, { shareToken }), name: ifc.name, size: Number(ifc.size) };
    needsProcessing = true;
  }
  return { model, version, source, needsProcessing };
}
