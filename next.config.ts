import path from "node:path";
import type { NextConfig } from "next";

// O TTFLoader do three.js importa o opentype.js direto de uma URL de CDN,
// o que nenhum bundler resolve. Trocamos por uma cópia que usa o pacote local.
const TTF_LOADER = "three/examples/jsm/loaders/TTFLoader.js";
const TTF_LOCAL = "./src/vendor/ttf-loader.js";

// CSP: o viewer precisa de WebAssembly (web-ifc), workers (Fragments) e
// downloads diretos do Vercel Blob (URLs pré-assinadas).
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https://*.public.blob.vercel-storage.com https://*.blob.vercel-storage.com https://*.vercel-storage.com https://vercel.com https://*.vercel-insights.com" +
    (isDev ? " ws: http://localhost:*" : ""),
  "img-src 'self' data: blob: https://*.blob.vercel-storage.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["web-ifc"],
  turbopack: {
    resolveAlias: { [TTF_LOADER]: TTF_LOCAL },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      [`${TTF_LOADER}$`]: path.resolve(process.cwd(), TTF_LOCAL),
    };
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/wasm/:file*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fragments/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // O AR Quick Look do iOS exige este Content-Type para abrir o USDZ.
        source: "/ar/:file*",
        headers: [
          { key: "Content-Type", value: "model/vnd.usdz+zip" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/ifc/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
