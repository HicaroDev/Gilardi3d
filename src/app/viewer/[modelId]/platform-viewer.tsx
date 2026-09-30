"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CheckCircle2, Loader2, Share2, AlertTriangle } from "lucide-react";
import { BimViewerApp, type ProcessedResult, type ViewerSource } from "@/components/viewer/bim-viewer-app";
import { setVersionStatus, uploadVersionFile, type UploadTarget } from "@/features/upload/upload-file";

type SaveState = { phase: "idle" } | { phase: "saving"; percent: number } | { phase: "saved" } | { phase: "error"; message: string };

export function PlatformViewer({
  title,
  subtitle,
  backHref,
  shareHref,
  source,
  target,
}: {
  title: string;
  subtitle: string;
  backHref: string;
  shareHref?: string;
  source: ViewerSource | null;
  target: UploadTarget | null;
}) {
  const [save, setSave] = useState<SaveState>({ phase: "idle" });

  const onLoadStart = useCallback(
    (kind: "ifc" | "frag") => {
      if (target && kind === "ifc") void setVersionStatus(target.versionId, { status: "PROCESSING" }).catch(() => undefined);
    },
    [target],
  );

  const onLoadError = useCallback(
    (message: string) => {
      if (target) void setVersionStatus(target.versionId, { status: "FAILED", error: message }).catch(() => undefined);
    },
    [target],
  );

  // Depois de processar o IFC no navegador, salva o modelo otimizado + miniatura.
  const onProcessed = useCallback(
    async ({ fragments, thumbnail, stats }: ProcessedResult) => {
      if (!target) return;
      setSave({ phase: "saving", percent: 0 });
      try {
        await uploadVersionFile(target, "FRAGMENTS", "model.frag", new Blob([fragments], { type: "application/octet-stream" }), (p) =>
          setSave({ phase: "saving", percent: Math.round(p * 0.9) }),
        );
        if (thumbnail) await uploadVersionFile(target, "THUMBNAIL", "thumbnail.webp", thumbnail);
        await setVersionStatus(target.versionId, { status: "READY", stats });
        setSave({ phase: "saved" });
        setTimeout(() => setSave({ phase: "idle" }), 5000);
      } catch (e) {
        setSave({ phase: "error", message: e instanceof Error ? e.message : "Falha ao salvar" });
      }
    },
    [target],
  );

  return (
    <BimViewerApp
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      source={source}
      onProcessed={target ? onProcessed : undefined}
      onLoadStart={onLoadStart}
      onLoadError={onLoadError}
      headerActions={
        shareHref ? (
          <Link href={shareHref} className="btn-ghost">
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Link>
        ) : null
      }
      overlay={
        !source ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
            Este modelo ainda não tem arquivo IFC enviado.
          </div>
        ) : save.phase !== "idle" ? (
          <div className="absolute right-3 top-16 z-10 flex max-w-xs items-center gap-2 rounded-xl border border-line bg-panel/95 px-3 py-2 text-[13px] shadow-xl md:top-3">
            {save.phase === "saving" && (
              <>
                <Loader2 className="size-4 animate-spin text-accent" /> Salvando modelo otimizado… {save.percent}%
              </>
            )}
            {save.phase === "saved" && (
              <>
                <CheckCircle2 className="size-4 text-emerald-400" /> Modelo otimizado salvo — próximas aberturas serão rápidas.
              </>
            )}
            {save.phase === "error" && (
              <>
                <AlertTriangle className="size-4 text-amber-400" /> Não foi possível salvar: {save.message}
              </>
            )}
          </div>
        ) : null
      }
    />
  );
}
