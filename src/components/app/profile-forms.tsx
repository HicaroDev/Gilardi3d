"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type FormState } from "@/server/actions/auth";
import { Alert, Field, SubmitButton } from "@/components/ui/form";

export function ProfileForms({ name }: { name: string }) {
  const [profile, profileAction] = useActionState<FormState, FormData>(updateProfileAction, {});
  const [pwd, pwdAction] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <div className="mt-6 space-y-6">
      <form action={profileAction} className="card space-y-4 p-5">
        <h2 className="font-semibold">Seus dados</h2>
        {profile.ok && <Alert kind="ok">{profile.ok}</Alert>}
        <Field label="Nome" name="name" defaultValue={name} required error={profile.fieldErrors?.name} />
        <div className="flex justify-end">
          <SubmitButton pendingText="Salvando…">Salvar</SubmitButton>
        </div>
      </form>
      <form action={pwdAction} className="card space-y-4 p-5">
        <h2 className="font-semibold">Alterar senha</h2>
        {pwd.ok && <Alert kind="ok">{pwd.ok}</Alert>}
        <Field label="Senha atual" name="current" type="password" autoComplete="current-password" error={pwd.fieldErrors?.current} />
        <Field label="Nova senha" name="password" type="password" autoComplete="new-password" error={pwd.fieldErrors?.password} />
        <Field label="Confirmar nova senha" name="confirm" type="password" autoComplete="new-password" error={pwd.fieldErrors?.confirm} />
        <div className="flex justify-end">
          <SubmitButton pendingText="Alterando…">Alterar senha</SubmitButton>
        </div>
      </form>
    </div>
  );
}
