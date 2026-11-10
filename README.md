# Quali Bispo — Refactor

Monorepo PNPM para o Adm Quali, Clube Quali e API compartilhada.

## Estrutura

- `apps/admin`: Next.js em `/admin` (servidor interno 3003).
- `apps/clube`: Next.js com roteamento de `/admin` para o app administrativo (porta 3002).
- `apps/api`: NestJS (porta 4002, prefixo `/v1`).
- `packages/contracts`: contratos Zod.
- `packages/database`: Prisma 7 + adapter PostgreSQL.
- `compose.yaml`: PostgreSQL local.

## Iniciar (Node.js 22+, PNPM 10 e Docker)

No PowerShell, na raiz do projeto:

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm --filter @quali/database validate
pnpm db:migrate
pnpm dev
```

Se `.env` já existir, não substitua suas configurações: apenas confirme que `DATABASE_URL` está correta.

URLs: Clube http://127.0.0.1:3002/ · Admin http://127.0.0.1:3002/admin · API http://127.0.0.1:4002/v1/health

## Convenção obrigatória do Prisma 7

- `packages/database/prisma/schema.prisma`: datasource apenas com `provider = "postgresql"`.
- `packages/database/prisma.config.ts`: a URL para CLI e migrations.
- `packages/database/src/index.ts`: `PrismaPg` + `new PrismaClient({ adapter })`.
- Prisma CLI e `@prisma/client` fixados na mesma versão; cliente gerado em `packages/database/src/generated/prisma/`.

## Estado

Base de infraestrutura inicial. As páginas são provisórias e a migração funcional/visual ainda não foi concluída. HTML legado e credenciais embutidas não foram publicados.
