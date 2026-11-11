# Adm Quali — Next.js + API + PostgreSQL

## Arquivos
- `app/page.tsx`: rota de entrada.
- `src/components/AdminApp.tsx`: login, navegação, dashboard e consulta CPF (a ser subdividido nas próximas iterações).
- `app/globals.css`: identidade visual de referência.
- `app/api/session/route.ts`: autenticação por servidor intermediário, cookie HttpOnly.
- `app/api/dashboard/route.ts`: KPIs reais consultados da API.
- `app/api/validate-cpf/route.ts`: validação por API, sem acesso direto ao PostgreSQL no navegador.

## Preparar banco e usuários (somente ambiente local)
1. Na raiz, copie `.env.example` para `.env` se ainda não existir.
2. Adicione segredos **diferentes** e aleatórios com no mínimo 32 caracteres às variáveis `AUTH_JWT_SECRET` e `CPF_HASH_KEY`.
3. Informe `SEED_ADMIN_PASSWORD` e `SEED_PARTNER_PASSWORD` no `.env` local. Não publique as senhas.
4. Execute `pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm db:seed` e `pnpm build`.
5. Inicie/reinicie PM2 e acesse `http://127.0.0.1:3002/admin`.

Os usuários `admin` e `parceiro` são cadastrados ou atualizados pelo seed com hash bcrypt. Não há credenciais fixas no código ou no banco versionado. Senhas de demonstração devem ser trocadas antes de expor o servidor publicamente.

**Situação:** painel, login e validação CPF conectados à API; os módulos adicionais estão identificados mas ainda sem fluxo CRUD implementado. O histórico de CPF e o detalhamento dos indicadores serão completados depois. A validação só encontra beneficiários cujo CPF já tenha um `cpfHash` HMAC cadastrado no banco.
