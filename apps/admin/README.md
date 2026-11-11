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
- `src/screens/DashboardPage.tsx`, `ValidateCpfPage.tsx`: páginas operacionais.
- `src/screens/PlaceholderPage.tsx`: módulos ainda não implementados.
- `src/screens/dev/`: criação de administradores, auditoria e configurações visuais.
- `app/api/dev/[resource]/route.ts`: proxy Next server-side com allowlist.
- `apps/api/src/dev.controller.ts`: endpoints de DEV com checagem obrigatória de papel no PostgreSQL.

### Ativando o DEV inicial

Defina `SEED_DEV_PASSWORD` no `.env` (mínimo 12 caracteres, exclusiva e aleatória). Não use senha pública de demonstração para DEV. Rode `pnpm db:migrate` e `pnpm db:seed`. O seed cria o usuário `dev` se ainda não existir; em execuções seguintes **não altera** sua senha.

É obrigatório configurar `AUTH_JWT_SECRET` e conexão PostgreSQL antes de subir API. O perfil DEV pode acessar o painel operacional, criar contas ADMIN, consultar auditoria paginada e salvar identidade visual (nome, cores, URLs de logo e favicon). Configurações estão persistidas, mas ainda não são aplicadas automaticamente no Clube e Admin. Upload de arquivos não foi implementado nesta fase.

Os endpoints DEV exigem JWT válido, usuário ativo e papel DEV validado no banco. Contas ADMIN e PARTNER não podem gerenciar DEV, nem criar administradores.

## Identidade visual dinâmica

A tela DEV > Configurações permite editar nome e cores e enviar logo/favicon (PNG, JPEG ou WebP, até 2 MB).
O navegador envia arquivos via `/admin/api/dev/branding/upload/:kind` (proxy Next com cookie HttpOnly). A API Nest autentica **DEV**, decodifica e normaliza para PNG com Sharp, armazena os arquivos em disco e registra `LOGO_UPDATED`/`FAVICON_UPDATED` em AuditLog. Preferências ficam em `SystemSetting.visualIdentity`.

- Dados públicos: `GET /v1/branding` (nome, cores e caminhos das imagens).
- Imagens públicas: `GET /v1/branding/assets/logo` e `/v1/branding/assets/favicon`.
- Clube roteia `/v1/branding/*` para a API local; Admin utiliza o mesmo caminho através da porta 3002.
- Layouts Next buscam as preferências no servidor em cada navegação e aplicam variáveis CSS, título, favicon e logo.
- Quando não houver imagem enviada ou a API estiver indisponível, o layout usa as cores e a marca tipográfica anteriores.

### Persistência da mídia

O diretório padrão é `apps/api/storage/branding`, calculado a partir do `cwd` da API no PM2. Pode ser alterado com `BRAND_ASSET_DIR` no `.env` ou ambiente do processo.

**Crucial:** copie esse diretório no backup junto do PostgreSQL e monte volume persistente quando migrar a API para Docker. O banco armazena metadados e URLs, mas os bytes das imagens ficam em disco. Não apague `apps/api/storage` durante deployments. Em produção, prefira volume dedicado ou storage de objetos com controle de acesso ao upload.

Execute `pnpm install --no-frozen-lockfile` para instalar `sharp` e atualizar o lock, `pnpm build`, e depois `pnpm pm2:restart`. Recarregue Clube e Admin após salvar.

## Rede credenciada (módulo operacional)

- `src/screens/PartnersPage.tsx`: tabela, filtros por situação, formulário modal para criação e edição.
- `src/types/partner.ts`: campos e tipos do cadastro.
- `src/lib/partnersApi.ts`: chamadas HTTP e tratamento de erro.
- `app/api/partners/route.ts` e `app/api/partners/[id]/route.ts`: proxy autenticado para a API Nest.
- `apps/api/src/partners.controller.ts`: validação, autorização DEV/ADMIN, CRUD e auditoria.
- `packages/database/prisma/schema.prisma`: modelo `Partner` ampliado.

O cadastro e a edição são persistidos no PostgreSQL; inativação usa `active=false` para não remover atendimentos históricos. A listagem calcula os atendimentos do mês a partir do banco, sem valores fictícios.

**Primeira execução após atualização:** `pnpm db:migrate` para adicionar os campos. Opcionalmente execute `pnpm db:seed:partners` para cadastrar as quatro unidades das imagens de referência, sem sobrescrever registros existentes. O parceiro de demonstração do seed anterior permanece no banco, podendo ser inativado ou editado pela interface.

Novo parceiro cadastrado e ativo aparecerá na vitrine do Clube após recarregar. A API disponibiliza `GET /v1/partners` apenas com parceiros ativos. Para alteração use as rotas autenticadas `/v1/admin/partners` (ADMIN/DEV). `PARTNER` não tem acesso ao cadastro.

## Tabela de valores (Consultas + Exames)

- `src/screens/CatalogPage.tsx`: listagem, busca, filtros, formulário para cadastrar/editar e situação ativa/inativa.
- `src/types/catalog.ts`: tipos de dados e conversão R$ ↔ centavos.
- `src/lib/catalogApi.ts`: chamadas HTTP administrativas.
- `app/api/catalog/route.ts` e `app/api/catalog/[id]/route.ts`: proxy protegido por sessão.
- `apps/api/src/catalog.controller.ts`: listagem pública, rotas autenticadas DEV/ADMIN e auditoria.
- `packages/database/prisma/schema.prisma`: modelo `CatalogItem`.

### Atualizar banco e importar os documentos

Na raiz do monorepo, após atualizar a branch:
```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed:catalog
pnpm build
pnpm pm2:restart
```

**Importação:** 28 registros de `Valores_Consultas_Quali_Beneficios.docx` e 71 de `VALORES DE EXAMES QUALI BENEFICIOS.pdf` (99 registros). Os documentos foram transcritos para `packages/database/prisma/seed-catalog.ts`. O comando não depende de manter PDF/DOCX na pasta, e não sobrescreve registros já importados que foram modificados pelo Admin.

Preços são guardados em **centavos inteiros**, com valor normal e valor Quali separados. `sourceDocument` e `notes` preservam a proveniência e ressalvas. Itens inativados não aparecem no Clube. Alterações no Admin produzem `AuditLog`.

Observações a revisar: `Eletroneuromiografia 4 membros` consta como R$ 660,00 / R$ 564,00 (percentual diferente da maioria); `Cauterização grande URO` aparece com `R4:630,00` no documento e foi interpretada como R$ 630,00; duas linhas de audiometria combinada não indicam faixa etária. Os valores registrados são os valores textuais dos arquivos, não descontos recalculados. Confira os documentos antes de disponibilizar em produção.

As tabelas de Consultas, Exames, Check-ups e Terapias são exibidas no Clube via `GET /v1/catalog`. O Admin não permite apagar fisicamente os preços nesta etapa; utilize `active=false` para preservar o histórico.

## Paginação da tabela de valores

A tela `src/screens/CatalogPage.tsx` mostra **20 registros por página**, com botões **Anterior** e **Próxima**. A paginação é aplicada ao resultado filtrado; busca, categoria e situação levam o usuário automaticamente à primeira página. O rodapé informa o intervalo e o total de registros encontrados.

## CPF e múltiplos atendimentos dos parceiros

A página `src/screens/ValidateCpfPage.tsx` aplica máscara de CPF `000.000.000-00` durante a digitação, recebe somente os 11 números e envia os dígitos à API para validação. A máscara é visual, não substitui a validação matemática/consulta no backend.

A tela de Rede Credenciada usa o componente isolado `src/components/PartnerModal.tsx`, com cabeçalho e rodapé fixos, corpo rolável, grupos de campos e seleção múltipla pesquisável. O campo `serviceTypes` armazena vários tipos de atendimento, com tags editáveis e validação de pelo menos um tipo. O campo legado `serviceType` continua atualizado com a primeira seleção para compatibilidade com outras integrações.

**Após atualizar a branch:** execute `pnpm db:generate`, `pnpm db:migrate`, `pnpm build` e reinicie a API, Admin e Clube após builds bem-sucedidos. O novo campo `Partner.serviceTypes` usa array PostgreSQL com default `[]`. Registros antigos aparecem pelo tipo legado até serem editados. Não precisa recriar o cadastro ou executar seed de parceiros.
