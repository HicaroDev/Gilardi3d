Sim. Pesquisei o funcionamento atual do Augin e a ideia é totalmente viável, desde que façamos nosso próprio produto e arquitetura, sem copiar código, marca ou interface proprietária.
O Augin hoje trabalha essencialmente com upload de modelos BIM em IFC, processamento, armazenamento em nuvem, visualização 3D no navegador/desktop e visualização em realidade aumentada no celular. Ele suporta IFC 2x3, IFC 4 e IFC 4.3 e oferece filtros, informações dos elementos, cortes, medições, modelos federados, compartilhamento e AR em escala 1:1. Augin
Para o nosso projeto, eu faria em 3 grandes fases:
1. MVP Web — prioridade agora. Criamos uma plataforma onde você entra, cria um projeto, faz upload de um .IFC, o sistema processa o arquivo e você abre o edifício/modelo diretamente no navegador. O visualizador já terá orbitar, zoom, pan, seleção de elementos, propriedades BIM, ocultar/exibir elementos, árvore do modelo, corte e medição.
2. Plataforma BIM completa. Depois acrescentamos contas de usuários, armazenamento dos projetos, compartilhamento por link/QR Code, versões do projeto, disciplinas — arquitetura, estrutura, hidráulica, elétrica etc. — e modelos federados. Isso nos aproxima funcionalmente da experiência que o Augin oferece hoje. Augin
3. iPhone + Realidade Aumentada. O aplicativo acessará os mesmos projetos armazenados na nossa nuvem e permitirá colocar o edifício no ambiente real usando ARKit, inclusive buscando posteriormente visualização 1:1 em obra. O próprio Augin utiliza ARKit/ARCore para dispositivos compatíveis. Augin
Arquitetura que proponho
Eu não começaria pelo aplicativo. O núcleo deve ser independente:
Arquivo Revit/SketchUp/etc. → IFC → Upload → servidor de processamento BIM → banco/storage → modelo otimizado para Web → visualizador 3D
Depois:
mesma API/nuvem → aplicativo iPhone → ARKit → modelo em realidade aumentada
Isso é importante porque significa que não teremos que reconstruir tudo quando chegarmos ao iPhone.
Para o primeiro protótipo, nossa meta pode ser bem objetiva:
Abrir um arquivo IFC seu em uma plataforma web própria e conseguir navegar pelo projeto em 3D.

Depois que isso funcionar, colocamos progressivamente as ferramentas BIM.
Eu sugiro chamarmos provisoriamente o projeto de BIM AR Viewer, até você definir o nome comercial.
MVP 0.1
Módulo	Primeira versão
Login	✅
Meus Projetos	✅
Criar projeto	✅
Upload IFC	✅
Processamento IFC	✅
Visualizador 3D	✅
Zoom / Orbit / Pan	✅
Selecionar elemento	✅
Propriedades BIM	✅
Árvore IFC	✅
Ocultar / mostrar	✅
Medição	segunda etapa
Corte	segunda etapa
Compartilhar link	segunda etapa
QR Code	segunda etapa
Modelo federado	posterior
Realidade aumentada	posterior
App iPhone	posterior


E existe uma decisão técnica muito importante antes de começarmos a programar: qual engine BIM/3D vamos usar. Não precisamos desenvolver um interpretador IFC do zero. Podemos montar o produto usando tecnologias como IFC.js/That Open Engine, Three.js/WebGL e componentes próprios, com backend e armazenamento separados.
A parte interessante é que o Augin confirma justamente que o IFC é a base da interoperabilidade da plataforma. Augin Portanto, eu também adotaria IFC como formato mestre na primeira versão.
Próximo passo: posso assumir isso como um projeto de software com você e começar pela arquitetura técnica + mapa das telas + tecnologias + banco de dados + estrutura do visualizador 3D. Depois disso, construímos o primeiro protótipo executável em etapas.





    








crie toda a estrutura para eu colocar em produção





 






Pensando
Vou montar isso como arquitetura de produção de verdade, não só um protótipo: frontend, backend, processamento IFC, storage, banco, autenticação, segurança, deploy, monitoramento e a base para o futuro app iPhone/AR. Também vou separar claramente o que entra no MVP produtivo e o que fica para a segunda fase, para você não gastar tempo construindo funções avançadas antes da base estar estável.

Estruturou o projeto

Refinou o scaffold

Pesquisou 8 sites




A decisão técnica principal está fechada: vou usar IFC como formato mestre, upload direto para armazenamento S3-compatible por URL temporária, PostgreSQL para dados e uma fila/worker separado para processamento. Isso evita que arquivos BIM pesados atravessem o servidor web e já prepara o sistema para escalar; URLs pré-assinadas são justamente o mecanismo documentado pela AWS para upload/download temporário sem expor credenciais. 
Para o motor BIM, a base será That Open + web-ifc, que hoje suporta construção de software BIM web/server e leitura de IFC via WebAssembly.


__________________________________________________________________________________________


Sim — o que você precisa agora é de uma **estrutura completa de projeto de desenvolvimento**, com backlog, infraestrutura, arquitetura e ordem de execução. Vou assumir como objetivo o seguinte:

> **Construir uma plataforma própria semelhante ao fluxo do Augin: criar projetos, enviar arquivos IFC, processar e visualizar modelos BIM em 3D no navegador, preparando a arquitetura para posteriormente ter aplicativo iPhone e realidade aumentada.**

A base técnica faz sentido com **That Open/web-ifc**, porque o `web-ifc` lê e escreve IFC em JavaScript/WebAssembly e pode funcionar tanto no navegador quanto em Node.js. :chatgpt-content-reference{index="0"}

# 1. Estrutura macro do projeto

Eu organizaria em **8 frentes de trabalho**:

| Código | Frente |
|---|---|
| EPIC-01 | Fundação do projeto |
| EPIC-02 | Autenticação e usuários |
| EPIC-03 | Gestão de projetos BIM |
| EPIC-04 | Upload e armazenamento |
| EPIC-05 | Processamento IFC |
| EPIC-06 | Visualizador BIM 3D |
| EPIC-07 | Infraestrutura e produção |
| EPIC-08 | Base para Mobile + AR |

---

# 2. Arquitetura do sistema

```text
                      USUÁRIO
                         │
                         ▼
                ┌────────────────┐
                │   WEB APP      │
                │ Next.js/React  │
                └───────┬────────┘
                        │
                        │ HTTPS/API
                        ▼
                ┌────────────────┐
                │      API       │
                │ Node/TypeScript│
                └───┬─────┬──────┘
                    │     │
           ┌────────┘     └─────────┐
           ▼                        ▼
   ┌──────────────┐          ┌──────────────┐
   │ PostgreSQL   │          │ Object       │
   │              │          │ Storage S3   │
   └──────────────┘          └──────┬───────┘
                                    │
                                    ▼
                              ┌─────────────┐
                              │ JOB QUEUE   │
                              │ Redis       │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ IFC WORKER  │
                              │ web-ifc     │
                              └──────┬──────┘
                                     │
                                     ▼
                              Modelo otimizado
                                     │
                                     ▼
                               Object Storage
                                     │
                                     ▼
                              WEB BIM VIEWER
```

O upload deve ser feito preferencialmente direto do navegador para storage via **presigned URL**, evitando que arquivos grandes passem pelo servidor da aplicação. A AWS documenta exatamente esse padrão para permitir uploads temporários sem entregar credenciais ao usuário. :chatgpt-content-reference{index="1"}

---

# 3. Stack recomendada

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
TanStack Query
Zustand
That Open Components
Three.js
web-ifc
```

## Backend

```text
Node.js
TypeScript
NestJS
Prisma ORM
PostgreSQL
Redis
BullMQ
```

## Infraestrutura

```text
Docker
Docker Compose
GitHub
GitHub Actions
AWS
```

Produção:

```text
Frontend → Vercel
API → AWS ECS/Fargate
Worker → AWS ECS/Fargate
Banco → AWS RDS PostgreSQL
Storage → AWS S3
Cache/Fila → AWS ElastiCache Redis
CDN → CloudFront
DNS → Route53
Logs → CloudWatch
Erros → Sentry
```

Para a primeira versão você pode simplificar bastante usando:

```text
Vercel
Railway
PostgreSQL
Cloudflare R2 ou S3
Redis
```

e migrar depois.

---

# 4. Estrutura do repositório

Eu recomendo um **monorepo**.

```text
bim-platform/
│
├── apps/
│   │
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── models/
│   │   │   ├── files/
│   │   │   ├── viewer/
│   │   │   └── jobs/
│   │   │
│   │   └── prisma/
│   │
│   └── worker/
│       └── src/
│           ├── ifc/
│           ├── geometry/
│           ├── properties/
│           └── thumbnails/
│
├── packages/
│   │
│   ├── ui/
│   ├── database/
│   ├── types/
│   ├── config/
│   └── bim-core/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── scripts/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 5. Banco de dados

Estrutura inicial:

```text
users
organizations
organization_members
projects
project_members
models
model_versions
files
processing_jobs
model_elements
model_properties
shares
audit_logs
```

Relação principal:

```text
USER
  │
  ▼
ORGANIZATION
  │
  ▼
PROJECT
  │
  ▼
MODEL
  │
  ▼
MODEL VERSION
  │
  ├── IFC FILE
  │
  ├── PROCESSED MODEL
  │
  └── BIM PROPERTIES
```

---

# 6. Modelo de dados

Exemplo:

```text
Project
-------
id
organizationId
name
description
status
createdBy
createdAt
updatedAt
```

Modelo BIM:

```text
Model
-----
id
projectId
name
discipline
currentVersion
status
createdAt
```

Versão:

```text
ModelVersion
------------
id
modelId
version
originalFileId
processedFileId
processingStatus
createdAt
```

Arquivo:

```text
File
----
id
name
key
bucket
mimeType
extension
size
checksum
createdAt
```

---

# 7. Fluxo principal do produto

Usuário entra:

```text
Login
  ↓
Dashboard
  ↓
Projetos
  ↓
Novo projeto
  ↓
Upload IFC
  ↓
Processando
  ↓
Modelo disponível
  ↓
Abrir Viewer
```

---

# 8. Telas

## AUTH

```text
/auth/login
/auth/register
/auth/forgot-password
```

## APP

```text
/dashboard

/projects

/projects/new

/projects/:id

/projects/:id/models

/projects/:id/models/:modelId

/projects/:id/viewer/:modelId

/settings

/profile
```

---

# 9. Viewer BIM

Essa é a parte central.

Layout:

```text
┌──────────────────────────────────────────────┐
│ Projeto X        Viewer BIM       usuário   │
├──────────┬───────────────────────┬───────────┤
│          │                       │           │
│ Árvore   │                       │ Properties│
│ BIM      │      MODELO 3D        │           │
│          │                       │           │
│ Storeys  │                       │ IFC Data  │
│          │                       │           │
├──────────┴───────────────────────┴───────────┤
│ Zoom Orbit Select Measure Section Hide      │
└──────────────────────────────────────────────┘
```

---

# 10. Funcionalidades do Viewer

### MVP

```text
TASK-VIEW-001
Carregar IFC

TASK-VIEW-002
Orbit

TASK-VIEW-003
Zoom

TASK-VIEW-004
Pan

TASK-VIEW-005
Selecionar elemento

TASK-VIEW-006
Highlight do elemento

TASK-VIEW-007
Mostrar propriedades IFC

TASK-VIEW-008
Árvore do modelo

TASK-VIEW-009
Filtrar pavimentos

TASK-VIEW-010
Ocultar elemento

TASK-VIEW-011
Isolar elemento

TASK-VIEW-012
Reset viewer
```

A engine `web-ifc` permite acessar geometria e propriedades do modelo IFC diretamente. :chatgpt-content-reference{index="2"}

---

# 11. Segunda versão do Viewer

Depois:

```text
VIEW-101 Medição de distância

VIEW-102 Medição de área

VIEW-103 Clipping planes

VIEW-104 Exploded view

VIEW-105 Filtro IFC Class

VIEW-106 Filtro por disciplina

VIEW-107 Search elemento

VIEW-108 Transparência

VIEW-109 Colorização por categoria

VIEW-110 Screenshot

VIEW-111 Comentários

VIEW-112 Issues

VIEW-113 BCF
```

---

# 12. Upload IFC

Fluxo correto:

```text
Frontend
   ↓
POST /uploads/request
   ↓
API cria presigned URL
   ↓
Frontend envia IFC diretamente ao S3
   ↓
POST /uploads/complete
   ↓
API cria ModelVersion
   ↓
Job enviado para fila
```

Não:

```text
Browser
   ↓
API
   ↓
S3
```

Porque arquivos IFC podem ficar muito grandes.

---

# 13. Worker IFC

Depois do upload:

```text
IFC RECEIVED
     ↓
VALIDATE
     ↓
READ IFC
     ↓
EXTRACT GEOMETRY
     ↓
EXTRACT PROPERTIES
     ↓
GENERATE FRAGMENTS
     ↓
GENERATE METADATA
     ↓
GENERATE THUMBNAIL
     ↓
UPLOAD RESULTS
     ↓
STATUS = READY
```

---

# 14. Estados do processamento

```text
UPLOADING

UPLOADED

QUEUED

PROCESSING

OPTIMIZING

READY

FAILED
```

No frontend:

```text
Processando modelo...

████████████░░ 82%
```

---

# 15. API

Estrutura inicial:

```text
POST   /auth/register

POST   /auth/login

GET    /projects

POST   /projects

GET    /projects/:id

PATCH  /projects/:id

DELETE /projects/:id
```

Modelos:

```text
GET  /projects/:id/models

POST /projects/:id/models

GET  /models/:id

DELETE /models/:id
```

Upload:

```text
POST /uploads/presigned-url

POST /uploads/complete
```

Viewer:

```text
GET /models/:id/viewer

GET /models/:id/properties

GET /models/:id/tree
```

---

# 16. Infraestrutura local

Docker Compose:

```text
PostgreSQL
Redis
MinIO
API
Worker
Frontend
```

Portas:

```text
web        3000

api        4000

postgres   5432

redis      6379

minio      9000
```

---

# 17. Ambientes

Teremos:

```text
LOCAL
DEV
STAGING
PRODUCTION
```

Domínios:

```text
localhost

dev.app.com

staging.app.com

app.com
```

API:

```text
api.dev.app.com

api.staging.app.com

api.app.com
```

---

# 18. CI/CD

GitHub:

```text
developer
   ↓
git push
   ↓
Pull Request
   ↓
lint
   ↓
typecheck
   ↓
unit tests
   ↓
build
   ↓
security scan
   ↓
merge
   ↓
deploy staging
   ↓
approval
   ↓
production
```

---

# 19. Backlog completo inicial

## EPIC 01 — Fundação

```text
[ ] TASK-001 Criar repositório

[ ] TASK-002 Criar monorepo

[ ] TASK-003 Configurar pnpm

[ ] TASK-004 Configurar TypeScript

[ ] TASK-005 Configurar ESLint

[ ] TASK-006 Configurar Prettier

[ ] TASK-007 Criar Next.js

[ ] TASK-008 Criar API NestJS

[ ] TASK-009 Criar worker

[ ] TASK-010 Criar Docker Compose

[ ] TASK-011 Configurar PostgreSQL

[ ] TASK-012 Configurar Redis

[ ] TASK-013 Configurar MinIO

[ ] TASK-014 Configurar .env

[ ] TASK-015 Criar CI GitHub
```

---

# 20. EPIC 02 — Autenticação

```text
[ ] AUTH-001 User schema

[ ] AUTH-002 Register

[ ] AUTH-003 Login

[ ] AUTH-004 Logout

[ ] AUTH-005 Refresh token

[ ] AUTH-006 Reset senha

[ ] AUTH-007 Verificação email

[ ] AUTH-008 RBAC

[ ] AUTH-009 Middleware auth
```

---

# 21. EPIC 03 — Projetos

```text
[ ] PROJECT-001 Criar projeto

[ ] PROJECT-002 Listar projetos

[ ] PROJECT-003 Abrir projeto

[ ] PROJECT-004 Editar projeto

[ ] PROJECT-005 Arquivar projeto

[ ] PROJECT-006 Deletar projeto

[ ] PROJECT-007 Project permissions

[ ] PROJECT-008 Project members
```

---

# 22. EPIC 04 — Arquivos

```text
[ ] FILE-001 Upload IFC

[ ] FILE-002 Presigned URL

[ ] FILE-003 Validação extensão

[ ] FILE-004 Validação MIME

[ ] FILE-005 Validação tamanho

[ ] FILE-006 Checksum

[ ] FILE-007 Registro arquivo

[ ] FILE-008 Download privado
```

---

# 23. EPIC 05 — IFC

```text
[ ] IFC-001 Instalar web-ifc

[ ] IFC-002 Abrir IFC

[ ] IFC-003 Extrair geometria

[ ] IFC-004 Extrair GlobalId

[ ] IFC-005 Extrair IFC Class

[ ] IFC-006 Extrair propriedades

[ ] IFC-007 Extrair storeys

[ ] IFC-008 Extrair spatial tree

[ ] IFC-009 Gerar fragments

[ ] IFC-010 Salvar resultado

[ ] IFC-011 Tratamento erros

[ ] IFC-012 Logs processamento
```

---

# 24. EPIC 06 — Viewer

```text
[ ] VIEW-001 Cena Three.js

[ ] VIEW-002 Camera

[ ] VIEW-003 Controls

[ ] VIEW-004 Lights

[ ] VIEW-005 Grid

[ ] VIEW-006 Carregar modelo

[ ] VIEW-007 Selection

[ ] VIEW-008 Highlight

[ ] VIEW-009 Properties panel

[ ] VIEW-010 Model tree

[ ] VIEW-011 Hide

[ ] VIEW-012 Show

[ ] VIEW-013 Isolate

[ ] VIEW-014 Fit model

[ ] VIEW-015 Floor selector
```

---

# 25. EPIC 07 — Produção

```text
[ ] INFRA-001 AWS Account

[ ] INFRA-002 VPC

[ ] INFRA-003 PostgreSQL RDS

[ ] INFRA-004 S3

[ ] INFRA-005 Redis

[ ] INFRA-006 ECS Cluster

[ ] INFRA-007 API Container

[ ] INFRA-008 Worker Container

[ ] INFRA-009 CloudFront

[ ] INFRA-010 Route53

[ ] INFRA-011 SSL

[ ] INFRA-012 Secrets Manager

[ ] INFRA-013 Backup

[ ] INFRA-014 Monitoring

[ ] INFRA-015 Sentry

[ ] INFRA-016 CloudWatch

[ ] INFRA-017 Alerts
```

---

# 26. Segurança

Antes de produção:

```text
[ ] arquivos S3 privados

[ ] presigned URLs

[ ] HTTPS obrigatório

[ ] rate limiting

[ ] CORS configurado

[ ] CSP

[ ] proteção CSRF

[ ] input validation

[ ] malware scanning

[ ] limite de upload

[ ] logs auditoria

[ ] backup banco

[ ] criptografia banco

[ ] criptografia storage

[ ] secrets fora do código
```

---

# 27. Testes

Criar:

```text
Unit Tests

Integration Tests

API Tests

Viewer Tests

IFC Regression Tests

E2E Tests
```

Muito importante no BIM:

manter uma pasta:

```text
/tests/ifc/
```

com:

```text
small-house.ifc

building.ifc

structural.ifc

mep.ifc

large-building.ifc

broken.ifc
```

O próprio projeto `web-ifc` utiliza modelos para regression testing, o que é uma boa prática que devemos reproduzir no nosso pipeline. :chatgpt-content-reference{index="3"}

---

# 28. MVP que eu colocaria em produção

Não tentaria reproduzir tudo do Augin inicialmente.

A **V1 deve fazer muito bem apenas isto**:

```text
Login

↓

// criar projeto

↓

// enviar IFC

↓

// processar

↓

// abrir modelo

↓

// navegar no 3D

↓

// clicar em objeto

↓

// consultar propriedades

↓

// navegar na árvore IFC
```

Se isso estiver sólido, você já tem um **produto BIM utilizável**.

---

# 29. Roadmap

### V0.1

```text
IFC Viewer local
```

### V0.2

```text
Projetos + Upload
```

### V0.3

```text
Processamento backend
```

### V0.4

```text
Viewer completo
```

### V0.5

```text
Compartilhamento
```

### V1.0

```text
PRODUÇÃO
```

Depois:

### V1.1

```text
Measure
Sections
Filters
```

### V1.2

```text
Issues
Comments
BCF
```

### V1.3

```text
Federated Models
```

### V2

```text
iPhone
```

### V2.1

```text
AR
```

---

# 30. Preparação para iPhone

Desde já eu deixaria:

```text
API independente

Storage independente

Modelo processado independente

Auth baseada em API

Project API

Model API
```

Assim:

```text
             ┌── WEB
             │
API ─────────┤
             │
             └── iPHONE
```

No iOS, a camada futura pode usar **RealityKit + ARKit**. A Apple mantém RealityKit como framework de renderização 3D/AR integrado ao ARKit; o ARKit fornece tracking, entendimento do ambiente e anchors para posicionar conteúdo digital no espaço físico. :chatgpt-content-reference{index="4"}

---

# 31. Como eu montaria o board do projeto

Crie estas colunas:

```text
BACKLOG

READY

IN PROGRESS

CODE REVIEW

TESTING

READY FOR PROD

DONE
```

Labels:

```text
frontend

backend

bim

viewer

infrastructure

database

security

bug

feature

critical
```

Prioridade:

```text
P0 Critical

P1 High

P2 Medium

P3 Low
```

---

# 32. Primeiro Sprint

Eu começaria exatamente assim:

### Sprint 01 — Fundação

```text
TASK-001
Criar repositório

TASK-002
Criar monorepo

TASK-003
Criar Next.js

TASK-004
Criar API NestJS

TASK-005
Criar PostgreSQL

TASK-006
Criar Prisma

TASK-007
Criar Redis

TASK-008
Criar MinIO

TASK-009
Criar Docker Compose

TASK-010
Criar autenticação básica

TASK-011
Criar Project CRUD

TASK-012
Criar tela Dashboard
```

**Resultado do Sprint:**

```text
LOGIN
  ↓
DASHBOARD
  ↓
CRIAR PROJETO
```

---

# 33. Sprint 02

```text
Upload IFC

S3/MinIO

ModelVersion

Queue

Worker

web-ifc

status processamento
```

Resultado:

```text
PROJETO
   ↓
UPLOAD IFC
   ↓
PROCESSANDO
   ↓
READY
```

---

# 34. Sprint 03 — onde o produto começa a ficar interessante

```text
Viewer

Three.js

That Open

Model loading

Orbit

Zoom

Selection

Properties

Tree
```

Resultado:

> **Você sobe seu projeto IFC e consegue entrar dentro dele pelo navegador.**

É o primeiro marco que eu considero realmente comparável ao núcleo funcional do Augin.

---

## Próxima ação

Eu recomendo que você trate esta estrutura como **Projeto BIM/AR Platform** e abra um repositório GitHub específico.

Como o GitHub ainda não está conectado a mim nesta conversa, você pode conectar a integração sugerida acima. A partir daí eu consigo trabalhar com você também na estrutura do repositório, issues e organização técnica diretamente no fluxo do projeto.

E o próximo entregável que eu faria é ainda mais operacional: **criar o projeto-base completo**, incluindo `docker-compose.yml`, estrutura de pastas, `package.json`, banco Prisma, Next.js, NestJS, Redis, MinIO e o primeiro IFC Viewer. Isso transforma este plano em **código executável**.


Perfeito. Então eu mudaria a estrutura para ficar **100% orientada ao GitHub `HicaroDev/Gilardi3d` + Vercel**, sem criar infraestrutura AWS desnecessária agora.

Não consegui inspecionar o conteúdo atual do repositório diretamente porque ele não ficou acessível publicamente pela busca nesta conversa. Se você conectar o GitHub sugerido anteriormente, consigo trabalhar diretamente com a estrutura do repositório, issues e branches. Mesmo assim, já dá para definir a arquitetura correta.

## Arquitetura recomendada do Gilardi3d

```text
GitHub
HicaroDev/Gilardi3d
        │
        │ push / pull request
        ▼
      VERCEL
        │
        ├── Next.js
        ├── Frontend React
        ├── API Routes
        └── Server Actions
              │
              ├──────────────► Neon PostgreSQL
              │
              ├──────────────► Vercel Blob
              │
              └──────────────► Worker BIM
                                    │
                                    ▼
                              IFC Processing
                                    │
                                    ▼
                              Modelo otimizado
```

### Minha stack definitiva para V1

| Camada | Tecnologia |
|---|---|
| Framework | Next.js |
| Linguagem | TypeScript |
| UI | Tailwind CSS |
| BIM Viewer | That Open Components |
| IFC Engine | web-ifc |
| 3D | Three.js |
| Banco | Neon PostgreSQL |
| ORM | Prisma |
| Storage | Vercel Blob |
| Auth | Auth.js |
| Deploy | Vercel |
| Repositório | GitHub |
| Erros | Sentry |
| Analytics | Vercel Analytics |

O Neon é atualmente uma integração Postgres nativa disponível no Marketplace da Vercel. :chatgpt-content-reference{index="0"}

---

# Estrutura do repositório

Para essa primeira versão, eu **não faria vários serviços separados**. Um único projeto Next.js deixa o desenvolvimento muito mais simples.

```text
Gilardi3d/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── settings/
│   │   │   └── profile/
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── models/
│   │   │   ├── upload/
│   │   │   └── processing/
│   │   │
│   │   ├── viewer/
│   │   │   └── [modelId]/
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   └── viewer/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── models/
│   │   ├── upload/
│   │   └── bim/
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── blob.ts
│   │   ├── permissions.ts
│   │   └── validation.ts
│   │
│   ├── server/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── actions/
│   │
│   ├── viewer/
│   │   ├── engine/
│   │   ├── loaders/
│   │   ├── tools/
│   │   └── state/
│   │
│   └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   ├── icons/
│   └── wasm/
│
├── tests/
│   ├── e2e/
│   ├── unit/
│   └── ifc/
│
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── api/
│
├── scripts/
│
├── .github/
│   └── workflows/
│
├── .env.example
├── next.config.ts
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

# O ponto crítico: IFC não deve passar pela API da Vercel

Isso precisa ficar definido desde já.

A Vercel limita o payload enviado para Functions a **4,5 MB**. A própria documentação recomenda upload direto do navegador para storage para arquivos grandes. :chatgpt-content-reference{index="1"}

Portanto:

```text
ERRADO

IFC
 ↓
Next API
 ↓
Blob
```

O correto:

```text
IFC
 ↓
Browser
 ↓
Vercel Blob
```

A API participa apenas autorizando a operação.

A Vercel Blob atualmente suporta upload multipart de arquivos muito grandes, inclusive na escala de terabytes. :chatgpt-content-reference{index="2"}

---

# Fluxo real do upload

```text
Usuário escolhe:

edificio.ifc

        ↓

Gilardi3d solicita autorização

        ↓

POST /api/upload

        ↓

gera token/upload URL

        ↓

Browser ───────────► Vercel Blob

        ↓

Upload concluído

        ↓

Gilardi3d recebe URL

        ↓

cria ModelVersion

        ↓

status:

UPLOADED
```

Também conseguimos mostrar:

```text
Uploading edificio.ifc

████████████████░░░ 84%
```

porque o Blob oferece callback de progresso de upload. :chatgpt-content-reference{index="3"}

---

# Banco de dados

No Neon:

```text
User

Organization

OrganizationMember

Project

ProjectMember

BimModel

ModelVersion

File

ProcessingJob

Share

AuditLog
```

## Estrutura

```text
User
 │
 ▼
Organization
 │
 ▼
Project
 │
 ├──── ProjectMember
 │
 ▼
BimModel
 │
 ▼
ModelVersion
 │
 ├── source IFC
 ├── processed model
 └── metadata
```

---

# Status do modelo

Use desde o início:

```text
CREATED

UPLOADING

UPLOADED

QUEUED

PROCESSING

READY

FAILED

ARCHIVED
```

---

# Dashboard

Primeira tela depois do login:

```text
┌──────────────────────────────────────────────┐
│ GILARDI 3D                     Hicaro ▼      │
├─────────────┬────────────────────────────────┤
│ Dashboard   │                                │
│ Projects    │       MEUS PROJETOS            │
│ Shared      │                                │
│ Settings    │  + Novo projeto                │
│             │                                │
│             │  ┌────────┐ ┌────────┐         │
│             │  │ Casa A │ │ Predio │         │
│             │  │ READY  │ │PROCESS │         │
│             │  └────────┘ └────────┘         │
└─────────────┴────────────────────────────────┘
```

---

# Tela de projeto

```text
Projeto: Residence Bellinzona

Arquivos / modelos
──────────────────────────────

Arquitetura.ifc        READY
Estrutura.ifc          READY
MEP.ifc                PROCESSING

+ Upload IFC

[ ABRIR MODELO 3D ]
```

---

# Viewer

Estrutura principal:

```text
┌─────────────────────────────────────────────────────────┐
│ Gilardi3D │ Projeto │ Arquitetura       Share   User   │
├──────────────┬─────────────────────────┬────────────────┤
│ MODEL TREE   │                         │ PROPERTIES     │
│              │                         │                │
│ Site         │                         │ IFCWALL        │
│ Building     │       3D VIEWER         │                │
│ Floor 01     │                         │ GlobalId       │
│ Floor 02     │                         │ Type           │
│ Walls        │                         │ Material       │
│ Doors        │                         │ Level          │
│ Windows      │                         │                │
├──────────────┴─────────────────────────┴────────────────┤
│ Select | Hide | Isolate | Fit | Section | Measure      │
└─────────────────────────────────────────────────────────┘
```

---

# Estrutura interna do Viewer

```text
src/viewer/

engine/
    scene.ts
    camera.ts
    renderer.ts
    world.ts

loaders/
    ifc-loader.ts
    fragment-loader.ts

tools/
    selection.ts
    highlighter.ts
    visibility.ts
    isolate.ts
    clipping.ts
    measurement.ts

state/
    viewer-store.ts
```

---

# Organização das TASKS no GitHub

Agora eu faria o GitHub Project com estes épicos.

## EPIC 01 — FOUNDATION

```text
G3D-001 Initial Next.js setup
G3D-002 TypeScript strict mode
G3D-003 Tailwind setup
G3D-004 ESLint
G3D-005 Prettier
G3D-006 Environment validation
G3D-007 Vercel project
G3D-008 Preview deployments
G3D-009 Production domain
```

## EPIC 02 — DATABASE

```text
G3D-010 Create Neon database
G3D-011 Install Prisma
G3D-012 User schema
G3D-013 Organization schema
G3D-014 Project schema
G3D-015 BIM Model schema
G3D-016 Model Version schema
G3D-017 Files schema
G3D-018 Processing Job schema
G3D-019 Audit schema
G3D-020 Initial migration
```

## EPIC 03 — AUTH

```text
G3D-021 Auth.js setup
G3D-022 Login
G3D-023 Registration
G3D-024 Logout
G3D-025 Password recovery
G3D-026 Session protection
G3D-027 Protected dashboard
```

## EPIC 04 — PROJECTS

```text
G3D-030 Project list
G3D-031 Create project
G3D-032 Project details
G3D-033 Rename project
G3D-034 Archive project
G3D-035 Delete project
G3D-036 Project permissions
```

## EPIC 05 — STORAGE

```text
G3D-040 Vercel Blob integration
G3D-041 Client upload
G3D-042 Multipart upload
G3D-043 Upload progress
G3D-044 IFC validation
G3D-045 File size validation
G3D-046 Save file metadata
G3D-047 Signed downloads
```

---

# EPIC 06 — BIM CORE

Aqui começa o coração do produto.

```text
G3D-050 Install web-ifc

G3D-051 Configure WASM

G3D-052 Load IFC locally

G3D-053 Read IFC schema

G3D-054 Extract IFC entities

G3D-055 Extract properties

G3D-056 Extract spatial tree

G3D-057 Extract storeys

G3D-058 Extract geometry

G3D-059 Error handling

G3D-060 IFC test library
```

---

# EPIC 07 — VIEWER

```text
G3D-070 Create viewer page

G3D-071 World

G3D-072 Scene

G3D-073 Camera

G3D-074 Renderer

G3D-075 Grid

G3D-076 IFC loader

G3D-077 Orbit controls

G3D-078 Selection

G3D-079 Highlight

G3D-080 Element properties

G3D-081 Spatial tree

G3D-082 Hide

G3D-083 Show

G3D-084 Isolate

G3D-085 Fit to selection

G3D-086 Floor filter
```

---

# EPIC 08 — VIEWER PRO

Só depois da primeira versão funcionar.

```text
G3D-100 Clipping planes

G3D-101 Measurement

G3D-102 Area measurement

G3D-103 Search elements

G3D-104 IFC class filter

G3D-105 Colorize category

G3D-106 Transparency

G3D-107 Screenshot

G3D-108 Fullscreen
```

---

# EPIC 09 — SHARING

```text
G3D-120 Share project

G3D-121 Share model

G3D-122 Public viewer

G3D-123 Private viewer

G3D-124 Share token

G3D-125 Expiration

G3D-126 QR code
```

---

# EPIC 10 — PRODUCTION

```text
G3D-140 Error monitoring

G3D-141 Analytics

G3D-142 Logging

G3D-143 Database backup

G3D-144 Upload limits

G3D-145 Rate limiting

G3D-146 Security headers

G3D-147 Production env

G3D-148 Production deploy

G3D-149 Smoke tests
```

---

# GitHub labels

Crie:

```text
area:frontend
area:backend
area:bim
area:viewer
area:database
area:storage
area:security
area:infra

type:feature
type:bug
type:refactor
type:test
type:docs

priority:p0
priority:p1
priority:p2
priority:p3
```

---

# GitHub Board

Use:

```text
BACKLOG

READY

IN PROGRESS

CODE REVIEW

TESTING

READY FOR DEPLOY

DONE
```

E milestones:

```text
M0 — Foundation

M1 — Projects

M2 — IFC Upload

M3 — First 3D Model

M4 — BIM Viewer

M5 — Sharing

M6 — Production V1
```

---

# Ordem que eu quero que você siga

Não desenvolver tudo ao mesmo tempo.

### M0

```text
Next
↓
Vercel
↓
Neon
↓
Prisma
↓
Auth
```

### M1

```text
Dashboard
↓
Projects
↓
Project CRUD
```

### M2

```text
Vercel Blob
↓
IFC Upload
↓
ModelVersion
```

### M3

```text
web-ifc
↓
Three.js
↓
That Open
↓
primeiro IFC renderizado
```

Esse é nosso **primeiro grande checkpoint**.

Quando chegarmos aqui:

> `Gilardi3d consegue receber um IFC pela internet e abrir o prédio em 3D.`

Só depois:

```text
properties
tree
hide
isolate
floors
measure
section
sharing
```

---

# Um detalhe importante sobre Vercel e processamento

Hoje Functions Node/Python da Vercel podem executar por até **30 minutos em Pro/Enterprise com Fluid Compute**, então tecnicamente algumas tarefas de processamento poderiam ficar lá. :chatgpt-content-reference{index="4"}

Mas eu **não amarraria o núcleo BIM a isso**.

Começaremos processando IFC no browser quando for adequado:

```text
IFC
↓
web-ifc WASM
↓
browser
↓
viewer
```

Depois, se modelos grandes exigirem processamento dedicado:

```text
Vercel
   │
   └── API
        │
        ▼
   BIM Worker
   Railway / Fly / Render
        │
        ▼
   Vercel Blob
```

Assim não precisamos refazer a aplicação.

---

## Primeiro sprint real do `Gilardi3d`

Eu criaria estas **12 tasks agora**:

```text
G3D-001 Configurar Next.js
G3D-002 Configurar TypeScript strict
G3D-003 Configurar Tailwind
G3D-004 Conectar GitHub → Vercel
G3D-005 Criar Neon PostgreSQL
G3D-006 Configurar Prisma
G3D-007 Criar schema inicial
G3D-008 Configurar Auth.js
G3D-009 Criar Login
G3D-010 Criar Dashboard
G3D-011 Criar CRUD Project
G3D-012 Deploy Preview
```

**Definition of Done do Sprint 01:**

```text
https://gilardi3d.vercel.app

LOGIN
  ↓
DASHBOARD
  ↓
+ NEW PROJECT
  ↓
PROJECT CREATED
```

A partir desse ponto, o **Sprint 02 será Vercel Blob + upload IFC** e o **Sprint 03 será o primeiro viewer BIM funcionando**.

Esse é o caminho que eu seguiria para colocar o **Gilardi3d em produção sem criar uma infraestrutura desnecessariamente complexa agora**.

