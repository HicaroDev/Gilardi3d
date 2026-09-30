"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Box, ChevronDown, Download, History, MoreHorizontal, RefreshCw, Trash2, Upload, Eye, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBytes, formatDate, formatRelative } from "@/components/ui/format";
import { DISCIPLINES, DISCIPLINE_LABEL } from "@/lib/validation";
import { deleteModelAction, renameModelAction, reprocessVersionAction } from "@/server/actions/models";
import { UploadPanel } from "./upload-panel";
import type { StorageDriver } from "@/features/upload/upload-file";

export interface ModelRowData {
  id: string;
  name: string;
  discipline: string;
  status: string;
  updatedAt: string;
  thumbnailFileId: string | null;
  sourceFileId: string | null;
  sourceName: string | null;
  sourceSize: number | null;
  elementCount: number | null;
  storeyCount: number | null;
  ifcSchema: string | null;
  versions: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    uploadedBy: string;
    isCurrent: boolean;
    error: string | null;
  }[];
}

export function ModelList({
  projectId,
  models,
  canEdit,
  driver,
  maxMb,
}: {
  projectId: string;
  models: ModelRowData[];
  canEdit: boolean;
  driver: StorageDriver;
  maxMb: number;
}) {
  if (models.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <Box className="size-10 text-line" />
        <p className="mt-3 font-semibold">Nenhum modelo neste projeto</p>
        <p className="mt-1 text-sm text-muted">
          {canEdit ? "Envie o primeiro arquivo IFC acima." : "Quando a equipe enviar modelos, eles aparecem aqui."}
        </p>
      </div>
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Modelos ({models.length})</h2>
      </div>
      <ul className="space-y-3">
        {models.map((m) => (
          <ModelRow key={m.id} projectId={projectId} m={m} canEdit={canEdit} driver={driver} maxMb={maxMb} />
        ))}
      </ul>
    </section>
  );
}

function ModelRow({
  projectId,
  m,
  canEdit,
  driver,
  maxMb,
}: {
  projectId: string;
  m: ModelRowData;
  canEdit: boolean;
  driver: StorageDriver;
  maxMb: number;
}) {
  const [menu, setMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [discipline, setDiscipline] = useState(m.discipline);
  const [pending, start] = useTransition();
  const canOpen = m.status === "READY" || (m.sourceFileId && ["QUEUED", "PROCESSING", "FAILED", "UPLOADED"].includes(m.status));

  return (
    <li className={clsx("card overflow-hidden", pending && "opacity-60")}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <Link
          href={canOpen ? `/viewer/${m.id}` : "#"}
          aria-disabled={!canOpen}
          className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-panel-2 to-bg sm:w-44"
        >
          {m.thumbnailFileId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${m.thumbnailFileId}`} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full place-items-center">
              <Box className="size-8 text-line" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  await renameModelAction(m.id, name, discipline);
                  setEditing(false);
                });
              }}
            >
              <input className="input h-9 min-w-0 flex-1" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do modelo" />
              <select className="input h-9 w-auto" value={discipline} onChange={(e) => setDiscipline(e.target.value)} aria-label="Disciplina">
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {DISCIPLINE_LABEL[d]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary h-9">Salvar</button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{m.name}</h3>
              <StatusBadge status={m.status} />
            </div>
          )}
          <p className="mt-1 text-[13px] text-muted">
            {DISCIPLINE_LABEL[m.discipline as keyof typeof DISCIPLINE_LABEL] ?? m.discipline}
            {" · "}v{m.versions[0]?.version ?? 1}
            {m.ifcSchema && ` · ${m.ifcSchema}`}
            {m.sourceSize ? ` · ${formatBytes(m.sourceSize)}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {m.elementCount != null && `${m.elementCount.toLocaleString("pt-BR")} elementos · `}
            {m.storeyCount != null && `${m.storeyCount} pavimento${m.storeyCount === 1 ? "" : "s"} · `}
            atualizado {formatRelative(m.updatedAt)}
          </p>
          {m.status === "FAILED" && m.versions[0]?.error && (
            <p className="mt-1 text-[12px] text-red-300">{m.versions[0].error}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canOpen && (
            <Link href={`/viewer/${m.id}`} className="btn-primary">
              <Eye className="size-4" /> {m.status === "READY" ? "Abrir 3D" : "Processar"}
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-white/5 hover:text-fg"
              onClick={() => setMenu((v) => !v)}
              aria-label="Mais ações"
              aria-expanded={menu}
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menu && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} aria-hidden tabIndex={-1} />
                <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-panel-2 py-1 shadow-2xl" role="menu">
                  <MenuItem icon={History} onClick={() => { setShowVersions((v) => !v); setMenu(false); }}>
                    Histórico de versões
                  </MenuItem>
                  {m.sourceFileId && (
                    <a role="menuitem" href={`/api/files/${m.sourceFileId}?download=1`} className="flex h-10 items-center gap-2.5 px-3 text-sm hover:bg-white/5">
                      <Download className="size-4 text-muted" /> Baixar IFC
                    </a>
                  )}
                  {canEdit && (
                    <>
                      <MenuItem icon={Upload} onClick={() => { setNewVersion(true); setMenu(false); }}>
                        Enviar nova versão
                      </MenuItem>
                      <MenuItem icon={Pencil} onClick={() => { setEditing(true); setMenu(false); }}>
                        Renomear / disciplina
                      </MenuItem>
                      {m.versions[0] && (
                        <MenuItem
                          icon={RefreshCw}
                          onClick={() => {
                            setMenu(false);
                            start(() => reprocessVersionAction(m.versions[0].id));
                          }}
                        >
                          Reprocessar
                        </MenuItem>
                      )}
                      <MenuItem
                        icon={Trash2}
                        danger
                        onClick={() => {
                          setMenu(false);
                          if (window.confirm(`Excluir o modelo “${m.name}” e todas as versões? Esta ação não pode ser desfeita.`)) {
                            start(() => deleteModelAction(m.id));
                          }
                        }}
                      >
                        Excluir modelo
                      </MenuItem>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {newVersion && (
        <div className="border-t border-line p-4">
          <UploadPanel
            projectId={projectId}
            driver={driver}
            maxMb={maxMb}
            model={{ id: m.id, name: m.name, discipline: m.discipline }}
            onClose={() => setNewVersion(false)}
            compact
          />
        </div>
      )}

      {showVersions && (
        <div className="border-t border-line bg-bg/40 px-4 py-3">
          <button type="button" className="mb-2 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wider text-muted" onClick={() => setShowVersions(false)}>
            Versões <ChevronDown className="size-3.5 rotate-180" />
          </button>
          <ul className="divide-y divide-line/60 text-sm">
            {m.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-semibold">v{v.version}</span>
                <StatusBadge status={v.status} />
                {v.isCurrent && <span className="text-[11px] text-accent">atual</span>}
                <span className="text-[12px] text-muted">
                  {v.uploadedBy} · {formatDate(v.createdAt)}
                </span>
                {v.status === "READY" && !v.isCurrent && (
                  <Link href={`/viewer/${m.id}?versao=${v.id}`} className="ml-auto text-[13px] text-accent hover:underline">
                    Abrir esta versão
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx("flex h-10 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-white/5", danger && "text-red-300")}
    >
      <Icon className={clsx("size-4", danger ? "text-red-300" : "text-muted")} />
      {children}
    </button>
  );
}
