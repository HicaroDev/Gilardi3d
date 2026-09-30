import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, storageDriver } from "@/lib/env";
import { formatBytes } from "@/components/ui/format";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireUser();
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: { include: { _count: { select: { projects: true, members: true } } } } },
  });
  const driver = storageDriver();
  const items = [
    { label: "Armazenamento", value: driver === "blob" ? "Vercel Blob (privado, URLs assinadas)" : "Disco local (desenvolvimento)" },
    { label: "Limite por arquivo IFC", value: formatBytes(env().MAX_UPLOAD_MB * 1024 * 1024) },
    { label: "Processamento", value: "No navegador (web-ifc WASM → Fragments), salvo para as próximas aberturas" },
    { label: "Formatos", value: "IFC 2x3 · IFC4 · IFC4.3" },
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Configurações</h1>
      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Workspaces</h2>
        <ul className="mt-3 divide-y divide-line/60">
          {memberships.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="font-medium">{m.organization.name}</span>
              <span className="text-[12px] text-muted">
                {m.role === "OWNER" ? "Dono" : m.role === "ADMIN" ? "Admin" : "Membro"} · {m.organization._count.projects} projetos ·{" "}
                {m.organization._count.members} membros
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Plataforma</h2>
        <dl className="mt-3 divide-y divide-line/60 text-sm">
          {items.map((i) => (
            <div key={i.label} className="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr]">
              <dt className="text-muted">{i.label}</dt>
              <dd>{i.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
