import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { FolderPlus, Archive } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/server/queries";
import { ProjectCard } from "@/components/app/project-card";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const user = await requireUser();
  const { view, q } = await searchParams;
  const archived = view === "archived";
  const all = await listProjects(user.id, { archived });
  const term = (q ?? "").trim().toLowerCase();
  const projects = term
    ? all.filter((p) => p.name.toLowerCase().includes(term) || (p.location ?? "").toLowerCase().includes(term))
    : all;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Projetos</h1>
        <Link href="/projects/new" className="btn-primary">
          <FolderPlus className="size-4" /> Novo projeto
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-panel p-1 text-sm">
          <Link
            href="/projects"
            className={clsx("rounded-md px-3 py-1.5", !archived ? "bg-white/10 text-fg" : "text-muted hover:text-fg")}
          >
            Ativos
          </Link>
          <Link
            href="/projects?view=archived"
            className={clsx("rounded-md px-3 py-1.5", archived ? "bg-white/10 text-fg" : "text-muted hover:text-fg")}
          >
            Arquivados
          </Link>
        </div>
        <form className="min-w-0 flex-1 sm:max-w-xs" role="search">
          {archived && <input type="hidden" name="view" value="archived" />}
          <input name="q" defaultValue={q} placeholder="Buscar projeto…" className="input" aria-label="Buscar projeto" />
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center px-6 py-14 text-center">
          {archived ? <Archive className="size-10 text-muted" /> : <FolderPlus className="size-10 text-accent" />}
          <p className="mt-4 font-semibold">
            {term ? "Nenhum projeto encontrado." : archived ? "Nenhum projeto arquivado." : "Nenhum projeto ainda."}
          </p>
          {!archived && !term && (
            <Link href="/projects/new" className="btn-primary mt-6">
              Criar projeto
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
