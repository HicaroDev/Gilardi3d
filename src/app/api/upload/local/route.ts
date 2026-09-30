import { z } from "zod";
import { writeLocal } from "@/lib/storage";
import {
  errorResponse,
  expectedKey,
  HttpError,
  kindSchema,
  loadEditableVersion,
  maxBytesFor,
  registerFile,
} from "@/server/uploads";

export const runtime = "nodejs";

const querySchema = z.object({ versionId: z.string().min(1), kind: kindSchema, name: z.string().min(1).max(255) });

/** Upload para disco local — apenas desenvolvimento (sem BLOB_READ_WRITE_TOKEN). */
export async function PUT(request: Request) {
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(400, "Use o upload do Vercel Blob.");
    if (process.env.VERCEL) throw new HttpError(501, "Configure o Vercel Blob (BLOB_READ_WRITE_TOKEN) em produção.");
    const url = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(url.searchParams));
    const { user, version } = await loadEditableVersion(q.versionId);
    if (!request.body) throw new HttpError(400, "Arquivo vazio.");
    const key = expectedKey(version, q.kind, q.name);
    const size = await writeLocal(key, request.body, maxBytesFor(q.kind));
    if (size === 0) throw new HttpError(400, "Arquivo vazio.");
    const file = await registerFile({
      versionId: version.id,
      userId: user.id,
      kind: q.kind,
      name: q.name,
      storageKey: key,
      provider: "LOCAL",
      size,
    });
    return Response.json({ fileId: file.id, size });
  } catch (e) {
    return errorResponse(e);
  }
}
