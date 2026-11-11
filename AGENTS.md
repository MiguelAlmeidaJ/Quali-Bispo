# Quali Bispo — Regras técnicas do projeto

- Trabalhar prioritariamente na branch `refactor`; não alterar `main` sem solicitação.
- Preservar a identidade visual original dos sistemas Clube e Admin.
- Manter arquitetura PNPM: `apps/clube`, `apps/admin`, `apps/api`, `packages/contracts`, `packages/database`.
- Usar Prisma ORM **7+**. **Nunca** inserir `url`, `directUrl` ou `shadowDatabaseUrl` no datasource do arquivo `schema.prisma`.
- Configurar o acesso do Prisma CLI ao banco exclusivamente em `packages/database/prisma.config.ts`.
- Para conexão PostgreSQL em runtime, utilizar `@prisma/adapter-pg` com `new PrismaClient({ adapter })`.
- Gerar o cliente com `provider = "prisma-client"` e output explícito. Evitar importar o cliente gerado de `@prisma/client`.
- Não versionar arquivos `.env`, senhas, segredos e credenciais do HTML legado.
- API local: porta 4002 com prefixo `/v1`. Clube: 3002, Admin: `/admin`.

- Perfis: DEV (gestão técnica, contas ADMIN, auditoria e identidade visual), ADMIN (operação geral), PARTNER (operações restritas). Conferir permissão na API e consultar estado ativo no banco em cada operação.
- Nunca incluir senha DEV fixa no código; bootstrap DEV apenas via variável de ambiente local e seed, sem sobrescrever senha existente.
- Registros de auditoria não devem conter senhas, JWTs nem dados pessoais em claro.

- Identidade visual: arquivo PNG logo/favicon apenas no backend via endpoint DEV autenticado, limite 2 MB e normalização com Sharp. Não versionar arquivos enviados nem expor diretórios de armazenamento.
- Ambos os frontends devem ler identidade visual da mesma API pública e manter fallback quando a API estiver indisponível.

- Rede credenciada: fonte única no modelo Prisma `Partner` e API Nest. CRUD somente DEV/ADMIN; página pública exibe exclusivamente ativos. Inativar em vez de apagar para preservar histórico. Ações de mudança devem gerar AuditLog.

- Catálogo de serviços: uma fonte da verdade no PostgreSQL (`CatalogItem`), preços armazenados em centavos; alterações apenas DEV/ADMIN, logs de auditoria, inativação em vez de exclusão física.
- As listas do Clube e o simulador devem consumir a API pública. Não duplicar valores em componentes ou constantes estáticas.
- Seed `pnpm db:seed:catalog` importa os 99 registros dos documentos de consultas e exames, preservando correções já realizadas via Admin.

- Para a Rede Credenciada, `Partner.serviceTypes` é o conjunto de tipos oferecidos; `serviceType` é legado e deve refletir a primeira seleção. Conservar ambos enquanto houver consumidores antigos, aceitar fallback de registros pré-migração, validar lista na API.
- CPF: aplicar máscara apenas no frontend, enviar 11 dígitos para a API e preservar checagem do dígito verificador no backend.
