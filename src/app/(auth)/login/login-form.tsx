"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton } from "@/components/ui/form";

export function LoginForm({ callbackUrl, reset }: { callbackUrl: string; reset: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse seus projetos BIM.</p>
      </div>
      {reset && <Alert kind="ok">Senha redefinida. Entre com a nova senha.</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[13px] text-accent hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
