import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Box, Eye, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { resolveShare } from "@/lib/shares";
import { Logo } from "@/components/ui/logo";
import { DISCIPLINE_LABEL } from "@/lib/validation";

export const metadata: Metadata = { title: "Projeto compartilhado", robots: { index: false } };

export default async function SharedProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolveShare(token);
  if (!share) notFound();
  if (share.modelId) redirect(`/s/${token}/m/${share.modelId}`);

  await db.share.update({ where: { id: share.id }, data: { views: { increment: 1 }, lastViewAt: new Date() } });
  const models = await db.bimModel.findMany({
    where: { projectId: share.projectId, currentVersionId: { not: null } },
    orderBy: [{ discipline: "asc" }, { name: "asc" }],
    include: { currentVersion: { include: { files: { where: { kind: "THUMBNAIL" }, select: { id: true } } } } },
  });

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-5xl items-center px-4">
        <Logo />
        <span className="ml-auto rounded-full border border-line px-3 py-1 text-[12px] text-muted">Compartilhado com você</span>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{share.project.name}</h1>
        {share.project.location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-3.5" /> {share.project.location}
          </p>
        )}
        {share.project.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-muted">{share.project.description}</p>}

        {models.length === 0 ? (
          <div className="card mt-8 px-6 py-12 text-center text-sm text-muted">Nenhum modelo disponível ainda.</div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => {
              const thumb = m.currentVersion?.files[0]?.id;
              return (
                <li key={m.id}>
                  <Link href={`/s/${token}/m/${m.id}`} className="card group block overflow-hidden hover:border-accent/50">
                    <div className="aspect-[16/10] bg-gradient-to-br from-panel-2 to-bg">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/files/${thumb}?share=${token}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="grid h-full place-items-center">
                          <Box className="size-8 text-line" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{m.name}</p>
                        <p className="text-[12px] text-muted">{DISCIPLINE_LABEL[m.discipline]}</p>
                      </div>
                      <span className="btn-primary h-9 px-3">
                        <Eye className="size-4" /> 3D
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
