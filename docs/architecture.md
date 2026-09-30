# Arquitetura

```
Navegador ──► Next.js (Vercel) ──► PostgreSQL (Neon)          [plataforma ligada]
   │               │
   │               └─ autoriza upload / assina download ──► Vercel Blob (privado)
   │                                                             ▲
   └──────────── upload/download direto (URLs assinadas) ────────┘

Viewer (navegador): IFC ──web-ifc (WASM)──► Fragments ──► Three.js/That Open
                     └─ salva .frag + miniatura na versão (próximas aberturas rápidas)

AR (iPhone): IFC ──scripts/ifc-to-ar.mjs──► USDZ ──► AR Quick Look (Safari)
```

## Módulos

| Pasta | Responsabilidade |
|---|---|
| `src/viewer/engine` | `BimViewer`: fachada sobre o That Open Engine (carregar IFC/Fragments, seleção, propriedades, árvore, pavimentos, classes, ocultar/isolar, medição, corte, miniatura). Nada de React aqui. |
| `src/components/viewer` | UI do viewer (painéis, barra de ferramentas, botão AR). |
| `src/lib` | Infra de servidor: `db` (Prisma, criado sob demanda), `auth`, `permissions`, `storage` (Blob/local), `validation` (zod), `features` (chave da plataforma). |
| `src/server` | Server actions (auth, projetos, modelos) e consultas. |
| `src/app/api` | Upload (token do Blob / disco local), registro de arquivos, status do processamento, download protegido, health. |

## Estados do modelo

`CREATED → UPLOADING → QUEUED → PROCESSING → READY` (ou `FAILED`). O processamento roda no
navegador de quem tem papel de editor e abre o modelo pela primeira vez; o resultado (Fragments)
é salvo na própria versão. Um worker dedicado (Railway/Fly) pode assumir essa etapa no futuro
sem mudar o banco nem a UI — basta outro consumidor para as versões `QUEUED`.

## Permissões

Dono/admin da organização ou criador do projeto → `OWNER`; demais via `ProjectMember`
(`EDITOR`, `VIEWER`). Páginas respondem 404 sem acesso (não revelam existência). Links públicos
(`Share`) dão leitura a um projeto ou a um modelo, com validade e revogação.

## Base para o app iPhone

API, storage e modelo processado são independentes do front: o app nativo consome as mesmas
rotas e arquivos (Fragments para o viewer, USDZ para ARKit/RealityKit).
