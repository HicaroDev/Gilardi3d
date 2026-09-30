import "server-only";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import type { ProjectCardData } from "@/components/app/project-card";

/** Projetos visíveis ao usuário com contagens e miniatura do modelo mais recente pronto. */
export async function listProjects(userId: string, opts: { archived?: boolean; take?: number } = {}): Promise<ProjectCardData[]> {
  const projects = await db.project.findMany({
    where: { ...visibleProjectsWhere(userId), status: opts.archived ? "ARCHIVED" : "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    take: opts.take,
    select: {
      id: true,
      name: true,
      location: true,
      status: true,
      updatedAt: true,
      models: {
        select: {
          status: true,
          updatedAt: true,
          currentVersion: { select: { files: { where: { kind: "THUMBNAIL" }, select: { id: true }, take: 1 } } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    status: p.status,
    updatedAt: p.models[0] && p.models[0].updatedAt > p.updatedAt ? p.models[0].updatedAt : p.updatedAt,
    modelCount: p.models.length,
    readyCount: p.models.filter((m) => m.status === "READY").length,
    thumbnailFileId: p.models.find((m) => m.currentVersion?.files[0])?.currentVersion?.files[0]?.id ?? null,
  }));
}
