import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole, getProjectRole } from "@/lib/permissions";
import { buildStorageKey, EXT_BY_KIND, MIME_BY_KIND } from "@/lib/storage";
import { env } from "@/lib/env";
import type { FileKind } from "@/generated/prisma/client";

export const FILE_KINDS = ["IFC_SOURCE", "FRAGMENTS", "THUMBNAIL", "METADATA"] as const;
export const kindSchema = z.enum(FILE_KINDS);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError) return Response.json({ error: e.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  console.error(e);
  return Response.json({ error: "Erro interno" }, { status: 500 });
}

/** Limites por tipo de arquivo derivado. O IFC usa MAX_UPLOAD_MB. */
export function maxBytesFor(kind: FileKind) {
  if (kind === "IFC_SOURCE") return env().MAX_UPLOAD_MB * 1024 * 1024;
  if (kind === "FRAGMENTS") return env().MAX_UPLOAD_MB * 1024 * 1024;
  return 10 * 1024 * 1024;
}

/** Carrega a versão e garante que o usuário logado pode editar o projeto. */
export async function loadEditableVersion(versionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Faça login novamente.");
  const version = await db.modelVersion.findUnique({
    where: { id: versionId },
    include: { model: { select: { id: true, projectId: true, name: true } } },
  });
  if (!version) throw new HttpError(404, "Versão não encontrada.");
  const role = await getProjectRole(user.id, version.model.projectId);
  if (!hasRole(role, "EDITOR")) throw new HttpError(403, "Sem permissão para enviar arquivos neste projeto.");
  return { user, version };
}

export function expectedKey(
  version: { version: number; model: { id: string; projectId: string } },
  kind: FileKind,
  fileName?: string,
) {
  return buildStorageKey({
    projectId: version.model.projectId,
    modelId: version.model.id,
    version: version.version,
    kind,
    fileName,
  });
}

/** Registra o arquivo enviado e avança o status da versão. */
export async function registerFile(params: {
  versionId: string;
  userId: string;
  kind: FileKind;
  name: string;
  storageKey: string;
  provider: "BLOB" | "LOCAL";
  size: number;
  url?: string | null;
}) {
  const file = await db.file.upsert({
    where: { storageKey: params.storageKey },
    create: {
      versionId: params.versionId,
      kind: params.kind,
      name: params.name,
      storageKey: params.storageKey,
      provider: params.provider,
      url: params.url ?? null,
      mimeType: MIME_BY_KIND[params.kind],
      extension: EXT_BY_KIND[params.kind],
      size: BigInt(params.size),
      createdById: params.userId,
    },
    update: { size: BigInt(params.size), url: params.url ?? null, name: params.name },
  });
  if (params.kind === "IFC_SOURCE") {
    const version = await db.modelVersion.update({
      where: { id: params.versionId },
      data: { status: "QUEUED" },
      select: { modelId: true },
    });
    await db.processingJob.create({ data: { versionId: params.versionId, status: "QUEUED" } });
    await db.bimModel.update({ where: { id: version.modelId }, data: { status: "QUEUED" } });
  }
  return file;
}
