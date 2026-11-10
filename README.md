# Quali Bispo

Sistema Quali Benefícios — modernização do Adm Quali e Clube Quali em um monorepo PNPM.

## Arquitetura planejada

- `apps/admin`: painel administrativo com Next.js.
- `apps/clube`: Clube Quali com Next.js.
- `apps/api`: API NestJS em `/v1`.
- `packages/contracts`: contratos e validação compartilhados.
- `packages/database`: Prisma e PostgreSQL compartilhados.
- Docker Compose para desenvolvimento.

## Desenvolvimento

A implementação será realizada inicialmente na branch [`refactor`](../../tree/refactor), sem alterar a identidade visual dos sistemas atuais.

**Endereços locais planejados:** Clube `http://127.0.0.1:3002/`, Admin `http://127.0.0.1:3002/admin` e API `http://127.0.0.1:4002/v1`.

> Projeto em construção. Não utilizar credenciais demonstrativas ou HTML legado com senhas embutidas em produção.
