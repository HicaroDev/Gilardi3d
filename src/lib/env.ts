import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET precisa ter ao menos 16 caracteres"),
  APP_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(1024),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Variáveis de ambiente inválidas — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function appUrl() {
  const e = env();
  if (e.APP_URL) return e.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const storageDriver = () => (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local") as "blob" | "local";
