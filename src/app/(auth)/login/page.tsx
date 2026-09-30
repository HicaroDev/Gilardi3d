import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return <LoginForm callbackUrl={sp.callbackUrl ?? "/dashboard"} reset={sp.reset === "1"} />;
}
