# Gilardi 3D — To-do / Acompanhamento

> Plataforma BIM própria (fluxo tipo Augin): projetos → upload IFC → processamento → viewer 3D → compartilhamento → AR no iPhone.
> Fonte do plano: `seed.md`. Decisão de 30/09: **site público = só o modelo 26610, sem login**; plataforma completa pronta e desligada por chave.

**Progresso geral: 88 %**

Legenda: `[x]` feito · `[~]` em andamento · `[ ]` pendente · `[-]` depois

## M0 — Fundação
- [x] Next.js 16 + TypeScript strict + Tailwind v4 + ESLint
- [x] Validação de variáveis de ambiente (zod)
- [x] Projeto Vercel `gilardi3d` ligado ao GitHub `HicaroDev/Gilardi3d`
- [x] Primeiro deploy público: https://gilardi3d.vercel.app/demo
- [~] Deploy de produção da versão atual (liberado pelo Hícaro)

## M1 — Banco + Auth + Projetos (pronto, desligado por chave)
- [x] PostgreSQL + Prisma 7: User, Organization, Member, Project, ProjectMember, BimModel, ModelVersion, File, ProcessingJob, Share, AuditLog
- [x] Auth.js v5: login, cadastro, logout, recuperação de senha (Resend), perfil, troca de senha
- [x] Proteção de rotas (proxy.ts) + permissões OWNER/EDITOR/VIEWER
- [x] Projetos: listar, criar, editar, arquivar, excluir, equipe
- [ ] Criar Neon + Blob na Vercel (só quando for ligar a plataforma)

## M2 — Upload IFC (pronto, desligado por chave)
- [x] Upload direto do navegador para Vercel Blob privado, com progresso (fallback em disco no dev)
- [x] Validação de extensão, cabeçalho ISO-10303-21, schema e tamanho
- [x] Versões por modelo, disciplinas, histórico, reprocessar, excluir

## M3 — Primeiro modelo 3D ✅
- [x] web-ifc 0.0.77 + That Open 3.4 (WASM e worker servidos localmente)
- [x] Modelo 26610 (36 MB, IFC2X3, 2.746 elementos, 9 pavimentos) abrindo no navegador

## M4 — Viewer BIM ✅
- [x] Seleção + destaque, propriedades (atributos, Psets, quantidades, tipo, materiais, GlobalId)
- [x] Árvore espacial, filtro por pavimento, filtro por classe IFC, busca
- [x] Ocultar / mostrar / isolar / raio-X / enquadrar
- [x] Medição de distância, corte, screenshot, tela cheia, perspectiva/ortográfica
- [x] Processado no navegador → salvo como Fragments + miniatura (plataforma)
- [x] Layout responsivo (celular)

## M5 — Compartilhamento ✅ (plataforma)
- [x] Link público com validade/revogação + QR Code + contador de visualizações

## AR — Realidade aumentada no iPhone
- [x] Conversor IFC → USDZ (`scripts/ifc-to-ar.mjs`): maquete 1:50 e tamanho real, 13 MB cada
- [~] Botão "Ver em AR" no viewer (AR Quick Look no Safari; QR Code no computador)
- [ ] Teste no iPhone do Hícaro

## M6 — Produção V1
- [x] Headers de segurança + CSP, rate limit, páginas de erro, robots, Vercel Analytics
- [x] Testes unitários (vitest) + fluxo E2E (Playwright) passando
- [x] README
- [~] CI no GitHub Actions · docs de arquitetura/deploy
- [ ] Domínio próprio (quando definir o nome comercial)

## Depois
- [-] Ligar a plataforma (login/projetos/upload) na produção
- [-] Área, explodido, colorir por categoria, comentários/issues/BCF
- [-] Modelos federados · worker BIM dedicado para IFC gigantes
- [-] App iPhone nativo (ARKit/RealityKit) com AR 1:1 georreferenciado em obra
