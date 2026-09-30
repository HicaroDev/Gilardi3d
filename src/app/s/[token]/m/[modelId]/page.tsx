import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resolveShare, shareCoversModel } from "@/lib/shares";
import { loadViewerModel } from "@/server/viewer-source";
import { SharedViewer } from "./shared-viewer";

export const metadata: Metadata = { title: "Modelo compartilhado", robots: { index: false } };

export default async function SharedModelPage({ params }: { params: Promise<{ token: string; modelId: string }> }) {
  const { token, modelId } = await params;
  const share = await resolveShare(token);
  if (!share) notFound();
  const data = await loadViewerModel(modelId, null, token);
  if (!data || !shareCoversModel(share, data.model)) notFound();
  if (share.modelId) {
    await db.share.update({ where: { id: share.id }, data: { views: { increment: 1 }, lastViewAt: new Date() } });
  }
  return (
    <SharedViewer
      title={data.model.name}
      subtitle={share.project.name}
      backHref={share.modelId ? undefined : `/s/${token}`}
      source={data.source}
    />
  );
}
