# ADR 0001 — Base técnica

- **IFC como formato mestre**; processamento no navegador com web-ifc (WASM) → Fragments.
- **Monolito Next.js na Vercel** em vez de NestJS/AWS na V1 (menos infraestrutura; migrável).
- **web-ifc fixado em 0.0.77**: That Open 3.4 quebra com 0.0.78 (`StreamMeshes` com 4 argumentos).
- **Webpack** em vez de Turbopack: o `TTFLoader` do three.js importa opentype.js por URL; alias para `src/vendor/ttf-loader.js`.
- WASM e worker servidos de `public/` (sem CDN em produção).
- Arquivos nunca passam pela Function (limite de 4,5 MB): upload direto ao Blob privado, download por URL assinada.
