import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    let ip: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    } catch {
      ip = null;
    }
    await db.auditLog.create({ data: { userId, action, entityType, entityId: entityId ?? null, metadata, ip } });
  } catch (e) {
    // Auditoria nunca deve derrubar a operação principal.
    console.error("[audit]", e);
  }
}
