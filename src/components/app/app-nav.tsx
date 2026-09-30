"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { FolderKanban, LayoutDashboard, LogOut, Menu, Settings, UserRound, X, Box } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/demo", label: "Viewer de teste", icon: Box },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/profile", label: "Perfil", icon: UserRound },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Principal">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-accent/15 text-accent-strong" : "text-muted hover:bg-white/5 hover:text-fg",
            )}
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ name, email, logout }: { name: string; email: string; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="grid size-10 place-items-center rounded-lg text-fg hover:bg-white/5"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-panel py-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between px-5">
              <span className="text-sm font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-white/5" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <AppNav onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-line px-5 pt-4">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-[12px] text-muted">{email}</p>
              <form action={logout}>
                <button type="submit" className="btn-ghost -ml-3 mt-2">
                  <LogOut className="size-4" /> Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
