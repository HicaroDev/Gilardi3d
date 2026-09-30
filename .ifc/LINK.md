# Modelos IFC de demonstração

Os arquivos `.ifc` desta pasta são publicados automaticamente no build
(`scripts/copy-bim-assets.mjs` → `public/ifc/`) e abertos no visualizador online.

## Links

| Modelo | Link |
|---|---|
| **26610_ese_pianicad_20260929_IFC.ifc** (principal) | https://gilardi3d.vercel.app/demo |
| AC20-FZK-Haus.ifc (casa de exemplo) | https://gilardi3d.vercel.app/demo?modelo=haus |
| Visualizador vazio (arraste seu IFC) | https://gilardi3d.vercel.app/demo?modelo=vazio |

Preview (exige login na Vercel): https://gilardi3d-bkmdkupty-hicarodevs-projects.vercel.app/demo

## Como adicionar outro modelo

1. Coloque o `.ifc` nesta pasta.
2. Registre-o em `SAMPLES` no arquivo `src/app/demo/demo-viewer.tsx`
   (chave usada em `?modelo=<chave>`).
3. Faça commit/push — a Vercel publica sozinha.

> Atenção: tudo o que está nesta pasta fica **público** no link acima.
> Projetos de clientes devem ir pela plataforma (login → projeto → upload),
> onde os arquivos ficam privados.
