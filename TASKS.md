# Gilardi 3D — To-do / Acompanhamento

> Plataforma BIM própria (fluxo tipo Augin): projetos → upload IFC → processamento → viewer 3D → compartilhamento → (futuro) iPhone + AR.
> Fonte do plano: `seed.md`. Progresso geral atualizado a cada marco.

**Progresso geral: 35 %**

Legenda: `[x]` feito · `[~]` em andamento · `[ ]` pendente · `[-]` fora do escopo desta fase

## M0 — Fundação
- [x] G3D-001 Next.js 16 (App Router) + TypeScript strict
- [x] G3D-003 Tailwind v4 com tokens de cor (tema escuro técnico, laranja Gilardi)
- [x] G3D-004 ESLint (flat config do Next)
- [ ] G3D-005 Prettier
- [ ] G3D-006 Validação de variáveis de ambiente (zod)
- [x] G3D-007 Projeto Vercel `gilardi3d` criado e ligado ao GitHub
- [x] G3D-008 Deploy de preview
- [ ] G3D-009 Domínio de produção (aguarda liberação do deploy `--prod`)

## M1 — Banco + Auth + Projetos
- [ ] G3D-010 Banco PostgreSQL (Neon via Vercel Marketplace) — local: Prisma Postgres (`prisma dev`)
- [ ] G3D-011 Prisma 7 + client gerado
- [ ] G3D-012..019 Schema: User, Organization, Member, Project, ProjectMember, BimModel, ModelVersion, File, ProcessingJob, Share, AuditLog
- [ ] G3D-020 Migração inicial
- [ ] G3D-021 Auth.js v5 (credenciais, JWT)
- [ ] G3D-022 Login · G3D-023 Cadastro · G3D-024 Logout
- [ ] G3D-025 Recuperação de senha (token + e-mail via Resend; log no dev)
- [ ] G3D-026 Proteção de rotas (proxy.ts) · G3D-027 Dashboard protegido
- [ ] G3D-030..035 Projetos: listar, criar, detalhes, renomear, arquivar, excluir
- [ ] G3D-036 Permissões por projeto (OWNER/EDITOR/VIEWER)

## M2 — Upload IFC
- [ ] G3D-040 Vercel Blob (client upload direto do navegador, sem passar pela Function)
- [ ] G3D-041/042 Upload multipart · G3D-043 barra de progresso
- [ ] G3D-044 Validação de IFC (extensão + cabeçalho ISO-10303-21) · G3D-045 limite de tamanho
- [ ] G3D-046 Metadados do arquivo + ModelVersion
- [ ] Storage local em disco para desenvolvimento (sem token do Blob)

## M3 — Primeiro modelo 3D ✅
- [x] G3D-050 web-ifc 0.0.77 (versão exigida pelo That Open 3.4)
- [x] G3D-051 WASM + worker do Fragments servidos localmente (`scripts/copy-bim-assets.mjs`)
- [x] G3D-052 Carregar IFC no navegador → Fragments
- [x] G3D-070..077 Página do viewer, mundo, cena, câmera, renderer, grid, loader, órbita
- [x] Pasta `.ifc/` com o modelo 26610 publicado em `/demo`

## M4 — Viewer BIM
- [x] G3D-078/079 Seleção + highlight
- [x] G3D-080 Propriedades (atributos, Psets, quantidades, tipo, materiais, GlobalId)
- [x] G3D-081 Árvore espacial (Projeto → Terreno → Edifício → Pavimento → classes)
- [x] G3D-082..084 Ocultar / mostrar / isolar · raio-X
- [x] G3D-085 Enquadrar seleção · G3D-086 Filtro por pavimento
- [x] G3D-100 Corte (clipping) · G3D-101 Medição de distância
- [x] G3D-103 Busca na árvore · G3D-104 Filtro por classe IFC
- [x] G3D-107 Screenshot · G3D-108 Tela cheia · perspectiva/ortográfica
- [ ] Cache do modelo processado (.frag) + miniatura no storage (abre 10x mais rápido)
- [ ] Layout mobile validado em celular

## M5 — Compartilhamento
- [ ] G3D-120/121 Compartilhar projeto/modelo · G3D-124 token · G3D-125 expiração
- [ ] G3D-122 Viewer público por link · G3D-126 QR Code

## M6 — Produção V1
- [x] G3D-146 Security headers
- [ ] G3D-144 Limites de upload · G3D-145 rate limiting (login/cadastro)
- [ ] G3D-147 Variáveis de produção · G3D-148 deploy de produção
- [ ] G3D-149 Smoke tests (Playwright) · testes unitários (vitest)
- [ ] G3D-140 Sentry · G3D-141 Vercel Analytics
- [ ] README + docs/architecture + ADRs

## Depois (V1.1+)
- [-] Área de medição · explodido · colorir por categoria · transparência por classe
- [-] Comentários / Issues / BCF
- [-] Modelos federados (várias disciplinas no mesmo viewer)
- [-] Worker BIM dedicado (Railway/Fly) para IFC muito grandes
- [-] App iPhone + ARKit/RealityKit consumindo a mesma API
