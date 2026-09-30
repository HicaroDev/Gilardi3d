import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada");
  // O Postgres local do `prisma dev` (PGlite) não suporta conexões concorrentes.
  const isPrismaDev = /localhost:5121\d/.test(connectionString);
  const adapter = new PrismaPg({ connectionString, max: isPrismaDev ? 1 : Number(process.env.DB_POOL_MAX ?? 5) });
  return new PrismaClient({ adapter });
}

function client() {
  // Uma única instância por processo (evita esgotar conexões no hot reload).
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Cliente Prisma criado sob demanda: importar este módulo não exige
 * DATABASE_URL (o build e o modo sem plataforma funcionam sem banco).
 */
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
