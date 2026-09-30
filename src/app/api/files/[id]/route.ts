import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProjectRole, hasRole } from "@/lib/permissions";
import { resolveShare, shareCoversModel } from "@/lib/shares";
import { downloadUrl, readLocal } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Download protegido de arquivos. Aceita sessão (membro do projeto) ou
 * `?share=<token>` de um link público válido. No Blob redireciona para uma
 * URL pré-assinada de curta duração; no modo local faz streaming do disco.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const file = await db.file.findUnique({
    where: { id },
    include: { version: { select: { model: { select: { id: true, projectId: true } } } } },
  });
  const model = file?.version?.model;
  if (!file || !model) return new Response("Não encontrado", { status: 404 });

  let allowed = false;
  const shareToken = new URL(request.url).searchParams.get("share");
  if (shareToken) {
    const share = await resolveShare(shareToken);
    allowed = !!share && shareCoversModel(share, model);
  } else {
    const user = await getCurrentUser();
    allowed = !!user && hasRole(await getProjectRole(user.id, model.projectId), "VIEWER");
  }
  if (!allowed) return new Response("Não encontrado", { status: 404 });

  if (file.provider === "BLOB") {
    return Response.redirect(await downloadUrl(file), 302);
  }
  try {
    const { stream, size } = await readLocal(file.storageKey);
    const asAttachment = new URL(request.url).searchParams.has("download");
    return new Response(stream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=3600",
        ...(asAttachment ? { "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"` } : {}),
      },
    });
  } catch {
    return new Response("Arquivo indisponível", { status: 410 });
  }
}
