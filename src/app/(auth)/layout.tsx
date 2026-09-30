import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(460px,40%)]">
      <aside className="relative hidden overflow-hidden border-r border-line lg:block">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, rgba(249,115,22,.22), transparent 50%), linear-gradient(rgba(34,49,77,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(34,49,77,.55) 1px, transparent 1px)",
            backgroundSize: "auto, 40px 40px, 40px 40px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/">
            <Logo />
          </Link>
          <div className="max-w-md">
            <p className="text-3xl font-bold leading-tight tracking-tight">
              Do IFC ao canteiro de obras, <span className="text-accent">no navegador.</span>
            </p>
            <p className="mt-3 text-muted">
              Projetos, versões, disciplinas e compartilhamento com o cliente por link ou QR Code.
            </p>
          </div>
          <p className="text-[12px] text-muted">IFC 2x3 · IFC4 · IFC4.3</p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
