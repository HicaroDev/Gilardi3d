import "server-only";
import { db } from "./db";

/** Resolve um token de compartilhamento válido (não revogado nem expirado). */
export async function resolveShare(token: string | null | undefined) {
  if (!token || token.length < 10 || token.length > 64) return null;
  const share = await db.share.findUnique({
    where: { token },
    include: { project: { select: { id: true, name: true, description: true, location: true, status: true } } },
  });
  if (!share || share.revokedAt) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  return share;
}

/** O link cobre este modelo? (link de projeto cobre todos os modelos do projeto) */
export function shareCoversModel(share: { projectId: string; modelId: string | null }, model: { id: string; projectId: string }) {
  if (share.projectId !== model.projectId) return false;
  return !share.modelId || share.modelId === model.id;
}
