"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { createModelVersionAction } from "@/server/actions/models";
import { readHeader, uploadVersionFile, type StorageDriver } from "@/features/upload/upload-file";
import { DISCIPLINES, DISCIPLINE_LABEL, detectIfcSchema, looksLikeIfc } from "@/lib/validation";
import { formatBytes } from "@/components/ui/format";
import { Alert } from "@/components/ui/form";

interface Props {
  projectId: string;
  driver: StorageDriver;
  maxMb: number;
  /** Quando informado, envia uma nova versão deste modelo. */
  model?: { id: string; name: string; discipline: string };
  onClose?: () => void;
  compact?: boolean;
}

type Phase = "idle" | "ready" | "uploading" | "done";

export function UploadPanel({ projectId, driver, maxMb, model, onClose, compact }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<string | null>(null);
  const [name, setName] = useState(model?.name ?? "");
  const [discipline, setDiscipline] = useState(model?.discipline ?? "ARCHITECTURE");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function pick(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".ifc")) {
      setError("Envie um arquivo .ifc (IFC 2x3, IFC4 ou IFC4.3).");
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setError(`O arquivo tem ${formatBytes(f.size)} e passa do limite de ${maxMb} MB.`);
      return;
    }
    const header = await readHeader(f);
    if (!looksLikeIfc(header)) {
      setError("Este arquivo não parece um IFC válido (cabeçalho ISO-10303-21 não encontrado).");
      return;
    }
    setSchema(detectIfcSchema(header));
    setFile(f);
    if (!model) setName(f.name.replace(/\.ifc$/i, "").replace(/[_]+/g, " ").trim());
    setPhase("ready");
  }

  async function submit() {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    setProgress(0);
    try {
      const created = await createModelVersionAction({
        projectId,
        modelId: model?.id,
        name: name || file.name,
        discipline: discipline as (typeof DISCIPLINES)[number],
        fileName: file.name,
        fileSize: file.size,
      });
      if (!created.ok) throw new Error(created.error);
      await uploadVersionFile({ driver, ...created }, "IFC_SOURCE", file.name, file, setProgress);
      setPhase("done");
      // Abre o viewer, que processa o IFC no navegador e salva o modelo otimizado.
      router.push(`/viewer/${created.modelId}?versao=${created.versionId}`);
    } catch (e) {
      setPhase("ready");
      setError(e instanceof Error ? e.message : "Falha no envio.");
    }
  }

  return (
    <div className={clsx("card", compact ? "p-4" : "p-5")}>
      <div className="mb-4 flex items-center gap-2">
        <UploadCloud className="size-5 text-accent" />
        <h2 className="font-semibold">{model ? `Nova versão de “${model.name}”` : "Enviar modelo IFC"}</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-md text-muted hover:bg-white/5" aria-label="Fechar">
            <X className="size-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {phase === "idle" || !file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void pick(e.dataTransfer.files[0]);
          }}
          className={clsx(
            "flex w-full flex-col items-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            drag ? "border-accent bg-accent/10" : "border-line hover:border-accent/60 hover:bg-white/[0.02]",
          )}
        >
          <FileUp className="size-8 text-accent" />
          <span className="mt-3 font-medium">Arraste o arquivo .IFC aqui ou clique para escolher</span>
          <span className="mt-1 text-[13px] text-muted">IFC 2x3, IFC4, IFC4.3 · até {maxMb} MB · exportado do Revit, ArchiCAD, SketchUp…</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg/50 p-3">
            <FileUp className="size-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-[12px] text-muted">
                {formatBytes(file.size)}
                {schema && ` · ${schema}`}
              </p>
            </div>
            {phase === "ready" && (
              <button type="button" className="btn-ghost h-8" onClick={() => { setFile(null); setPhase("idle"); }}>
                Trocar
              </button>
            )}
          </div>

          {!model && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="up-name">Nome do modelo</label>
                <input id="up-name" className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={phase !== "ready"} maxLength={160} />
              </div>
              <div>
                <label className="label" htmlFor="up-disc">Disciplina</label>
                <select id="up-disc" className="input" value={discipline} onChange={(e) => setDiscipline(e.target.value)} disabled={phase !== "ready"}>
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>
                      {DISCIPLINE_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {phase === "uploading" || phase === "done" ? (
            <div>
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {phase === "done" ? "Abrindo o visualizador…" : "Enviando para o storage…"}
                </span>
                <span className="tabular-nums text-muted">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={() => void submit()}>
                <UploadCloud className="size-4" /> Enviar e processar
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".ifc"
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
