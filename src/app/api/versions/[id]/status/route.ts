import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { errorResponse, HttpError, loadEditableVersion } from "@/server/uploads";

const bodySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PROCESSING") }),
  z.object({
    status: z.literal("READY"),
    stats: z.object({
      elements: z.number().int().nonnegative(),
      categories: z.number().int().nonnegative(),
      storeys: z.number().int().nonnegative(),
      schema: z.string().max(40).nullable(),
    }),
  }),
  z.object({ status: z.literal("FAILED"), error: z.string().max(500) }),
]);

/** Atualizações do processamento feito no navegador (web-ifc → Fragments). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = bodySchema.parse(await request.json());
    const { user, version } = await loadEditableVersion(id);
    const job = await db.processingJob.findFirst({ where: { versionId: id }, orderBy: { createdAt: "desc" } });

    if (body.status === "PROCESSING") {
      if (version.status === "READY") return Response.json({ status: "READY" });
      await db.modelVersion.update({ where: { id }, data: { status: "PROCESSING" } });
      await db.bimModel.update({ where: { id: version.modelId }, data: { status: "PROCESSING" } });
      if (job) await db.processingJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date(), stage: "browser" } });
    }

    if (body.status === "READY") {
      const frag = await db.file.findFirst({ where: { versionId: id, kind: "FRAGMENTS" }, select: { id: true } });
      if (!frag) throw new HttpError(400, "Modelo processado ainda não foi enviado.");
      await db.$transaction([
        db.modelVersion.update({
          where: { id },
          data: {
            status: "READY",
            processedAt: new Date(),
            errorMessage: null,
            elementCount: body.stats.elements,
            categoryCount: body.stats.categories,
            storeyCount: body.stats.storeys,
            ifcSchema: body.stats.schema,
          },
        }),
        db.bimModel.update({ where: { id: version.modelId }, data: { status: "READY", currentVersionId: id } }),
        ...(job
          ? [db.processingJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", progress: 100, finishedAt: new Date() } })]
          : []),
      ]);
      await audit(user.id, "model.processed", "ModelVersion", id, body.stats);
    }

    if (body.status === "FAILED") {
      await db.modelVersion.update({ where: { id }, data: { status: "FAILED", errorMessage: body.error } });
      const hasReady = await db.bimModel.findFirst({ where: { id: version.modelId, currentVersionId: { not: null } } });
      if (!hasReady) await db.bimModel.update({ where: { id: version.modelId }, data: { status: "FAILED" } });
      if (job) await db.processingJob.update({ where: { id: job.id }, data: { status: "FAILED", error: body.error, finishedAt: new Date() } });
    }

    revalidatePath(`/projects/${version.model.projectId}`);
    return Response.json({ status: body.status });
  } catch (e) {
    return errorResponse(e);
  }
}
