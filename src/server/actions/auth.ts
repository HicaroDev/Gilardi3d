"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/lib/password";
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface FormState {
  error?: string;
  ok?: string;
  fields?: Record<string, string>;
  fieldErrors?: Record<string, string[] | undefined>;
}

function fieldsOf(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

function safeCallback(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const fields = fieldsOf(formData, ["email"]);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fields, fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallback(formData.get("callbackUrl")),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return {
        fields,
        error:
          code === "rate_limited"
            ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
            : "E-mail ou senha incorretos.",
      };
    }
    throw e;
  }
  return {};
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const fields = fieldsOf(formData, ["name", "email"]);
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fields, fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, password } = parsed.data;

  if (!rateLimit(`register:${email}`, 5, 60 * 60_000).ok) {
    return { fields, error: "Muitas tentativas de cadastro. Tente mais tarde." };
  }
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { fields, fieldErrors: { email: ["Já existe uma conta com este e-mail"] } };

  const passwordHash = await hashPassword(password);
  const slugBase = email.split("@")[0].replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "workspace";
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name, email, passwordHash } });
    await tx.organization.create({
      data: {
        name: `Workspace de ${name.split(" ")[0]}`,
        slug: `${slugBase}-${u.id.slice(-6)}`,
        members: { create: { userId: u.id, role: "OWNER" } },
      },
    });
    return u;
  });
  await audit(user.id, "user.register", "User", user.id);

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email } = parsed.data;
  const generic = { ok: "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha." };
  if (!rateLimit(`forgot:${email}`, 3, 60 * 60_000).ok) return generic;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return generic;

  const token = randomToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  const link = `${appUrl()}/reset-password/${token}`;
  await sendMail({
    to: email,
    subject: "Redefinir sua senha — Gilardi 3D",
    text: `Olá, ${user.name}!\n\nPara criar uma nova senha, acesse: ${link}\n\nO link vale por 1 hora. Se não foi você, ignore este e-mail.`,
    html: `<p>Olá, ${escapeHtml(user.name)}!</p><p>Para criar uma nova senha, clique no link abaixo (válido por 1 hora):</p><p><a href="${link}">Redefinir senha</a></p><p>Se não foi você, ignore este e-mail.</p>`,
  });
  await audit(user.id, "user.password_reset_requested", "User", user.id);
  return generic;
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado. Solicite um novo." };
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(record.userId, "user.password_reset", "User", record.userId);
  redirect("/login?reset=1");
}

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { ok: "Perfil atualizado." };
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(parsed.data.current, full.passwordHash))) {
    return { fieldErrors: { current: ["Senha atual incorreta"] } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await audit(user.id, "user.password_changed", "User", user.id);
  return { ok: "Senha alterada." };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
