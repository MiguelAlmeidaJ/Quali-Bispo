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

## Validação de CPF unificada e Atendimentos

O endpoint `POST /v1/admin/validate-cpf` agora consulta **Beneficiary** e **FinanceCustomer** pelo hash HMAC do CPF (a mesma chave `CPF_HASH_KEY` da importação). A resposta separa:
- **found**: CPF presente em um cadastro confiável;
- **eligible**: autorização de uso do benefício; no cadastro financeiro, somente `PAID` e CPF válido/sem conflito liberam acesso. `OPEN`, `PENDING` e outros status são localizados mas **não liberados**;
- **source**: `finance` ou `beneficiary`.

Clientes cujos CPFs não receberam hash por inconsistências da planilha precisam corrigir o CPF no formulário de edição; não são encontrados por lookup até essa revisão. CPFs completos nunca são retornados. A seção **Últimas validações** consulta até 15 registros recentes da auditoria (para Parceiro, somente os próprios).

O módulo `Atendimentos` usa `FinanceAttendance`, modelo separado de `Attendance` legado (vinculado apenas a `Beneficiary`). Os registros têm FK para `FinanceCustomer`, `Partner`, `CatalogItem` e `User`. Preços normal/Quali, tipo e nome do serviço são **congelados** na data do lançamento, de modo que alterações posteriores da Tabela de valores não modificam o histórico. A API fornece:
- `GET /v1/admin/attendances` com mês, parceiro, tipo, busca por nome e paginação de 20, além de totais sobre todos os registros filtrados;
- `GET /v1/admin/attendances/options` para parceiros e procedimentos ativos;
- `GET /v1/admin/attendances/customers?q=...` para pesquisar clientes pelo nome, exibindo apenas CPF final e situação;
- `POST /v1/admin/attendances` para registrar atendimento autorizado;
- `PATCH /v1/admin/attendances/:id/void` para cancelar logicamente, preservando histórico e auditoria (ADMIN/DEV apenas).

Parceiros autenticados só veem e lançam atendimentos da própria unidade vinculada no usuário; não podem cancelar. ADMIN/DEV acessam toda a rede. Os lançamentos só são permitidos a clientes financeiros com status `PAID` e CPF confiável (válido, sem duplicidade). Um cliente pode usar uma unidade diferente daquela de seu cadastro, conforme disponibilidade do parceiro.

Na tela Admin > Atendimentos: filtros por mês/tipo/parceiro/nome, resultados por página, novo lançamento, cancelamento administrativo com motivo e exportação CSV respeitando filtros (máximo de 4.000 registros por exportação). Painel e Rede Credenciada contam somente lançamentos reais não cancelados. Os atendimentos históricos da imagem do antigo sistema **não são importados automaticamente**; o módulo começa vazio até registrar ou migrar dados reais.

### Implantação
```powershell
git pull origin refactor
pnpm db:generate
pnpm db:migrate
pnpm build
# após confirmar êxito:
pnpm exec pm2 restart quali-api
pnpm exec pm2 restart quali-admin
```
Não é necessário executar novamente a importação de clientes. Mantenha a mesma `CPF_HASH_KEY` que foi utilizada na importação. Teste consulta de CPF existente pago, CPF com situação não paga, CPF duplicado, criação e cancelamento de atendimento, restrição do parceiro e exportação.

## Relatórios operacionais (CSV)

A tela **Relatórios** usa `src/screens/ReportsPage.tsx` e apresenta seis exportações conectadas ao banco PostgreSQL, com contagens atuais obtidas em `GET /v1/admin/reports/summary?month=AAAA-MM`. Cada botão baixa o CSV diretamente, sem buscar milhares de registros no navegador.

- **Base de clientes:** todos os `FinanceCustomer`, NF, nome, CPF apenas com 4 últimos dígitos, unidade, plano, valor, pagamento e situação.
- **Atendimentos:** `FinanceAttendance` não cancelados no mês selecionado, com preço histórico, valor cobrado, economia, parceiro e operador.
- **Uso de consultas:** quantidade mensal de `FinanceAttendance` do tipo `CONSULTA` agrupada por cliente; 3 consultas é **referência ilustrativa** da tela legada, não é uma regra de bloqueio ou limite legal aplicado por esta exportação.
- **Inadimplentes:** `FinanceCustomer` cujo status atual é `OPEN`, `PENDING`, `IN_REVIEW` ou `AWAITING`; não inclui `EXPECTED` (Previsto).
- **Validações de CPF:** `AuditLog` com `CPF_LOOKUP`, resultado, elegibilidade, origem, operador e data; **nunca exporta CPFs completos**.
- **Atualizações para Pago:** eventos auditados `FINANCE_CUSTOMER_STATUS_UPDATED` com mudança para `PAID`. **Isso não é um extrato de pagamento**, pois não existe atualmente modelo de recebimentos/baixas financeiras. O rótulo foi alterado intencionalmente para não declarar pagamentos que não estão comprovados pelo sistema.

API: `apps/api/src/reports.controller.ts`; BFF Next: `app/api/reports/summary/route.ts` e `app/api/reports/export/[kind]/route.ts`. Apenas `DEV` e `ADMIN` podem consultar e exportar; `PARTNER` recebe 403. CSVs são `UTF-8 BOM`, delimitados por ponto e vírgula e com neutralização de fórmulas. Limite de 20.000 registros por exportação. Sem dados simulados nem mudança de esquema Prisma.

### Instalação

```powershell
git checkout refactor
git pull origin refactor
pnpm --filter @quali/api build
pnpm --filter @quali/admin build
# se ambos passarem:
pnpm exec pm2 restart quali-api
pnpm exec pm2 restart quali-admin
```

Não exige `pnpm db:migrate`, seed nem nova importação de clientes. Verifique a página Relatórios com sessão ADMIN/DEV, mês corrente, arquivo CSV importado no Excel, contagens, mês sem atendimentos e tentativa de acesso com perfil PARTNER.

## Cartões e dependentes — Individual / Familiar

A opção **Cartões** do menu Admin usa `src/screens/CardsPage.tsx` para criar e editar os tipos de cartão, com **nome**, **mensalidade**, **benefícios por linha**, **ativo/inativo** e composição: Individual (somente titular) ou Familiar (titular + até 3 dependentes). Os tipos são mantidos no PostgreSQL por `CardPlan` e acessados apenas pelos papéis ADMIN e DEV.

Em **Clientes → Novo/Editar**, o campo `Tipo de cartão` é um seletor de `CardPlan`. Ao selecionar, exibe benefícios e preenche automaticamente a mensalidade `priceCents`. A API também toma o preço e o nome **diretamente do plano** (não confia em valores enviados pelo navegador). Clientes legados preservam o plano e o preço histórico até a seleção do novo tipo.

Se o cartão permite dependentes, o formulário habilita a inclusão de até três pessoas com nome, CPF e data de nascimento. Cada dependente é registrado em `CardDependent` com hash HMAC-SHA256 do CPF, últimos 4 dígitos e número de cartão exclusivo. Dependentes existentes continuam vinculados; omiti-los na edição não os exclui. Uma troca de plano que não comporte os dependentes existentes é rejeitada. Excluir ou reemitir cartões exigirá fluxo próprio para preservar histórico.

### Numeração oficial do sistema

A sequência de **12 dígitos** é `AAMM AACC NNNN`:

- `AA`: dois últimos dígitos do ano em que o titular foi criado no sistema;
- `MM`: mês de criação do titular;
- `AA` (segunda parte): dois últimos dígitos do ano de nascimento de cada pessoa;
- `CC`: dois últimos dígitos do CPF daquela pessoa;
- `NNNN`: contador **global, crescente** de 0001 até 9999, reservado atomicamente na mesma transação da emissão.

Exemplo: cadastro em novembro de 2026, nascimento em 2001, CPF terminado em 62 e primeira emissão → `2611 0162 0001`. Um dependente recebe o próximo número global de série conforme seu próprio nascimento e CPF. `cardNumber` é único no banco e não é recalculado depois de emitido. Alterar CPF ou nascimento após a emissão requer processo administrativo controlado de reemissão (bloqueado nesta etapa). Quando faltar nascimento ou CPF confiável no cliente importado, o cartão fica pendente até conferência e correção.

Os números não são documento governamental nem equivalem a comprovantes de cobertura; o acesso e a elegibilidade continuam dependentes das regras financeiras. A nova sequência suporta 9999 emissões; antes de atingir esse volume será necessário expandir o esquema de serialização.

### Implantação (exige migração Prisma)

```powershell
git checkout refactor
git pull origin refactor
pnpm db:generate
pnpm db:migrate
pnpm build
# após builds concluídos:
pnpm exec pm2 restart quali-api
pnpm exec pm2 restart quali-admin
pnpm exec pm2 restart quali-clube
```

Depois, em Admin → Cartões, cadastre os planos oficiais (preços e benefícios). Somente então selecione-os no cadastro dos clientes. A migração preserva os clientes e CPF/hash já existentes. Não é necessário reimportar planilha. **Não execute seed de clientes novamente.**

Verifique: dois cartões com tipos diferentes, seleção automática de preço, zero/até 3 dependentes, CPF duplicado, criação/edição de titular, número de 12 dígitos, edição de cliente histórico sem data de nascimento, e visibilidade de cartão/dependentes na área do associado. O código e a migração ainda precisam de build/teste no Windows.

## Logo branca do cartão do associado

Em **Configurações do sistema → Arquivos da marca** (somente perfil DEV), há um terceiro campo: **Logo branca do cartão**. Envie um PNG ou WebP com fundo realmente **transparente** (até 2 MB). A API converte os pixels visíveis da arte para branco puro, preserva o canal alpha e rejeita imagens opacas, evitando o retângulo branco no cartão verde.

O ativo é independente da logo colorida usada nos menus, do favicon e das cores. Ele é persistido no diretório `BRAND_ASSET_DIR` como `logo-white.png`, com URL pública `/v1/branding/assets/logo-white`. A configuração `whiteLogoUrl` é armazenada no JSON de identidade visual já existente, com auditoria `WHITE_LOGO_UPDATED`; não requer migração Prisma. O Clube seleciona essa imagem na área do associado somente quando estiver cadastrada. Antes do upload, mantém a marca branca tipográfica como fallback sem o quadro branco.

Para atualizar essa funcionalidade, faça build de **API, Admin e Clube**, e reinicie os três serviços após os builds. Em seguida, faça o upload no perfil DEV e atualize a página `/associado`. Não há necessidade de rebuild a cada troca posterior de logo.
