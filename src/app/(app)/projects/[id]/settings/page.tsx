import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireProjectRole, hasRole } from "@/lib/permissions";
import { ProjectSettings } from "@/components/app/project-settings";

export const metadata = { title: "Configurações do projeto" };

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const role = await requireProjectRole(user.id, id, "EDITOR");
  const project = await db.project.findUniqueOrThrow({
    where: { id },
    include: {
      members: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  return (
    <ProjectSettings
      project={{
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        location: project.location ?? "",
        archived: project.status === "ARCHIVED",
      }}
      members={project.members.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email, role: m.role, isMe: m.userId === user.id }))}
      isOwner={hasRole(role, "OWNER")}
    />
  );
}
