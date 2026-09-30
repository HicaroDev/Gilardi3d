import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { errorResponse, expectedKey, HttpError, kindSchema, loadEditableVersion, maxBytesFor } from "@/server/uploads";

const payloadSchema = z.object({ versionId: z.string().min(1), kind: kindSchema, fileName: z.string().max(255).optional() });

const CONTENT_TYPES: Record<string, string[]> = {
  IFC_SOURCE: ["application/x-step", "application/octet-stream", "model/ifc", "text/plain", "application/ifc"],
  FRAGMENTS: ["application/octet-stream"],
  THUMBNAIL: ["image/webp", "image/png", "image/jpeg"],
  METADATA: ["application/json"],
};

/**
 * Emite o token de client upload do Vercel Blob (o arquivo vai direto do
 * navegador para o storage). Só autoriza o caminho exato esperado da versão.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Vercel Blob não configurado" }, { status: 501 });
  }
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = payloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        const { user, version } = await loadEditableVersion(payload.versionId);
        const key = expectedKey(version, payload.kind, payload.fileName);
        if (pathname !== key) throw new HttpError(400, "Caminho de upload inválido.");
        return {
          allowedContentTypes: CONTENT_TYPES[payload.kind],
          maximumSizeInBytes: maxBytesFor(payload.kind),
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ userId: user.id, versionId: version.id, kind: payload.kind }),
        };
      },
      // O registro no banco é feito pelo cliente em /api/versions/:id/files (funciona também em localhost).
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
