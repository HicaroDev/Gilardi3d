"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string[]; hint?: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={clsx("input", error?.length && "border-red-500/70")}
        aria-invalid={!!error?.length}
        aria-describedby={error?.length ? `${id}-err` : undefined}
        {...props}
      />
      {error?.length ? (
        <p id={`${id}-err`} className="mt-1 text-[12px] text-red-300">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string[] }) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} name={name} className="input h-auto min-h-24 py-2" aria-invalid={!!error?.length} {...props} />
      {error?.length ? <p className="mt-1 text-[12px] text-red-300">{error[0]}</p> : null}
    </div>
  );
}

export function SubmitButton({ children, className, pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={clsx("btn-primary", className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border px-3 py-2.5 text-sm",
        kind === "error" && "border-red-500/40 bg-red-500/10 text-red-200",
        kind === "ok" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        kind === "info" && "border-line bg-white/5 text-fg",
      )}
    >
      {children}
    </div>
  );
}
