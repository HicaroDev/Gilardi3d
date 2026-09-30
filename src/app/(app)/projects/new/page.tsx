"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { createProjectAction } from "@/server/actions/projects";
import type { FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton, TextArea } from "@/components/ui/form";

export default function NewProjectPage() {
  const [state, action] = useActionState<FormState, FormData>(createProjectAction, {});
  return (
    <div className="max-w-xl">
      <Link href="/projects" className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="size-4" /> Projetos
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Novo projeto</h1>
      <p className="mt-1 text-sm text-muted">Depois de criar, você envia os arquivos IFC de cada disciplina.</p>
      <form action={action} className="card mt-6 space-y-4 p-5" noValidate>
        {state.error && <Alert>{state.error}</Alert>}
        <Field
          label="Nome do projeto"
          name="name"
          required
          placeholder="Ex.: Residencial Bellinzona"
          defaultValue={state.fields?.name}
          error={state.fieldErrors?.name}
          autoFocus
        />
        <Field
          label="Localização"
          name="location"
          placeholder="Cidade, endereço ou lote (opcional)"
          defaultValue={state.fields?.location}
          error={state.fieldErrors?.location}
        />
        <TextArea
          label="Descrição"
          name="description"
          placeholder="Observações para a equipe (opcional)"
          defaultValue={state.fields?.description}
          error={state.fieldErrors?.description}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/projects" className="btn-secondary">
            Cancelar
          </Link>
          <SubmitButton pendingText="Criando…">Criar projeto</SubmitButton>
        </div>
      </form>
    </div>
  );
}
