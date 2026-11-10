# Quali Bispo — Regras técnicas do projeto

- Trabalhar prioritariamente na branch `refactor`; não alterar `main` sem solicitação.
- Preservar a identidade visual original dos sistemas Clube e Admin.
- Manter arquitetura PNPM: `apps/clube`, `apps/admin`, `apps/api`, `packages/contracts`, `packages/database`.
- Usar Prisma ORM **7+**. **Nunca** inserir `url`, `directUrl` ou `shadowDatabaseUrl` no datasource do arquivo `schema.prisma`.
- Configurar o acesso do Prisma CLI ao banco exclusivamente em `packages/database/prisma.config.ts`.
- Para conexão PostgreSQL em runtime, utilizar `@prisma/adapter-pg` com `new PrismaClient({ adapter })`.
- Gerar o cliente com `provider = "prisma-client"` e output explícito. Evitar importar o cliente gerado de `@prisma/client`.
- Não versionar arquivos `.env`, senhas, segredos e credenciais do HTML legado.
- API local: porta 4002 com prefixo `/v1`. Clube: 3002, Admin: `/admin`.
