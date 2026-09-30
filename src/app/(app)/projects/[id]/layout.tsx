import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireProjectRole, hasRole } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectTabs } from "@/components/app/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const role = await requireProjectRole(user.id, id);
  const project = await db.project.findUnique({ where: { id }, select: { name: true, location: true, status: true } });
  if (!project) notFound();

  return (
    <div>
      <Link href="/projects" className="btn-ghost -ml-3 mb-3">
        <ArrowLeft className="size-4" /> Projetos
      </Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight md:text-3xl">{project.name}</h1>
          {project.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-3.5" /> {project.location}
            </p>
          )}
        </div>
        {project.status === "ARCHIVED" && <StatusBadge status="ARCHIVED" />}
      </div>
      <ProjectTabs projectId={id} canManage={hasRole(role, "EDITOR")} isOwner={hasRole(role, "OWNER")} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
