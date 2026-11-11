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
