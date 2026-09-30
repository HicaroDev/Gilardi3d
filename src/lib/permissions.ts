import "server-only";
import { notFound } from "next/navigation";
import { db } from "./db";
import type { ProjectRole } from "@/generated/prisma/client";

const RANK: Record<ProjectRole, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

/**
 * Papel efetivo do usuário no projeto:
 * - dono/admin da organização → OWNER
 * - membro explícito do projeto → papel do vínculo
 * - caso contrário → null (sem acesso)
 */
export async function getProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      createdById: true,
      organization: { select: { members: { where: { userId }, select: { role: true } } } },
      members: { where: { userId }, select: { role: true } },
    },
  });
  if (!project) return null;
  if (project.createdById === userId) return "OWNER";
  const orgRole = project.organization.members[0]?.role;
  if (orgRole === "OWNER" || orgRole === "ADMIN") return "OWNER";
  return project.members[0]?.role ?? null;
}

export function hasRole(role: ProjectRole | null, min: ProjectRole) {
  return !!role && RANK[role] >= RANK[min];
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Sem permissão para esta ação") {
    super(message);
  }
}

export async function assertProjectRole(userId: string, projectId: string, min: ProjectRole) {
  const role = await getProjectRole(userId, projectId);
  if (!hasRole(role, min)) throw new ForbiddenError();
  return role!;
}

/** Para páginas: 404 quando o usuário não tem acesso (não revela que o projeto existe). */
export async function requireProjectRole(userId: string, projectId: string, min: ProjectRole = "VIEWER") {
  const role = await getProjectRole(userId, projectId);
  if (!hasRole(role, min)) notFound();
  return role!;
}

/** Projetos visíveis para o usuário (de organizações que administra + onde é membro). */
export function visibleProjectsWhere(userId: string) {
  return {
    OR: [
      { createdById: userId },
      { members: { some: { userId } } },
      { organization: { members: { some: { userId, role: { in: ["OWNER", "ADMIN"] as ("OWNER" | "ADMIN")[] } } } } },
    ],
  };
}
