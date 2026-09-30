import Link from "next/link";
import { Building2, Layers } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRelative } from "@/components/ui/format";

export interface ProjectCardData {
  id: string;
  name: string;
  location: string | null;
  status: string;
  updatedAt: Date;
  modelCount: number;
  readyCount: number;
  thumbnailFileId: string | null;
}

export function ProjectCard({ p }: { p: ProjectCardData }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group card overflow-hidden transition-colors hover:border-accent/50"
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-panel-2 to-bg">
        {p.thumbnailFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${p.thumbnailFileId}`}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <Building2 className="size-10 text-line" />
          </div>
        )}
        {p.status === "ARCHIVED" && <StatusBadge status="ARCHIVED" className="absolute left-3 top-3" />}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold">{p.name}</h3>
        <p className="mt-0.5 truncate text-[13px] text-muted">{p.location || "Sem localização"}</p>
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5" />
            {p.modelCount} {p.modelCount === 1 ? "modelo" : "modelos"}
            {p.modelCount > 0 && ` · ${p.readyCount} pronto${p.readyCount === 1 ? "" : "s"}`}
          </span>
          <span>{formatRelative(p.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
