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

## Clientes e pendências importados do controle financeiro

O menu **Clientes** exibe os registros financeiros de `FinanceCustomer`, e **Inadimplência** mostra as ocorrências de `FinanceIssue`. Há busca, filtros, paginação de 20 linhas, atualização auditada de situação e opção de marcar pendências como resolvidas. Os dados são privados e acessíveis apenas a ADMIN/DEV via API Nest. Os indicadores financeiros aparecem no Dashboard em cartões separados dos indicadores de associados.

### Importar a planilha privada (somente no computador local)

1. Baixe o arquivo `quali_importacao_financeira_privada.json` gerado a partir do Excel anexado à conversa.
2. Crie a pasta `private` na raiz do monorepo e coloque o JSON lá. **Não faça commit nem envie esse JSON ao GitHub.** A pasta `private/` está no `.gitignore`.
3. Confira no `.env` a URL do banco correto e o `CPF_HASH_KEY` já utilizado pelo sistema. **Não altere esse segredo** depois da importação, pois isso impediria comparações futuras de CPF.
4. Execute:
```powershell
pnpm db:generate
pnpm db:migrate
pnpm build
pnpm db:import:financeiro private/quali_importacao_financeira_privada.json
```
5. Reinicie API e Admin **somente se o build e a importação concluírem sem erros**.

O importador lê JSON exclusivamente do disco local, registra 160 linhas da aba **Controle Geral** e 21 ocorrências da aba **Pendências**. Ele utiliza chaves estáveis por aba+linha; a execução repetida não duplica entradas e não altera status que você editou pelo Admin. 15 pendências possuem correspondência exata e não ambígua com clientes; as outras 6 ficam sem vínculo para revisão. **Não fazemos associação por aproximação.**

### Confidencialidade e integridade

CPF original é usado apenas em memória para calcular HMAC-SHA256 com `CPF_HASH_KEY`; o banco guarda o hash e somente os últimos quatro dígitos. CPF com dígitos inválidos, ausente ou repetido não recebe hash e exige revisão. A planilha possui 18 linhas afetadas por esses casos. Nenhum CPF puro é enviado ao GitHub, mostrado pela API ou gravado no AuditLog.

O importador mantém os status originais em `rawStatus` e classifica: Pago, Em aberto, Previsto, Pendente, Tratativa, Aguardando ou Sem informação. Os valores monetários são guardados como centavos; detalhes e datas são preservados. Os registros financeiros **não são automaticamente considerados beneficiários ativos** nem habilitam acesso por CPF até uma etapa de verificação de vínculo/documentos.

Os valores mostrados na aba Resumo do Excel podem ter fórmulas ou cache desatualizados; as contagens usadas pelo sistema são calculadas a partir das linhas importadas no PostgreSQL.

Depois de importar, guarde o Excel/JSON privado em um local protegido e considere apagar o JSON temporário, quando houver backup adequado do PostgreSQL.

## Cadastro e edição de clientes

As páginas administrativas de clientes são rotas reais do Next.js com `basePath=/admin`:

- `/admin/cliente/novo` — formulário de novo cliente;
- `/admin/cliente/:id/edit` — carregamento por UUID para edição do cadastro existente;
- menu **Clientes** — botão **Novo cliente** e ação **Editar** em cada linha.

Componentes: `src/screens/CustomerFormPage.tsx` e `src/types/customer.ts`. Os campos são `NF, Nome, CPF, Data de nascimento, Unidade, Tipo de cartão, Valor do plano, Forma de pagamento, Status e Detalhes`. `birthDate` é opcional e exige nova migração do Prisma. O cadastro do cliente não implica ativar o benefício automaticamente.

Endpoints Nest com autorização ADMIN/DEV: `POST /v1/admin/finance/customers`, `GET /v1/admin/finance/customers/:id` e `PATCH /v1/admin/finance/customers/:id`. Proxy BFF existente em `app/api/finance/`. O PATCH preserva a alteração rápida de status da tabela.

**Privacidade:** o CPF é verificado com dígitos validadores e guardado apenas como HMAC-SHA256 com `CPF_HASH_KEY` e últimos 4 dígitos. Ao editar, o campo CPF fica vazio; deixá-lo vazio mantém o anterior, preencher substitui após validação. O CPF completo não é recuperável nem exibido. As mudanças registram somente campos alterados na auditoria, sem valores pessoais sensíveis.

Após atualizar: `pnpm db:generate`, `pnpm db:migrate`, `pnpm build`, depois reiniciar API e Admin. Não é necessário executar novamente o seed/importador da planilha.

## Vínculo do cliente com a Rede Credenciada

O campo **Unidade** de Novo Cliente/Editar Cliente agora é um seletor alimentado por `GET /admin/api/partners`. Para novos clientes é obrigatório escolher uma unidade ativa da rede; a API valida a existência e situação da unidade e grava seu **ID** em `FinanceCustomer.partnerId` (relação Prisma com `Partner`). É possível editar o vínculo posteriormente; unidades inativas não podem receber novos vínculos, mas vínculos antigos podem permanecer.

O texto `FinanceCustomer.unit` originalmente importado da planilha **não é descartado**. Se o cliente foi importado e ainda não possui `partnerId`, a tela de edição mostra o valor textual histórico e solicita escolha manual da unidade correspondente. Nenhum vínculo é feito automaticamente por semelhança de nomes; uma edição sem vínculo preexistente pode salvar outros dados sem forçar uma escolha. A listagem prefere o nome da unidade vinculada e usa o texto importado quando ainda não houver associação.

O aviso visual de campos obrigatórios usa `span.customer-field-title` para manter o asterisco na mesma linha da legenda. Alterar o modelo exige `pnpm db:generate` e `pnpm db:migrate` antes de gerar os builds de API/Admin. Não é necessário repetir a importação financeira; os valores antigos ficam preservados.

## Vincular em lote as unidades da planilha

Após importar os clientes e criar as unidades na Rede Credenciada, execute **na raiz do repositório**:

```powershell
pnpm db:vincular:unidades
```

Por padrão, o comando **simula** e mostra quantos cadastros possuem correspondência exata (ignorando apenas acentos, espaços duplicados e maiúsculas/minúsculas) nos quatro nomes aprovados:

- `Largo da Batalha` → `Unidade Largo da Batalha`
- `Mutua` (também `Mutuá`) → `Unidade Mutuá`
- `Venda da Cruz` → `Unidade Venda da Cruz`
- `Vila Lage` → `Unidade Vila Lage`

Se o resumo estiver correto e as quatro unidades de destino existirem uma vez cada no banco, confirme:

```powershell
pnpm db:vincular:unidades --apply
```

O comando atualiza apenas `FinanceCustomer.partnerId IS NULL`, nunca substitui vínculos existentes nem modifica o campo `unit` original, CPF, pagamentos ou pendências. Clientes com unidade vazia ou fora dessas quatro correspondências ficam para revisão. Cada grupo alterado gera um `AuditLog` com quantidade, sem dados pessoais. Executar novamente é seguro: registros já vinculados são ignorados.

**Não é necessária migração, seed ou reimportação do Excel.** O comando atualiza diretamente o banco configurado por `DATABASE_URL`; confira o ambiente antes de usar `--apply`. Atualize a página Clientes após concluído. Execute `pnpm db:generate` apenas se seu Prisma Client estiver desatualizado.
