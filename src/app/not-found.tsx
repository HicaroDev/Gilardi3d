import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-8 text-6xl font-bold text-accent">404</p>
        <h1 className="mt-2 text-xl font-semibold">Página não encontrada</h1>
        <p className="mt-1 text-sm text-muted">O link pode ter expirado ou você não tem acesso a este conteúdo.</p>
        <Link href="/" className="btn-primary mt-6">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
