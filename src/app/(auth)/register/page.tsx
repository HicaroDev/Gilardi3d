"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton } from "@/components/ui/form";

export default function RegisterPage() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">Comece a enviar seus modelos IFC.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <Field
        label="Nome"
        name="name"
        autoComplete="name"
        required
        defaultValue={state.fields?.name}
        error={state.fieldErrors?.name}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
        hint="Mínimo de 8 caracteres."
      />
      <SubmitButton className="w-full" pendingText="Criando conta…">
        Criar conta
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
