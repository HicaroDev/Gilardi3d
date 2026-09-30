# Modelos IFC de demonstração

Os arquivos desta pasta são publicados no build (`scripts/copy-bim-assets.mjs`):
`.ifc/*.ifc` → `/ifc/*` e `.ifc/ar/*.usdz` → `/ar/*`.

## Links

| O quê | Link |
|---|---|
| **Modelo 26610 (pianicad) — viewer 3D** | https://gilardi3d.vercel.app |
| Realidade aumentada no iPhone (abre direto o painel AR) | https://gilardi3d.vercel.app/?ar=1 |
| USDZ maquete 1:50 (AR Quick Look) | https://gilardi3d.vercel.app/ar/26610_ese_pianicad_20260929_IFC-maquete.usdz |
| USDZ tamanho real 1:1 | https://gilardi3d.vercel.app/ar/26610_ese_pianicad_20260929_IFC-real.usdz |

No iPhone: abra o link no **Safari**, toque em **Ver em AR** e escolha maquete ou tamanho real.
No computador: o botão **Ver em AR** mostra um QR Code para abrir no iPhone.

## Trocar / adicionar modelo

1. Coloque o `.ifc` nesta pasta.
2. Gere o AR: `node scripts/ifc-to-ar.mjs .ifc/<arquivo>.ifc .ifc/ar 50`
3. Atualize `FEATURED_MODEL` e `FEATURED_AR` em `src/lib/features.ts`.
4. Commit/push na `main` — a Vercel publica sozinha.

> Atenção: tudo o que está nesta pasta fica **público**.
