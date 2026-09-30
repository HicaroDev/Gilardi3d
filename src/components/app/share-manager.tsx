"use client";

import { useActionState, useState, useTransition } from "react";
import clsx from "clsx";
import { Check, Copy, Download, Link2, QrCode, Ban, ExternalLink } from "lucide-react";
import { createShareAction, revokeShareAction } from "@/server/actions/projects";
import type { FormState } from "@/server/actions/auth";
import { Alert, SubmitButton } from "@/components/ui/form";
import { formatDate } from "@/components/ui/format";

export interface ShareRow {
  id: string;
  url: string;
  label: string | null;
  modelName: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
  active: boolean;
  views: number;
  qr: string | null;
}

export function ShareManager({
  projectId,
  models,
  shares,
  defaultModelId,
}: {
  projectId: string;
  models: { id: string; name: string }[];
  shares: ShareRow[];
  defaultModelId: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createShareAction, {});
  const [openQr, setOpenQr] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <form action={action} className="card h-fit space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-accent" />
          <h2 className="font-semibold">Novo link público</h2>
        </div>
        <p className="text-[13px] text-muted">
          Quem tiver o link (ou ler o QR Code) abre o modelo em 3D no navegador ou no celular, sem precisar de conta.
        </p>
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert kind="ok">Link criado! Ele aparece na lista ao lado.</Alert>}
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <label className="label" htmlFor="sh-model">O que compartilhar</label>
          <select id="sh-model" name="modelId" className="input" defaultValue={defaultModelId}>
            <option value="">Projeto inteiro (todos os modelos)</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                Só o modelo: {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sh-label">Identificação (opcional)</label>
          <input id="sh-label" name="label" className="input" placeholder="Ex.: Cliente — apresentação" maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="sh-exp">Validade</label>
          <select id="sh-exp" name="expiresInDays" className="input" defaultValue="30">
            <option value="1">1 dia</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="0">Sem expiração</option>
          </select>
        </div>
        <SubmitButton className="w-full" pendingText="Gerando…">
          Gerar link e QR Code
        </SubmitButton>
      </form>

      <section>
        <h2 className="mb-3 font-semibold">Links ({shares.length})</h2>
        {shares.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-muted">Nenhum link criado ainda.</div>
        ) : (
          <ul className="space-y-3">
            {shares.map((s) => (
              <ShareItem key={s.id} s={s} qrOpen={openQr === s.id} onToggleQr={() => setOpenQr(openQr === s.id ? null : s.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ShareItem({ s, qrOpen, onToggleQr }: { s: ShareRow; qrOpen: boolean; onToggleQr: () => void }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className={clsx("card p-4", !s.active && "opacity-60", pending && "opacity-50")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{s.label || (s.modelName ? `Modelo: ${s.modelName}` : "Projeto inteiro")}</span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            s.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted",
          )}
        >
          {s.revoked ? "Revogado" : s.active ? "Ativo" : "Expirado"}
        </span>
        <span className="ml-auto text-[12px] text-muted">{s.views} visualizaç{s.views === 1 ? "ão" : "ões"}</span>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        {s.createdBy} · {formatDate(s.createdAt)}
        {s.expiresAt ? ` · expira ${formatDate(s.expiresAt)}` : " · sem expiração"}
      </p>
      {s.active && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={s.url} className="input h-9 min-w-0 flex-1 font-mono text-[12px]" aria-label="Link" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn-secondary h-9 px-3"
              onClick={() => {
                void navigator.clipboard?.writeText(s.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Copiar link"
            >
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={onToggleQr} aria-expanded={qrOpen}>
              <QrCode className="size-4" /> QR Code
            </button>
            <a href={s.url} target="_blank" rel="noreferrer" className="btn-ghost">
              <ExternalLink className="size-4" /> Abrir
            </a>
            <button
              type="button"
              className="btn-ghost text-red-300 hover:text-red-200"
              onClick={() => {
                if (window.confirm("Revogar este link? Quem tiver o link perde o acesso.")) start(() => revokeShareAction(s.id));
              }}
            >
              <Ban className="size-4" /> Revogar
            </button>
          </div>
          {qrOpen && s.qr && (
            <div className="mt-3 flex flex-col items-center gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.qr} alt="QR Code do link de compartilhamento" className="size-44" />
              <div className="text-center text-[13px] text-slate-700 sm:text-left">
                <p className="font-semibold text-slate-900">Aponte a câmera do celular</p>
                <p className="mt-1">Abre o modelo em 3D direto no navegador do celular.</p>
                <a href={s.qr} download="gilardi3d-qrcode.png" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-orange-600">
                  <Download className="size-4" /> Baixar PNG
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}
