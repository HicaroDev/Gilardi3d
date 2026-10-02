# Modelos IFC de demonstração

Os arquivos desta pasta são publicados no build (`scripts/copy-bim-assets.mjs`):
`.ifc/*.ifc` → `/ifc/*` e `.ifc/ar/*.usdz` → `/ar/*`.

## Projetos públicos (seletor no topo do viewer)

| Projeto | Viewer 3D | AR no iPhone (abre direto o painel) | Maquete |
|---|---|---|---|
| **26610 — Pianicad** | https://gilardi3d.vercel.app/?projeto=26610 | https://gilardi3d.vercel.app/?projeto=26610&ar=1 | 1:50 · 13 MB |
| **BEL 4845** | https://gilardi3d.vercel.app/?projeto=bel-4845 | https://gilardi3d.vercel.app/?projeto=bel-4845&ar=1 | 1:100 · 7,7 MB |
| **Office building** | https://gilardi3d.vercel.app/?projeto=office | https://gilardi3d.vercel.app/?projeto=office&ar=1 | 1:200 · 69 MB |

`https://gilardi3d.vercel.app` sem parâmetro abre o 26610.

No iPhone: abra o link no **Safari**, toque em **Ver em AR** e escolha maquete ou tamanho real.
No computador: o botão **Ver em AR** mostra um QR Code para abrir no iPhone.

## Adicionar modelo

1. Coloque o `.ifc` nesta pasta.
2. Gere o AR: `node scripts/ifc-to-ar.mjs .ifc/<arquivo>.ifc .ifc/ar <escala>` (escolha a escala para a maquete ficar com ~40–50 cm).
3. Acrescente o projeto em `PUBLIC_PROJECTS` (`src/lib/features.ts`) com os dados do `<arquivo>-ar.json`.
4. Commit/push na `main` — a Vercel publica sozinha.

> Atenção: tudo o que está nesta pasta fica **público**.
