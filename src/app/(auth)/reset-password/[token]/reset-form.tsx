"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton } from "@/components/ui/form";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Nova senha</h1>
        <p className="mt-1 text-sm text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
      />
      <Field
        label="Confirmar senha"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton className="w-full" pendingText="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
