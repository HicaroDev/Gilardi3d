import type { NextAuthConfig } from "next-auth";

// Configuração compartilhada e sem dependências de Node (usada também no proxy).
export const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/viewer", "/settings", "/profile"];
export const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const loggedIn = !!auth?.user;
      if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return loggedIn;
      if (loggedIn && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
