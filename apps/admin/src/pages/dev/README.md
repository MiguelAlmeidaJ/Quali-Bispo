# Ferramentas exclusivas DEV

- AdminUsersPage.tsx: cria usuários ADMIN no PostgreSQL.
- AuditPage.tsx: consulta eventos de auditoria paginados (sem acesso direto ao banco).
- SettingsPage.tsx: salva metadados de identidade visual (nome, cores e URLs) no PostgreSQL.

A API valida o papel DEV em toda requisição. Apenas ocultar opções do menu não é segurança.

Nesta etapa, URLs e cores são persistidas mas não aplicadas automaticamente ao Clube ou Admin. Upload de imagens, armazenamento de arquivos e gerenciamento avançado de usuários ficam para próxima fase.
