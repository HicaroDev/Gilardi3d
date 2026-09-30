"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function ProjectTabs({ projectId, canManage, isOwner }: { projectId: string; canManage: boolean; isOwner: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Modelos", show: true },
    { href: `${base}/share`, label: "Compartilhar", show: canManage },
    { href: `${base}/settings`, label: "Configurações", show: isOwner || canManage },
  ].filter((t) => t.show);
  return (
    <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções do projeto">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
              active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
