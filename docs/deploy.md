# Deploy

## Modo atual (só o modelo em destaque)

Push na `main` → Vercel publica em https://gilardi3d.vercel.app. Nenhuma variável obrigatória.
O IFC e os USDZ saem da pasta `.ifc/` (copiados para `public/` no build).

Trocar o modelo: coloque o `.ifc` em `.ifc/`, gere o AR com
`node scripts/ifc-to-ar.mjs .ifc/<arquivo>.ifc .ifc/ar 50` e atualize `FEATURED_MODEL` /
`FEATURED_AR` em `src/lib/features.ts`.

## Ligando a plataforma

1. Vercel → Storage → **Neon** (Postgres) e **Blob** (store com acesso *private*), conectados ao projeto.
2. Variáveis (Production e Preview): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_PLATFORM_ENABLED=true`,
   `BLOB_READ_WRITE_TOKEN` (criada pela integração), opcional `RESEND_API_KEY`/`EMAIL_FROM`, `APP_URL`.
3. `DATABASE_URL=... npm run db:deploy` para aplicar as migrações.
4. Redeploy. Conferir `GET /api/health`.
