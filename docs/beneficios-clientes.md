# Benefícios, dependentes e revisão dos clientes — 12/11/2026

## Atualização cadastral enviada pelo financeiro

A planilha entregue contém **160 clientes**, dos quais **58 têm nascimento preenchido**
e **102 estão sem nascimento**. Há CPFs duplicados, portanto **não importamos datas pelo nome sozinho**.

O arquivo **privado**, entregue separadamente ao responsável, contém **52 linhas com CPF de
11 dígitos não repetido na planilha e data de nascimento**. Ele NÃO pertence ao GitHub:
copie-o do chat para `private/quali_nascimentos_atualizados.json` na raiz do projeto.

O script `packages/database/prisma/import-birthdates.ts` usa o **mesmo CPF_HASH_KEY
do banco existente**, busca o cadastro pelo hash e exige CPF confiável + nome normalizado
idêntico. Só preenche `birthDate` quando ela está **vazia**; nunca sobrescreve nascimento
já salvo, não altera números de cartão ou status e não duplica clientes. Registros com
conflito ou sem match são contabilizados e permanecem para revisão na interface.

### Executar no Windows, com backup anterior

```powershell
cd C:\Projetos\Quali-Bispo
git checkout refactor
git pull origin refactor

# FAÇA backup da base antes de aplicar qualquer migração:
powershell -ExecutionPolicy Bypass -File .\scripts\backup-windows.ps1

pnpm install
pnpm db:generate
pnpm build

# Aplica a migration versionada do ciclo de benefícios.
pnpm --filter @quali/database exec prisma migrate deploy

# Primeiro apenas simular, sem alterar registros:
pnpm db:import:nascimentos private/quali_nascimentos_atualizados.json

# Leia as contagens, confira possíveis conflitos e então execute:
pnpm db:import:nascimentos private/quali_nascimentos_atualizados.json --apply
```

**Se houver falha em build ou migração, não rode o importador nem reinicie PM2.**
Não executar `db:seed` nem reimportar o controle financeiro original.
O arquivo JSON contém CPF completo e nome, então é dado pessoal sujeito à LGPD;
`private/` está no `.gitignore`. Não faça commit nem envie a terceiros.

## Cadastro de cliente (Admin → Clientes)

- O tipo de cartão é um **select**. A mensalidade é definida exclusivamente
  pelo cartão escolhido no banco, sem campo de edição do preço no formulário.
- Removemos a lista de benefícios e o atalho de gestão de cartões desta tela.
- Plano Familiar suporta **até três dependentes** com nome, CPF e nascimento;
  cada dependente tem numeração de cartão independente.
- Na saída do campo CPF, a API verifica se existe **benefício ativo** com aquele
  CPF. Se sim, bloqueia o novo cadastro. CPF de benefício cancelado pode entrar
  em novo vínculo; o registro antigo não é apagado. A API verifica novamente no
  salvamento.
- O CPF completo nunca é devolvido pelas respostas do banco às páginas de clientes;
  apenas últimos dígitos de confirmação.

## Cancelamento do benefício

Na edição de cliente, use **Cancelar benefício da família**. A ação solicita
motivo e confirmação e grava auditoria, timestamp e motivo no banco.
Ela desativa o benefício do titular e dos seus dependentes, **sem apagar
cadastros, cartões, atendimentos ou histórico financeiro**. A situação financeira
`PAID`/pendências permanece inalterada.

Para reativar, clique em **Reativar benefício da família**. A API verifica CPFs
colidentes em outros benefícios ativos; se houver, não reativa até a equipe
resolver o conflito. Usuários que já possuíam sessão ativa também ficam
bloqueados em novas consultas de dados e no download da carteirinha.

## De-para visual: Admin → De-para de clientes

Fila de até 20 registros por página para clientes com benefício não cancelado e
alguma informação essencial ausente:

- CPF inválido/repetido;
- Data de nascimento ausente;
- Unidade credenciada sem vínculo;
- Tipo de cartão não selecionado;
- Número do cartão ainda não emitido.

Cada linha possui **Corrigir cadastro**. A lista é recalculada no PostgreSQL
e o cliente desaparece dela automaticamente quando todas as condições passam.
Os registros cancelados ficam consultáveis na tela de Clientes, e não são
misturados às pendências de regularização ativa.

## Dependentes na Área do Associado

CPF + nascimento de dependente podem autenticar com JWT exclusivo do portal
(`purpose=dependent`) e obter **sua própria identificação digital e PDF**
com a inscrição “Dependente”, além de benefícios e rede parceira.
Dados financeiros do titular, mensalidades e atendimentos da família não são
expostos nessa sessão.

**Segurança pública:** CPF + nascimento é uma autenticação inicial. Antes de
colocar o portal em produção com dados pessoais, implementar segundo fator
OTP, limitação de tentativas compartilhada/persistente e auditoria de acessos.
A implementação atual preserva o bloqueio do benefício, mas não dispensa
esse endurecimento.

### Testes de aceitação

- Salvar 3 dependentes e rejeitar o quarto;
- Bloquear CPF já ativo, tanto no cliente quanto no dependente;
- Criar vínculo novo quando o anterior está cancelado e bloquear a
  reativação conflitante;
- Cancelar titular e verificar que dependentes não conseguem entrar;
- Reativar e confirmar que os números de cartão continuam os mesmos;
- Baixar PDF de dependente sem expor financeiro do titular;
- Corrigir CPF/nascimento/unidade/cartão e conferir saída automática do De-para;
- Aplicar o JSON com `--apply` duas vezes sem sobrescrever dados.
