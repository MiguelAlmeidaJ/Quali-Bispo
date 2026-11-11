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

## Rodar os serviços com PM2

PM2 gerencia os três processos Node.js, enquanto o PostgreSQL permanece no Docker. O `apps/admin` roda internamente na porta 3003 e é acessado externamente em `http://127.0.0.1:3002/admin`.

Após instalar as dependências, inicializar o banco e criar as migrations:

```powershell
git pull origin refactor
pnpm install
docker compose up -d
pnpm db:generate
pnpm build
pnpm pm2:start
pnpm pm2:status
```

Em caso de erro durante o build, **não inicie o PM2**; corrija o build antes. Ver logs de todos os serviços: `pnpm pm2:logs`, sair do modo logs com Ctrl+C. Ver somente a API: `pnpm exec pm2 logs quali-api`.

Comandos de gerenciamento:

```powershell
pnpm pm2:restart
pnpm pm2:stop
pnpm pm2:delete
pnpm pm2:save
```

O PM2 usa `ecosystem.config.cjs`, inicia Next.js em modo `start` (sem hot reload) e a API a partir do JavaScript compilado. Depois de mudanças de código, rode `pnpm build` novamente e `pnpm pm2:restart`.

**Importante:** `pnpm pm2:save` apenas salva a lista de processos. Para reiniciar no boot de Linux, use `pnpm exec pm2 startup` e siga as instruções exibidas. No **Windows**, `pm2 startup` não oferece suporte nativo; configure uma tarefa no Agendador de Tarefas para executar `pnpm exec pm2 resurrect` na inicialização, com o usuário e diretório corretos, se precisar dessa funcionalidade. Não habilite processos PM2 de desenvolvimento simultaneamente com `pnpm dev`, pois utilizam as mesmas portas.

## Convenção obrigatória do Prisma 7

- `packages/database/prisma/schema.prisma`: datasource apenas com `provider = "postgresql"`.
- `packages/database/prisma.config.ts`: a URL para CLI e migrations.
- `packages/database/src/index.ts`: `PrismaPg` + `new PrismaClient({ adapter })`.
- Prisma CLI e `@prisma/client` fixados na mesma versão; cliente gerado em `packages/database/src/generated/prisma/`.

## Estado

Base de infraestrutura inicial. As páginas são provisórias e a migração funcional/visual ainda não foi concluída. HTML legado e credenciais embutidas não foram publicados.
