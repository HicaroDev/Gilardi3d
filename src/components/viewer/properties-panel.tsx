"use client";

import { useState } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";
import clsx from "clsx";
import type { ElementInfo } from "@/viewer/engine/types";
import { prettyCategory } from "@/viewer/engine/bim-viewer";

export function PropertiesPanel({ info, loading }: { info: ElementInfo | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    );
  }
  if (!info) {
    return (
      <div className="p-5 text-sm leading-relaxed text-muted">
        Clique em um elemento do modelo (ou na árvore) para ver as propriedades BIM.
      </div>
    );
  }
  return (
    <div className="p-3">
      <div className="mb-3 rounded-lg border border-line bg-white/[0.03] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {prettyCategory(info.category) ?? info.category}
        </p>
        <h3 className="mt-0.5 break-words text-[15px] font-semibold text-fg">{info.name}</h3>
        {info.guid && <GuidRow guid={info.guid} />}
      </div>
      <Group title="Atributos IFC" entries={info.attributes} defaultOpen />
      {info.groups.map((g, i) => (
        <Group key={`${g.name}-${i}`} title={g.name} entries={g.entries} defaultOpen={i < 2} />
      ))}
    </div>
  );
}

function GuidRow({ guid }: { guid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mt-2 flex w-full items-center gap-2 rounded-md bg-black/20 px-2 py-1.5 text-left font-mono text-[11px] text-muted hover:text-fg"
      onClick={() => {
        void navigator.clipboard?.writeText(guid);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copiar GlobalId"
    >
      <span className="truncate">GlobalId {guid}</span>
      {copied ? <Check className="ml-auto size-3.5 text-emerald-400" /> : <Copy className="ml-auto size-3.5" />}
    </button>
  );
}

function Group({
  title,
  entries,
  defaultOpen,
}: {
  title: string;
  entries: { name: string; value: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  if (!entries.length) return null;
  return (
    <section className="mb-2 overflow-hidden rounded-lg border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full items-center gap-2 bg-white/[0.03] px-3 text-left text-[12px] font-semibold text-fg"
        aria-expanded={open}
      >
        <span className="truncate">{title}</span>
        <span className="ml-auto text-[11px] font-normal text-muted">{entries.length}</span>
        <ChevronDown className={clsx("size-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="divide-y divide-line/60">
          {entries.map((e, i) => (
            <div key={`${e.name}-${i}`} className="grid grid-cols-[minmax(0,42%)_1fr] gap-2 px-3 py-1.5 text-[12px]">
              <dt className="truncate text-muted" title={e.name}>
                {e.name}
              </dt>
              <dd className="break-words text-fg">{e.value || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
