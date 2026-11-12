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

## Executar com PM2 (build de produção)

O PM2 gerencia três processos: `quali-api` (4002), `quali-admin` (3003, interna) e `quali-clube` (3002). O PostgreSQL continua no Docker.

No PowerShell, dentro da raiz do repositório:

```powershell
git pull origin refactor
pnpm install
docker compose up -d
pnpm db:generate
pnpm build
pnpm pm2:start
pnpm pm2:status
```

Não inicie os serviços antes de corrigir qualquer erro do `pnpm build`. Em especial, páginas do frontend ainda são provisórias.

Comandos úteis:

```powershell
pnpm pm2:logs
pnpm exec pm2 logs quali-api
pnpm pm2:restart
pnpm pm2:stop
pnpm pm2:delete
pnpm pm2:save
```

Após alterações de código, rode `pnpm build` e `pnpm pm2:restart`. PM2 executa Next com `next start` e Nest com `node dist/main.js` (sem hot reload), portanto não execute `pnpm dev` ao mesmo tempo: as portas entram em conflito.

Para reiniciar processos após reboot do Linux, use `pnpm exec pm2 startup`, siga as instruções e então `pnpm pm2:save`. No Windows, `pm2 startup` não tem suporte nativo; se precisar de inicialização automática, utilize o Agendador de Tarefas para chamar `pnpm exec pm2 resurrect` com as permissões e o diretório corretos.

## Convenção obrigatória do Prisma 7

- `packages/database/prisma/schema.prisma`: datasource apenas com `provider = "postgresql"`.
- `packages/database/prisma.config.ts`: a URL para CLI e migrations.
- `packages/database/src/index.ts`: `PrismaPg` + `new PrismaClient({ adapter })`.
- Prisma CLI e `@prisma/client` fixados na mesma versão; cliente gerado em `packages/database/src/generated/prisma/`.

## Estado

Base de infraestrutura inicial. As páginas são provisórias e a migração funcional/visual ainda não foi concluída. HTML legado e credenciais embutidas não foram publicados.

## Migrar a base Windows para servidor Linux

O procedimento de dump PostgreSQL 17, transferência por SSH, restauração segura,
arquivos de identidade visual, preservação de `CPF_HASH_KEY`, build, PM2 e HTTPS
está em [docs/deploy-linux.md](docs/deploy-linux.md).

**No Windows:** `powershell -ExecutionPolicy Bypass -File .\\scripts\\backup-windows.ps1`.

**No Linux (banco novo/vazio):** `bash scripts/restore-linux.sh /caminho/quali-AAAAMMDD-HHMMSS.dump`.

Não use `db:seed` nem `prisma migrate dev` no banco restaurado. Não envie
dumps nem `.env` ao GitHub; o .gitignore exclui arquivos sensíveis.
