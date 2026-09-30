import clsx from "clsx";

const LABEL: Record<string, string> = {
  CREATED: "Criado",
  UPLOADING: "Enviando",
  UPLOADED: "Enviado",
  QUEUED: "Aguardando processamento",
  PROCESSING: "Processando",
  READY: "Pronto",
  FAILED: "Falhou",
  ARCHIVED: "Arquivado",
  ACTIVE: "Ativo",
};

const TONE: Record<string, string> = {
  READY: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  ACTIVE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  FAILED: "bg-red-500/15 text-red-300 ring-red-500/30",
  PROCESSING: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  QUEUED: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  UPLOADING: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  UPLOADED: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONE[status] ?? "bg-white/5 text-muted ring-line",
        className,
      )}
    >
      {(status === "PROCESSING" || status === "UPLOADING") && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {LABEL[status] ?? status}
    </span>
  );
}
