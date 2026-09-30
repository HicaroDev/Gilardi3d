import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus, Layers, CheckCircle2, HardDrive, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { listProjects } from "@/server/queries";
import { ProjectCard } from "@/components/app/project-card";
import { formatBytes } from "@/components/ui/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const where = { project: visibleProjectsWhere(user.id) };
  const [projects, modelCount, readyCount, storage] = await Promise.all([
    listProjects(user.id, { take: 6 }),
    db.bimModel.count({ where }),
    db.bimModel.count({ where: { ...where, status: "READY" } }),
    db.file.aggregate({ _sum: { size: true }, where: { kind: "IFC_SOURCE", version: { model: where } } }),
  ]);
  const projectCount = await db.project.count({ where: { ...visibleProjectsWhere(user.id), status: "ACTIVE" } });

  const stats = [
    { label: "Projetos ativos", value: projectCount, icon: FolderPlus },
    { label: "Modelos BIM", value: modelCount, icon: Layers },
    { label: "Prontos para visualizar", value: readyCount, icon: CheckCircle2 },
    { label: "IFC armazenado", value: formatBytes(storage._sum.size), icon: HardDrive },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Olá, {user.name.split(" ")[0]} 👋</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Meus projetos</h1>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <FolderPlus className="size-4" /> Novo projeto
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <s.icon className="size-5 text-accent" />
            <p className="mt-3 text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-[12px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recentes</h2>
          {projects.length > 0 && (
            <Link href="/projects" className="flex items-center gap-1 text-sm text-accent hover:underline">
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <FolderPlus className="size-10 text-accent" />
            <h3 className="mt-4 text-lg font-semibold">Crie seu primeiro projeto</h3>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Um projeto agrupa os modelos IFC de uma obra — arquitetura, estrutura, instalações — e suas versões.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/projects/new" className="btn-primary">
                Novo projeto
              </Link>
              <Link href="/demo" className="btn-secondary">
                Ver um modelo de exemplo
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
