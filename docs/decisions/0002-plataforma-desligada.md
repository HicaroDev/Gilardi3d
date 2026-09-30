# ADR 0002 — Plataforma desligada por chave (30/09/2026)

Decisão do Hícaro: por enquanto o site mostra **apenas o modelo 26610, sem login**.
Login, projetos, upload e compartilhamento ficam no código atrás de `NEXT_PUBLIC_PLATFORM_ENABLED`.
Desligada, a aplicação não toca no banco (cliente Prisma criado sob demanda) e o proxy redireciona
as rotas da plataforma para `/` e responde 404 nas APIs.
