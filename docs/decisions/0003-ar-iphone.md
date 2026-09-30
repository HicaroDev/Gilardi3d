# ADR 0003 — Realidade aumentada no iPhone via AR Quick Look

Antes do app nativo, o AR usa o **AR Quick Look** do iOS (link `rel="ar"` para um `.usdz`), sem app.
O USDZ é gerado offline por `scripts/ifc-to-ar.mjs` (web-ifc no Node → USDA próprio: vértices
soldados em 1 mm, sem normais, dados alinhados em 64 bytes) — 13 MB para 462 mil triângulos.
Duas versões: maquete 1:50 (mesa) e 1:1 (obra). O servidor entrega `model/vnd.usdz+zip`.
No computador o botão mostra um QR Code que abre a página em modo só-AR (`?ar=1`, sem baixar o IFC).
