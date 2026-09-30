import Link from "next/link";
import { ArrowRight, Box, Layers, MousePointerClick, Share2, Smartphone, UploadCloud } from "lucide-react";
import { LogoMark } from "@/components/viewer/bim-viewer-app";

const features = [
  { icon: UploadCloud, title: "Upload de IFC", text: "IFC 2x3, IFC4 e IFC4.3 enviados direto para o storage, sem passar pelo servidor." },
  { icon: Box, title: "Visualizador 3D", text: "Orbitar, zoom, pan, perspectiva e ortográfica — tudo no navegador, sem instalar nada." },
  { icon: MousePointerClick, title: "Propriedades BIM", text: "Clique em qualquer elemento e veja atributos, Psets, quantidades, tipo e materiais." },
  { icon: Layers, title: "Árvore e pavimentos", text: "Navegue pela estrutura espacial, filtre por pavimento ou por classe IFC." },
  { icon: Share2, title: "Compartilhamento", text: "Gere um link ou QR Code para o cliente abrir o modelo no celular." },
  { icon: Smartphone, title: "Pronto para AR", text: "API e modelos independentes do front — base para o app iPhone com ARKit." },
];

export default async function Home() {
  const session = null as { user?: unknown } | null;
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <LogoMark />
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/demo" className="btn-ghost">
            Demo
          </Link>
          {session?.user ? (
            <Link href="/dashboard" className="btn-primary h-9">
              Meus projetos
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/register" className="btn-primary h-9">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 70% 20%, rgba(249,115,22,.18), transparent 45%), linear-gradient(rgba(34,49,77,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,49,77,.5) 1px, transparent 1px)",
              backgroundSize: "auto, 48px 48px, 48px 48px",
              maskImage: "linear-gradient(to bottom, black 50%, transparent)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[12px] text-muted">
              <span className="size-1.5 rounded-full bg-accent" /> Plataforma BIM · IFC no navegador
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Seu projeto BIM em 3D, <span className="text-accent">em qualquer tela.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Crie um projeto, envie o arquivo IFC exportado do Revit, ArchiCAD ou SketchUp e navegue pelo edifício com
              propriedades, árvore IFC, pavimentos, medições e cortes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="btn-primary h-12 px-6 text-base">
                Abrir modelo de exemplo <ArrowRight className="size-4" />
              </Link>
              <Link href={session?.user ? "/dashboard" : "/register"} className="btn-secondary h-12 px-6 text-base">
                {session?.user ? "Ir para meus projetos" : "Começar grátis"}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="card p-5">
                <f.icon className="mb-3 size-6 text-accent" />
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-[12px] text-muted">
        Gilardi 3D · IFC como formato mestre · That Open Engine + web-ifc
      </footer>
    </div>
  );
}
