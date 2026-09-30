import { z } from "zod";
import { blobInfo } from "@/lib/storage";
import { errorResponse, expectedKey, HttpError, kindSchema, loadEditableVersion, maxBytesFor, registerFile } from "@/server/uploads";

const bodySchema = z.object({ kind: kindSchema, name: z.string().min(1).max(255), pathname: z.string().min(1) });

/** Registra um arquivo já enviado ao Vercel Blob (confere no storage antes de gravar). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = bodySchema.parse(await request.json());
    const { user, version } = await loadEditableVersion(id);
    const key = expectedKey(version, body.kind, body.name);
    if (body.pathname !== key) throw new HttpError(400, "Arquivo não pertence a esta versão.");
    const info = await blobInfo(key).catch(() => null);
    if (!info) throw new HttpError(400, "Upload não encontrado no storage.");
    if (info.size > maxBytesFor(body.kind)) throw new HttpError(413, "Arquivo acima do limite.");
    const file = await registerFile({
      versionId: version.id,
      userId: user.id,
      kind: body.kind,
      name: body.name,
      storageKey: key,
      provider: "BLOB",
      size: info.size,
      url: info.url,
    });
    return Response.json({ fileId: file.id, size: info.size });
  } catch (e) {
    return errorResponse(e);
  }
}
