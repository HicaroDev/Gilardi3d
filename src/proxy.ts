import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { PLATFORM_ENABLED } from "@/lib/features";

// Checagem otimista de sessão (JWT) antes de renderizar páginas protegidas.
// A autorização real acontece nas páginas/ações (requireUser + permissões).
const { auth } = NextAuth(authConfig);
const authProxy = auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response | undefined>;

export default async function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (!PLATFORM_ENABLED) {
    const { pathname } = req.nextUrl;
    // Plataforma desligada: só existe o visualizador público na página inicial.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não disponível" }, { status: 404 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (req.nextUrl.pathname.startsWith("/api/") || req.nextUrl.pathname === "/demo" || req.nextUrl.pathname.startsWith("/s/")) {
    return NextResponse.next();
  }
  return authProxy(req, ev);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/viewer/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password/:path*",
    "/demo",
    "/s/:path*",
    "/api/auth/:path*",
    "/api/upload/:path*",
    "/api/versions/:path*",
    "/api/files/:path*",
  ],
};
