"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton } from "@/components/ui/form";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted">Enviaremos um link para criar uma nova senha.</p>
      </div>
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
      <Field label="E-mail" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <SubmitButton className="w-full" pendingText="Enviando…">
        Enviar link
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
