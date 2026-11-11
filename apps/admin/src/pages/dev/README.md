# Ferramentas exclusivas DEV

- AdminUsersPage.tsx: cria usuários ADMIN no PostgreSQL.
- AuditPage.tsx: consulta eventos de auditoria paginados (sem acesso direto ao banco).
- SettingsPage.tsx: salva metadados de identidade visual (nome, cores e URLs) no PostgreSQL.

A API valida o papel DEV em toda requisição. Apenas ocultar opções do menu não é segurança.

Nesta etapa, Cores, nome, logo e favicon são aplicados pelo layout Next no Clube e Admin após recarregar a página. Upload é privado do perfil DEV, imagens públicas servidas pela API e arquivos salvos no diretório persistente da API. Gestão avançada de usuários fica para próxima fase.
