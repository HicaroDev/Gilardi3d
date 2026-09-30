import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireProjectRole } from "@/lib/permissions";
import { appUrl } from "@/lib/env";
import { ShareManager, type ShareRow } from "@/components/app/share-manager";

export const metadata = { title: "Compartilhar" };

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modelo?: string }>;
}) {
  const { id } = await params;
  const { modelo } = await searchParams;
  const user = await requireUser();
  await requireProjectRole(user.id, id, "EDITOR");

  const [models, shares] = await Promise.all([
    db.bimModel.findMany({ where: { projectId: id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.share.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: { model: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
  ]);

  const base = appUrl();
  const rows: ShareRow[] = await Promise.all(
    shares.map(async (s) => {
      const url = `${base}/s/${s.token}`;
      const active = !s.revokedAt && (!s.expiresAt || s.expiresAt > new Date());
      return {
        id: s.id,
        url,
        label: s.label,
        modelName: s.model?.name ?? null,
        createdBy: s.createdBy.name,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt?.toISOString() ?? null,
        revoked: !!s.revokedAt,
        active,
        views: s.views,
        qr: active
          ? await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#0b1220", light: "#ffffff" } })
          : null,
      };
    }),
  );

  return <ShareManager projectId={id} models={models} shares={rows} defaultModelId={modelo ?? ""} />;
}
