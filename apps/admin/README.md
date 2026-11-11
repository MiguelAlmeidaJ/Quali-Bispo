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

## Sidebar moderno

O menu administrativo fica em `src/components/Sidebar.tsx`, separado da lógica das páginas. Os ícones usam a biblioteca `react-icons` (coleções Feather e Font Awesome). Alterar um item ou a permissão do menu deve ser feito em `items`, no próprio componente.

- Desktop: botão no cabeçalho do sidebar recolhe/expande o menu; os ícones continuam clicáveis e as opções possuem tooltip ao recolher.
- Celular: botão no topo abre um menu lateral sobreposto, com opção de fechar e overlay.
- O perfil autenticado permanece no rodapé do menu; a saída continua encerrando a sessão.
- Estilos específicos ficam no bloco "Sidebar administrativo" em `app/globals.css`.

Para instalar a nova dependência após `git pull`, rode `pnpm install --no-frozen-lockfile` e gere novamente o build do Admin antes de reiniciar o PM2. Atualize o `pnpm-lock.yaml` com a resolução gerada pelo PNPM.

## Organização das telas e perfil DEV

- `src/components/AdminApp.tsx`: sessão, escolha da tela e layout (sem lógica própria de páginas).
- `src/components/Login.tsx`: login.
- `src/components/Sidebar.tsx`: navegação por papel.
- `src/pages/DashboardPage.tsx`, `ValidateCpfPage.tsx`: páginas operacionais.
- `src/pages/PlaceholderPage.tsx`: módulos ainda não implementados.
- `src/pages/dev/`: criação de administradores, auditoria e configurações visuais.
- `app/api/dev/[resource]/route.ts`: proxy Next server-side com allowlist.
- `apps/api/src/dev.controller.ts`: endpoints de DEV com checagem obrigatória de papel no PostgreSQL.

### Ativando o DEV inicial

Defina `SEED_DEV_PASSWORD` no `.env` (mínimo 12 caracteres, exclusiva e aleatória). Não use senha pública de demonstração para DEV. Rode `pnpm db:migrate` e `pnpm db:seed`. O seed cria o usuário `dev` se ainda não existir; em execuções seguintes **não altera** sua senha.

É obrigatório configurar `AUTH_JWT_SECRET` e conexão PostgreSQL antes de subir API. O perfil DEV pode acessar o painel operacional, criar contas ADMIN, consultar auditoria paginada e salvar identidade visual (nome, cores, URLs de logo e favicon). Configurações estão persistidas, mas ainda não são aplicadas automaticamente no Clube e Admin. Upload de arquivos não foi implementado nesta fase.

Os endpoints DEV exigem JWT válido, usuário ativo e papel DEV validado no banco. Contas ADMIN e PARTNER não podem gerenciar DEV, nem criar administradores.
