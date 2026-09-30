"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertProjectRole } from "@/lib/permissions";
import { DISCIPLINES, modelCreateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { deleteStored } from "@/lib/storage";
import { env } from "@/lib/env";
import { z } from "zod";

export interface CreatedVersion {
  ok: true;
  projectId: string;
  modelId: string;
  versionId: string;
  version: number;
}

/**
 * Passo 1 do upload: cria (ou reaproveita) o modelo e uma nova versão em UPLOADING.
 * O arquivo em si vai direto do navegador para o storage (ver /api/upload/*).
 */
export async function createModelVersionAction(
  input: z.input<typeof modelCreateSchema>,
): Promise<CreatedVersion | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = modelCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { projectId, modelId, name, discipline, fileSize } = parsed.data;
  await assertProjectRole(user.id, projectId, "EDITOR");

  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  if (fileSize > maxBytes) return { ok: false, error: `O arquivo passa do limite de ${env().MAX_UPLOAD_MB} MB.` };

  const project = await db.project.findUnique({ where: { id: projectId }, select: { status: true } });
  if (project?.status === "ARCHIVED") return { ok: false, error: "Projeto arquivado. Reative para enviar modelos." };

  const result = await db.$transaction(async (tx) => {
    const model = modelId
      ? await tx.bimModel.findFirstOrThrow({ where: { id: modelId, projectId } })
      : await tx.bimModel.create({ data: { projectId, name, discipline, createdById: user.id, status: "UPLOADING" } });
    const last = await tx.modelVersion.findFirst({ where: { modelId: model.id }, orderBy: { version: "desc" }, select: { version: true } });
    const version = await tx.modelVersion.create({
      data: { modelId: model.id, version: (last?.version ?? 0) + 1, status: "UPLOADING", uploadedById: user.id },
    });
    if (modelId) await tx.bimModel.update({ where: { id: model.id }, data: { status: "UPLOADING" } });
    return { model, version };
  });

  await audit(user.id, "model.version_create", "ModelVersion", result.version.id, { projectId, modelId: result.model.id });
  return { ok: true, projectId, modelId: result.model.id, versionId: result.version.id, version: result.version.version };
}

export async function renameModelAction(modelId: string, name: string, discipline: string) {
  const user = await requireUser();
  const model = await db.bimModel.findUniqueOrThrow({ where: { id: modelId } });
  await assertProjectRole(user.id, model.projectId, "EDITOR");
  const clean = z.string().trim().min(1).max(160).parse(name);
  const disc = z.enum(DISCIPLINES).parse(discipline);
  await db.bimModel.update({ where: { id: modelId }, data: { name: clean, discipline: disc } });
  revalidatePath(`/projects/${model.projectId}`);
}

export async function deleteModelAction(modelId: string) {
  const user = await requireUser();
  const model = await db.bimModel.findUniqueOrThrow({ where: { id: modelId } });
  await assertProjectRole(user.id, model.projectId, "EDITOR");
  const files = await db.file.findMany({
    where: { version: { modelId } },
    select: { id: true, storageKey: true, provider: true },
  });
  await db.bimModel.delete({ where: { id: modelId } });
  await deleteStored(files);
  await audit(user.id, "model.delete", "BimModel", modelId, { files: files.length });
  revalidatePath(`/projects/${model.projectId}`);
}

/** Marca a versão como reprocessável (ex.: após atualização do motor). */
export async function reprocessVersionAction(versionId: string) {
  const user = await requireUser();
  const version = await db.modelVersion.findUniqueOrThrow({ where: { id: versionId }, include: { model: true, files: true } });
  await assertProjectRole(user.id, version.model.projectId, "EDITOR");
  const derived = version.files.filter((f) => f.kind !== "IFC_SOURCE");
  await db.file.deleteMany({ where: { id: { in: derived.map((f) => f.id) } } });
  await deleteStored(derived);
  await db.modelVersion.update({ where: { id: versionId }, data: { status: "QUEUED", errorMessage: null, processedAt: null } });
  await db.bimModel.update({ where: { id: version.modelId }, data: { status: "QUEUED" } });
  revalidatePath(`/projects/${version.model.projectId}`);
}
