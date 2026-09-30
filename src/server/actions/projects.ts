"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertProjectRole } from "@/lib/permissions";
import { memberSchema, projectSchema, shareSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { deleteStored } from "@/lib/storage";
import { randomToken } from "@/lib/password";
import type { FormState } from "./auth";

async function defaultOrganizationId(userId: string) {
  const membership = await db.organizationMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  if (membership) return membership.organizationId;
  const org = await db.organization.create({
    data: { name: "Meu workspace", slug: `ws-${userId.slice(-10)}`, members: { create: { userId, role: "OWNER" } } },
  });
  return org.id;
}

export async function createProjectAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fields = { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), location: String(formData.get("location") ?? "") };
  const parsed = projectSchema.safeParse(fields);
  if (!parsed.success) return { fields, fieldErrors: parsed.error.flatten().fieldErrors };
  const organizationId = await defaultOrganizationId(user.id);
  const project = await db.project.create({
    data: {
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      createdById: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  await audit(user.id, "project.create", "Project", project.id, { name: project.name });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  await assertProjectRole(user.id, projectId, "EDITOR");
  const fields = { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), location: String(formData.get("location") ?? "") };
  const parsed = projectSchema.safeParse(fields);
  if (!parsed.success) return { fields, fieldErrors: parsed.error.flatten().fieldErrors };
  await db.project.update({
    where: { id: projectId },
    data: { name: parsed.data.name, description: parsed.data.description || null, location: parsed.data.location || null },
  });
  await audit(user.id, "project.update", "Project", projectId);
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Projeto atualizado." };
}

export async function setProjectArchivedAction(projectId: string, archived: boolean) {
  const user = await requireUser();
  await assertProjectRole(user.id, projectId, "OWNER");
  await db.project.update({
    where: { id: projectId },
    data: { status: archived ? "ARCHIVED" : "ACTIVE", archivedAt: archived ? new Date() : null },
  });
  await audit(user.id, archived ? "project.archive" : "project.unarchive", "Project", projectId);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string) {
  const user = await requireUser();
  await assertProjectRole(user.id, projectId, "OWNER");
  const files = await db.file.findMany({
    where: { version: { model: { projectId } } },
    select: { id: true, storageKey: true, provider: true },
  });
  await db.project.delete({ where: { id: projectId } });
  await deleteStored(files);
  await audit(user.id, "project.delete", "Project", projectId, { files: files.length });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}

export async function addMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  await assertProjectRole(user.id, projectId, "OWNER");
  const parsed = memberSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const invitee = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!invitee) return { error: "Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar primeiro." };
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: invitee.id } },
    create: { projectId, userId: invitee.id, role: parsed.data.role },
    update: { role: parsed.data.role },
  });
  await audit(user.id, "project.member_add", "Project", projectId, { userId: invitee.id, role: parsed.data.role });
  revalidatePath(`/projects/${projectId}/settings`);
  return { ok: "Membro adicionado." };
}

export async function removeMemberAction(projectId: string, memberId: string) {
  const user = await requireUser();
  await assertProjectRole(user.id, projectId, "OWNER");
  const member = await db.projectMember.findFirst({ where: { id: memberId, projectId } });
  if (!member || member.role === "OWNER") return;
  await db.projectMember.delete({ where: { id: memberId } });
  await audit(user.id, "project.member_remove", "Project", projectId, { userId: member.userId });
  revalidatePath(`/projects/${projectId}/settings`);
}

export async function createShareAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = shareSchema.safeParse({
    projectId: formData.get("projectId"),
    modelId: formData.get("modelId"),
    label: formData.get("label"),
    expiresInDays: formData.get("expiresInDays") ?? 0,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { projectId, modelId, label, expiresInDays } = parsed.data;
  await assertProjectRole(user.id, projectId, "EDITOR");
  if (modelId) {
    const model = await db.bimModel.findFirst({ where: { id: modelId, projectId }, select: { id: true } });
    if (!model) return { error: "Modelo não encontrado neste projeto." };
  }
  const share = await db.share.create({
    data: {
      token: randomToken(18),
      projectId,
      modelId: modelId || null,
      label: label || null,
      createdById: user.id,
      expiresAt: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    },
  });
  await audit(user.id, "share.create", "Share", share.id, { projectId, modelId: modelId || null });
  revalidatePath(`/projects/${projectId}/share`);
  return { ok: share.token };
}

export async function revokeShareAction(shareId: string) {
  const user = await requireUser();
  const share = await db.share.findUnique({ where: { id: shareId } });
  if (!share) return;
  await assertProjectRole(user.id, share.projectId, "EDITOR");
  await db.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
  await audit(user.id, "share.revoke", "Share", shareId);
  revalidatePath(`/projects/${share.projectId}/share`);
}
