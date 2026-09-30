# Gilardi 3D

Plataforma BIM própria: **criar projeto → enviar IFC → processar → navegar em 3D no navegador → compartilhar por link/QR Code**, com a arquitetura preparada para um futuro **app iPhone com realidade aumentada** consumindo a mesma API.

> Estado atual: o site público abre direto o modelo **26610 (pianicad)**, sem login.
> A plataforma completa (login, projetos, upload, compartilhamento) está pronta no código e
> **desligada por chave** (`NEXT_PUBLIC_PLATFORM_ENABLED`). Ver [TASKS.md](TASKS.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, **webpack**) · React 19 · TypeScript strict |
| UI | Tailwind CSS v4 · lucide-react |
| Motor BIM | [That Open Engine](https://github.com/ThatOpen) 3.4 (`components`, `components-front`, `fragments`) · `web-ifc` **0.0.77** · Three.js |
| Banco | PostgreSQL (Neon na Vercel) · Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Auth.js v5 (credenciais, JWT) |
| Arquivos | Vercel Blob **privado** (upload direto do navegador, download por URL pré-assinada) |
| Deploy | Vercel (GitHub `HicaroDev/Gilardi3d`) |

## Rodando localmente

```bash
npm install                 # também gera o Prisma Client e copia WASM/worker para public/
cp .env.example .env        # ajuste AUTH_SECRET
npm run dev                 # http://localhost:3000
```

Só o visualizador (padrão): nada mais é necessário.

Plataforma completa em desenvolvimento:

```bash
npm run db:local            # Postgres local do Prisma (mostra a DATABASE_URL TCP)
# .env → DATABASE_URL=... e NEXT_PUBLIC_PLATFORM_ENABLED=true
npm run db:migrate          # aplica as migrações
npm run dev
```

Sem `BLOB_READ_WRITE_TOKEN`, os arquivos vão para `.storage/` (apenas desenvolvimento).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js (webpack) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | testes unitários (vitest) |
| `node tests/e2e/flow.mjs [url] [ifc]` | fluxo E2E completo (Playwright) — requer plataforma ligada |
| `node scripts/shot.mjs <url> <png>` | print de qualquer página (aguarda o modelo carregar) |
| `npm run db:migrate` · `db:deploy` · `db:studio` | Prisma |

## Estrutura

```
.ifc/                    modelos de demonstração (publicados em /ifc/*) + LINK.md
prisma/                  schema e migrações
scripts/                 copy-bim-assets (WASM/worker/IFC → public), shot (prints)
src/app/                 rotas (App Router)
  (auth)/                login, cadastro, recuperação de senha
  (app)/                 dashboard, projetos, configurações, perfil
  viewer/[modelId]       viewer da plataforma (processa e salva o modelo otimizado)
  s/[token]              links públicos de compartilhamento
  api/                   upload (Blob/local), arquivos protegidos, status de processamento, health
src/viewer/engine/       fachada sobre o That Open Engine (BimViewer)
src/components/viewer/   UI do viewer (árvore, pavimentos, classes, propriedades, ferramentas)
src/lib/                 db, auth, permissões, storage, validação, features
src/server/              server actions e consultas
docs/                    arquitetura, API e decisões (ADRs)
```

## Deploy (Vercel)

1. Projeto `gilardi3d` já ligado ao GitHub (push na `main` = produção; outras branches = preview).
2. Modo atual (só o modelo): **nenhuma variável obrigatória**.
3. Para ligar a plataforma: Neon Postgres + Blob store (privado) pelo Marketplace da Vercel, depois
   `AUTH_SECRET`, `NEXT_PUBLIC_PLATFORM_ENABLED=true`, `npm run db:deploy` e redeploy.
   Detalhes em [docs/deploy.md](docs/deploy.md).

## Créditos

Motor BIM: That Open Engine (MIT) e web-ifc (MPL-2.0). Casa de exemplo AC20-FZK-Haus: KIT/IAI.
