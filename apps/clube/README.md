# Clube Quali (Next.js)

## Estrutura

- `app/`: rota pública e estilos globais.
- `src/components/layout/`: Header, Footer, marca temporária e botão WhatsApp.
- `src/components/sections/`: uma seção visual por componente, na ordem da página.
- `src/components/ui/`: componentes visuais pequenos e reutilizáveis.
- `src/config/`: contatos e links externos.
- `src/data/`: catálogo inicial, unidades e perguntas frequentes.

## Manutenção

Edite preços e procedimentos em `src/data/catalog.ts`. Edite telefone/WhatsApp em `src/config/contact.ts`. Para alterar uma seção, modifique somente seu componente. A ordem da página fica em `app/page.tsx`.

**Pendente:** substituir a marca tipográfica temporária pelo PNG oficial, validar equivalência visual pixel a pixel e conectar autenticação da área do associado exclusivamente à API. Não transportar senhas embutidas do HTML antigo para o navegador.

## Identidade visual compartilhada

O layout `app/layout.tsx` consulta `GET /v1/branding` no servidor via `src/lib/branding.ts`. Isso atualiza o nome da página, favicon, logotipo e variáveis de cor sem recompilar a aplicação. As imagens usam os caminhos públicos `/v1/branding/assets/logo` e `/v1/branding/assets/favicon`, roteados via `next.config.mjs` para NestJS. Sem configuração no banco, permanece o visual padrão anterior.

## Rede credenciada dinâmica

O componente `src/components/sections/Partners.tsx` consulta `GET /v1/partners` via rewrite do Next. Somente parceiros ativos são apresentados. A rede passa a ser mantida pelo Admin em `/admin`, sem duplicação em `src/data/catalog.ts`. Se a API estiver indisponível, o componente informa erro sem mostrar dados de exemplo como se fossem reais.

## Tabela de valores compartilhada

`PriceTable.tsx`, `Benefits.tsx` e `Simulator.tsx` obtêm os procedimentos ativos de `GET /v1/catalog`, roteado via `next.config.mjs`. Não há valores de consultas ou exames codificados em `src/data/catalog.ts`. Alterações do Admin aparecem após recarregar a página. A disponibilidade depende da API e da importação inicial do catálogo.

**Nota:** o simulador é uma estimativa baseada na média dos registros ativos e não representa preço final ou garantia de atendimento.

## Lista resumida e tabela completa

A seção de preços da home (`src/components/sections/PriceTable.tsx`) mostra **até 15 procedimentos**, respeitando busca e filtro, com o botão **Ver mais valores** para a rota pública `/valores`. A página completa (`app/valores/page.tsx`) exibe **20 resultados por página** e navegação anterior/próxima. Ambas consultam o catálogo ativo do banco pela API; nenhuma delas duplica os preços.

Os cards de **Benefícios** mostram o valor normal em cinza e riscado e o valor Quali em verde com destaque. Os links do menu e rodapé foram atualizados para funcionar também fora da home.

## Fórmula do simulador anual

Os valores exibidos na seção Simulador vêm dos procedimentos ativos de `GET /v1/catalog`. Os descontos são calculados como a diferença entre preço normal e preço Quali. Para cada modalidade, utiliza-se a média aritmética das economias por atendimento, **excluindo pacotes**:

- **Consultas médicas:** apenas `category=CONSULTA`, multiplicadas pelo uso mensal e por 12.
- **Check-ups:** apenas `category=CHECKUP`, multiplicados pela quantidade anual.
- **Psicologia e nutrição:** apenas `category=TERAPIA` cujo grupo corresponde a Psicologia/Nutrição. Fisioterapia e drenagem linfática ficam fora desta média.
- **Mensalidade anual:** 12 vezes o preço do plano escolhido.

A economia líquida é a soma dessas economias menos as mensalidades. Limites de uso do plano são respeitados no contador de consultas; resultados são estimativas, não garantias de desconto. O simulador e o catálogo público compartilham os preços mantidos no Admin.

Exemplo de validação com os 99 registros originais, plano Familiar e seleções 2 consultas/mês, 1 check-up/ano e 1 terapia/mês: economia bruta de aproximadamente R$ 1.803,05; mensalidades R$ 1.078,80; economia líquida R$ 724,25. Os números variam conforme edições do catálogo.

## Múltiplos tipos da Rede Credenciada

A API agora expõe `serviceTypes: string[]` por parceiro. O site lista os tipos selecionados; para cadastros antigos, usa `serviceType` como fallback. A alteração é feita no Admin > Rede credenciada; o campo requer migração Prisma antes da API atualizada entrar no ar.

## Área do associado (`/associado`)

A home agora autentica associados pelo **CPF válido e pela data de nascimento cadastrada**. A chamada pública `POST /api/associate/session` usa o proxy Next, que solicita `POST /v1/member/login` à API Nest e recebe um JWT restrito ao portal (`issuer=quali-member`, `audience=quali-member-portal`, validade de 2 horas). O JWT fica apenas no cookie HttpOnly `quali_member_session` com SameSite=Lax; nunca vai para o JavaScript do navegador. Logout apaga o cookie. O acesso é limitado por tentativas e falhas não informam qual dado está incorreto.

A API somente autentica um registro `FinanceCustomer` se seu CPF possui hash confiável único (`cpfValid=true`, `cpfConflict=false`) e se `birthDate` corresponde exatamente ao nascimento informado. **A planilha histórica não continha data de nascimento:** clientes importados só conseguirão acessar depois que um ADMIN/DEV preencher esse campo no formulário de edição. O mesmo `CPF_HASH_KEY` da importação deve ser mantido.

A rota `/associado` (não indexável) usa `GET /api/associate/dashboard`, que repassa a autenticação exclusivamente à API e retorna **apenas dados do próprio cadastro**. A experiência inclui cinco abas:

1. **Visão geral:** resumo visual do cadastro, situação do plano, consultas médicas no mês, economia real de atendimentos não cancelados e dados pessoais disponíveis.
2. **Meus benefícios:** informações de categorias e link para a tabela pública atualizada; não informa limites individuais que ainda não estão parametrizados.
3. **Rede parceira:** parceiros ativos existentes na API, com endereço, serviços, desconto e horário disponíveis.
4. **Mensalidades:** valor/situação do plano e pendências vinculadas não resolvidas. Não mostra vencimento futuro ou quitação sem documento real.
5. **Meus atendimentos:** os 100 registros mais recentes e a economia total de todo o histórico não cancelado.

### Limites desta etapa

O banco atual **não possui número de cartão, dependentes, telefone de associado, vencimentos recorrentes estruturados nem comprovantes de recebimentos**. A tela não inventa esses dados; o resumo verde de identificação **não é uma carteirinha oficial**. A geração e o download do PDF da carteirinha, dependentes e segundas vias serão implementados apenas depois de estruturar os respectivos cadastros e regras de negócio. O campo `createdAt` indica data de registro no sistema, não necessariamente adesão original. Nenhuma linha fictícia do print de referência foi importada.

### Implantação

```powershell
git checkout refactor
git pull origin refactor
pnpm --filter @quali/api build
pnpm --filter @quali/clube build
# somente se ambos compilarem:
pnpm exec pm2 restart quali-api
pnpm exec pm2 restart quali-clube
```

Não há migração Prisma nesta etapa. Antes de testar, preencha a data de nascimento de um cliente cuja situação/cadastro estejam corretos. Teste CPF+nascimento corretos e incorretos, sessão expirada, logout, isolamento entre dois clientes e a visibilidade de dados financeiros. **Para operação pública com dados pessoais sensíveis, acrescentar segundo fator por código de uso único (OTP), rate limiting compartilhado no banco/Redis e monitoramento de tentativas.** A proteção atual é uma primeira implementação e não substitui essa etapa de endurecimento.

## Cartões emitidos e familiares

O portal autenticado do associado agora exibe o número do titular (quando emitido), os números individuais de dependentes já cadastrados e os benefícios registrados para o tipo de cartão selecionado no Admin. A emissão é feita pelo back-end na criação/edição do cliente; usuários sem CPF confiável e nascimento confirmado permanecem com cartão pendente. A área continua sem geração de PDF oficial; esse recurso exigirá modelo de documento e validações próprias. Os cartões exibem apenas os últimos quatro dígitos do CPF no navegador.

## Logo branca do cartão

O cartão verde na rota `/associado` utiliza `whiteLogoUrl` da identidade visual (imagem `/v1/branding/assets/logo-white`), administrada no painel DEV. O arquivo é convertido para branco com transparência na API e não recebe background/filtro visual. Se o ativo não estiver cadastrado, usa fallback tipográfico branco; o restante da marca do Clube continua com o logo principal. Alterar a imagem em Configurações deve refletir no cartão após recarregar a página, sem recompilar.
