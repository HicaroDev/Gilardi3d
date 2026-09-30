import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { AppNav, MobileNav } from "@/components/app/app-nav";
import { logoutAction } from "@/server/actions/auth";
import { LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-panel md:flex">
        <Link href="/dashboard" className="flex h-16 items-center px-5">
          <Logo />
        </Link>
        <AppNav />
        <div className="mt-auto border-t border-line p-3">
          <Link href="/profile" className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
            <span className="grid size-9 place-items-center rounded-full bg-accent/20 text-[13px] font-bold text-accent-strong">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-[12px] text-muted">{user.email}</span>
            </span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost mt-1 w-full justify-start">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-panel/95 px-4 backdrop-blur md:hidden">
          <MobileNav name={user.name} email={user.email} logout={logoutAction} />
          <Link href="/dashboard">
            <Logo />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
