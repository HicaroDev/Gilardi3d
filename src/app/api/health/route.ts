import { PLATFORM_ENABLED } from "@/lib/features";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  if (!PLATFORM_ENABLED) {
    return Response.json({ status: "ok", platform: "desligada", ms: Date.now() - started });
  }
  const [{ db }, { storageDriver }] = await Promise.all([import("@/lib/db"), import("@/lib/env")]);
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    database = "erro";
  }
  return Response.json(
    { status: database === "ok" ? "ok" : "degradado", platform: "ligada", database, storage: storageDriver(), ms: Date.now() - started },
    { status: database === "ok" ? 200 : 503 },
  );
}
