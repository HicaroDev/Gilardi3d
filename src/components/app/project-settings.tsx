"use client";

import { useActionState, useTransition } from "react";
import { Archive, ArchiveRestore, Trash2, UserMinus, UserPlus } from "lucide-react";
import {
  addMemberAction,
  deleteProjectAction,
  removeMemberAction,
  setProjectArchivedAction,
  updateProjectAction,
} from "@/server/actions/projects";
import type { FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton, TextArea } from "@/components/ui/form";

const ROLE_LABEL: Record<string, string> = { OWNER: "Dono", EDITOR: "Editor", VIEWER: "Leitor" };

export function ProjectSettings({
  project,
  members,
  isOwner,
}: {
  project: { id: string; name: string; description: string; location: string; archived: boolean };
  members: { id: string; name: string; email: string; role: string; isMe: boolean }[];
  isOwner: boolean;
}) {
  const [info, infoAction] = useActionState<FormState, FormData>(updateProjectAction, {});
  const [member, memberAction] = useActionState<FormState, FormData>(addMemberAction, {});
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={infoAction} className="card space-y-4 p-5">
        <h2 className="font-semibold">Dados do projeto</h2>
        {info.ok && <Alert kind="ok">{info.ok}</Alert>}
        {info.error && <Alert>{info.error}</Alert>}
        <input type="hidden" name="projectId" value={project.id} />
        <Field label="Nome" name="name" defaultValue={info.fields?.name ?? project.name} error={info.fieldErrors?.name} required />
        <Field label="Localização" name="location" defaultValue={info.fields?.location ?? project.location} error={info.fieldErrors?.location} />
        <TextArea label="Descrição" name="description" defaultValue={info.fields?.description ?? project.description} error={info.fieldErrors?.description} />
        <div className="flex justify-end">
          <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
        </div>
      </form>

      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="font-semibold">Equipe</h2>
          <ul className="mt-3 divide-y divide-line/60">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name} {m.isMe && <span className="text-muted">(você)</span>}
                  </p>
                  <p className="truncate text-[12px] text-muted">{m.email}</p>
                </div>
                <span className="text-[12px] text-muted">{ROLE_LABEL[m.role] ?? m.role}</span>
                {isOwner && m.role !== "OWNER" && (
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-red-300"
                    aria-label={`Remover ${m.name}`}
                    disabled={pending}
                    onClick={() => start(() => removeMemberAction(project.id, m.id))}
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isOwner && (
            <form action={memberAction} className="mt-4 space-y-3 border-t border-line pt-4">
              {member.ok && <Alert kind="ok">{member.ok}</Alert>}
              {member.error && <Alert>{member.error}</Alert>}
              <input type="hidden" name="projectId" value={project.id} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Field label="E-mail do membro" name="email" type="email" placeholder="pessoa@empresa.com" className="flex-1" error={member.fieldErrors?.email} />
                <div>
                  <label className="label" htmlFor="m-role">Papel</label>
                  <select id="m-role" name="role" className="input" defaultValue="VIEWER">
                    <option value="VIEWER">Leitor</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                </div>
              </div>
              <SubmitButton pendingText="Adicionando…">
                <UserPlus className="size-4" /> Adicionar
              </SubmitButton>
            </form>
          )}
        </section>

        {isOwner && (
          <section className="card border-red-500/30 p-5">
            <h2 className="font-semibold">Zona de risco</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() => start(() => setProjectArchivedAction(project.id, !project.archived))}
              >
                {project.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {project.archived ? "Reativar projeto" : "Arquivar projeto"}
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm(`Excluir “${project.name}”, todos os modelos e arquivos? Não dá para desfazer.`)) {
                    start(() => deleteProjectAction(project.id));
                  }
                }}
              >
                <Trash2 className="size-4" /> Excluir projeto
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
