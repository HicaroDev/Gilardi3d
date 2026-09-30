import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { verifyPassword } from "./password";
import { loginSchema } from "./validation";
import { rateLimit } from "./rate-limit";

class InvalidLogin extends CredentialsSignin {
  code = "invalid_credentials";
}

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidLogin();
        const email = parsed.data.email.toLowerCase();
        if (!rateLimit(`login:${email}`, 10, 15 * 60_000).ok) throw new TooManyAttempts();
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) throw new InvalidLogin();
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
});

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** Usuário logado (ou null). Confirma no banco que a conta ainda existe. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
