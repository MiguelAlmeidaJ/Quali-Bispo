# Quali Bispo — Refactor

Base inicial do monorepo PNPM para o Adm Quali, Clube Quali e API compartilhada.

## Estrutura

- `apps/admin`: Next.js com basePath `/admin` (servidor interno 3003).
- `apps/clube`: Next.js com roteamento de `/admin` para o app administrativo (porta 3002).
- `apps/api`: NestJS (porta 4002, prefixo `/v1`).
- `packages/contracts`: schemas compartilhados com Zod.
- `packages/database`: modelo inicial Prisma/PostgreSQL.
- `compose.yaml`: PostgreSQL local.

## Início

Requer Node.js, PNPM e Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm dev
```

Clube: http://127.0.0.1:3002/ · Admin: http://127.0.0.1:3002/admin · API: http://127.0.0.1:4002/v1/health

## Situação

Esta é somente a base estrutural, não a migração funcional. Páginas provisórias foram adicionadas. O HTML legado original e suas senhas embutidas **não foram incluídos** no repositório público. A migração deve preservar identidade visual, implementar autenticação no servidor e consolidar as regras na API antes de qualquer implantação em produção.
