import { z } from "zod";

export const DISCIPLINES = [
  "ARCHITECTURE",
  "STRUCTURE",
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "FIRE",
  "LANDSCAPE",
  "COORDINATION",
  "OTHER",
] as const;

export const DISCIPLINE_LABEL: Record<(typeof DISCIPLINES)[number], string> = {
  ARCHITECTURE: "Arquitetura",
  STRUCTURE: "Estrutura",
  PLUMBING: "Hidráulica",
  ELECTRICAL: "Elétrica",
  HVAC: "Climatização",
  FIRE: "Incêndio",
  LANDSCAPE: "Paisagismo",
  COORDINATION: "Coordenação",
  OTHER: "Outra",
};

const email = z.string().trim().toLowerCase().email("E-mail inválido").max(200);
const password = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres")
  .max(128, "Senha muito longa");

export const loginSchema = z.object({ email, password: z.string().min(1, "Informe a senha").max(128) });

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email,
  password,
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(10), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] });

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao projeto").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
});

export const modelCreateSchema = z.object({
  projectId: z.string().min(1),
  modelId: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome do modelo").max(160),
  discipline: z.enum(DISCIPLINES),
  fileName: z
    .string()
    .trim()
    .max(255)
    .refine((n) => n.toLowerCase().endsWith(".ifc"), "Envie um arquivo .ifc"),
  fileSize: z.number().int().positive(),
});

export const memberSchema = z.object({
  email,
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const shareSchema = z.object({
  projectId: z.string().min(1),
  modelId: z.string().optional().or(z.literal("")),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  expiresInDays: z.coerce.number().int().min(0).max(365).default(0),
});

export const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const changePasswordSchema = z
  .object({ current: z.string().min(1), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] });

/** Um IFC válido começa com o cabeçalho STEP ISO-10303-21. */
export function looksLikeIfc(headerText: string) {
  return /^\s*ISO-10303-21\s*;/.test(headerText) && /FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(headerText);
}

export function detectIfcSchema(headerText: string): string | null {
  const m = headerText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  return m ? m[1].toUpperCase() : null;
}
