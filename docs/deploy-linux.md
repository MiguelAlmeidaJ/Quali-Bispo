# Migração Quali Bispo: Windows → servidor Linux

> Objetivo: copiar o PostgreSQL **existente** com usuários, credenciados, clientes, cartões,
> dependentes, auditoria, catálogo e atendimentos. Sem seed e sem reimportar planilhas.
> Este procedimento exige acesso SSH ao Linux. O backup contém dados pessoais/CPF (LGPD).

## Topologia do repositório

- Banco: **PostgreSQL 17 Alpine**, container `postgres` em `compose.yaml`,
  mapeado **somente em 127.0.0.1:3435** do host (ou `POSTGRES_PORT`).
- Nest API: porta **4002**. A API escuta em `0.0.0.0`, mas o firewall deve
  impedir acesso público. O Next Clube a consulta por `127.0.0.1`.
- Admin: **3003**, preso ao loopback, com `basePath=/admin`.
- Clube: **3002**, preso ao loopback, com rewrite de `/admin` para **3003**
  e `/v1/...` para **4002**. Proxy HTTPS público aponta somente para **3002**.
- PM2: `ecosystem.config.cjs`. Sempre iniciar os 3 serviços com **mesmo usuário Linux**.

O "Linux Manager" precisa oferecer terminal SSH, Node.js 22+, Docker Engine/Compose,
Git, PNPM 10 e PM2. Se for um painel gerenciado, confirme as permissões de Docker/SSH;
o procedimento abaixo pressupõe um Ubuntu/Debian com controle do servidor.

## 1. Preparar a origem Windows (PowerShell)

Na raiz `C:\Projetos\Quali-Bispo`:

```powershell
git checkout refactor
git pull origin refactor
docker compose -f compose.yaml ps
pnpm db:generate
# opcional: verificar migrações locais
pnpm --filter @quali/database exec prisma migrate status

# Backup custom comprimido: arquivo binário, sem pipe de bytes pelo PowerShell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-windows.ps1
```

Os arquivos serão gerados em `backups/`:

- `quali-AAAAMMDD-HHMMSS.dump`: estrutura, dados, índices e migrações Prisma;
- `quali-AAAAMMDD-HHMMSS.dump.sha256`: verificação de integridade;
- `branding-AAAAMMDD-HHMMSS.zip`: logos/favicon da API (se houver).

O script usa `docker exec ... pg_dump -Fc` dentro do contêiner e `docker cp` para
evitar **corrupção de backups binários por redirecionamento do PowerShell 5.1**.
Verifica o índice com `pg_restore --list` antes de copiar.

**Não versionar backups!** Guarde os arquivos em disco local seguro e em cópia
criptografada separada. **Não enviar por WhatsApp, e-mail aberto ou ao GitHub.**

### Informações que não estão no dump

O banco **não** contém a senha do PostgreSQL nem todas as chaves da aplicação.
O arquivo `.env` é **separado do dump**. Preserve, pelo menos:
`CPF_HASH_KEY` **exatamente igual**, `DATABASE_URL` (com a senha correta),
`POSTGRES_PASSWORD`, `AUTH_JWT_SECRET`, `INTERNAL_API_URL`, `COOKIE_SECURE`,
`CORS_ORIGINS` e, se houver, `BRAND_ASSET_DIR`.
O `CPF_HASH_KEY` é indispensável para reconhecer CPFs existentes.
`AUTH_JWT_SECRET` pode ser renovado no Linux, mas isso expira sessões antigas.
Nunca publique esses valores. **Não execute `db:seed` depois de restaurar.**

### Verificações antes do envio

Registre os totais da origem para comparar após restaurar:

```powershell
docker compose -f compose.yaml exec -T postgres psql -U quali -d quali -c 'SELECT COUNT(*) AS clientes FROM "FinanceCustomer";'
docker compose -f compose.yaml exec -T postgres psql -U quali -d quali -c 'SELECT COUNT(*) AS parceiros FROM "Partner";'
docker compose -f compose.yaml exec -T postgres psql -U quali -d quali -c 'SELECT COUNT(*) AS atendimentos FROM "FinanceAttendance";'
docker compose -f compose.yaml exec -T postgres psql -U quali -d quali -c 'SELECT COUNT(*) AS usuarios FROM "User";'
```

Caso o sistema local continue recebendo cadastros após o dump, esses novos
registros **não irão para o Linux**. No corte definitivo, suspenda as escritas,
faça um **novo dump final**, restaure esse último arquivo e só então mude o DNS.

## 2. Preparar o Linux (exemplo Ubuntu/Debian com SSH)

Instale Docker Engine + Docker Compose plugin, Git, Node.js 22+,
Corepack/PNPM e um proxy HTTPS (Nginx). Consulte as instruções oficiais
da distribuição para instalação e firewall.

```bash
node --version   # 22 ou superior
docker --version
docker compose version
git --version
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm --version
```

Use uma conta não-root dedicada à aplicação e habilitada para executar o Docker
com autorização apropriada. **Acesso ao grupo docker equivale a privilégios altos**.

```bash
sudo mkdir -p /opt/quali-bispo
sudo chown "$USER":"$USER" /opt/quali-bispo
git clone --branch refactor https://github.com/MiguelAlmeidaJ/Quali-Bispo.git /opt/quali-bispo
cd /opt/quali-bispo
pnpm install --frozen-lockfile
```

A URL acima exige acesso ao repositório (chave SSH/token apropriado caso privado).

Transfira o `.env` **por SCP/SSH seguro** ou preencha-o diretamente no Linux.
Exemplo, **no Windows**:

```powershell
scp .env usuario@IP_DO_SERVIDOR:/opt/quali-bispo/.env
scp backups/quali-AAAAMMDD-HHMMSS.dump usuario@IP_DO_SERVIDOR:/opt/quali-bispo/
scp backups/quali-AAAAMMDD-HHMMSS.dump.sha256 usuario@IP_DO_SERVIDOR:/opt/quali-bispo/
scp backups/branding-AAAAMMDD-HHMMSS.zip usuario@IP_DO_SERVIDOR:/opt/quali-bispo/
```

No servidor:

```bash
cd /opt/quali-bispo
chmod 600 .env quali-*.dump*
# Ajuste .env, SEM alterar CPF_HASH_KEY:
# DATABASE_URL=postgresql://quali:<senha codificada para URL>@127.0.0.1:3435/quali?schema=public
# POSTGRES_PASSWORD=<mesma senha do usuário postgres do Compose>
# INTERNAL_API_URL=http://127.0.0.1:4002/v1
# CORS_ORIGINS=https://SEU_DOMINIO
# COOKIE_SECURE=true  (somente se o acesso público for HTTPS)
```

**Segredo no .env:** não copie exemplos com `quali_dev_only` para produção.
Se trocar a senha do PostgreSQL, atualize `DATABASE_URL` e faça a troca real
no usuário do banco; `POSTGRES_PASSWORD` sozinho não altera a senha de um
volume que já existe.

## 3. Restaurar no PostgreSQL vazio

**Nunca restaure em um banco contendo dados que devam ser mantidos.**
O script interrompe a operação se encontrar tabelas no schema `public`.
Ele usa o mesmo `compose.yaml` e versão PostgreSQL 17.

```bash
cd /opt/quali-bispo
bash scripts/restore-linux.sh /opt/quali-bispo/quali-AAAAMMDD-HHMMSS.dump
```

O script compara o SHA256, valida o arquivo usando `pg_restore --list`,
e faz `pg_restore --single-transaction --exit-on-error` sem proprietário/ACL
para o banco criado pelo Compose. Se a restauração falhar, corrija
o problema **antes** de iniciar API/Next. Não use `pg_restore --clean` sem
planejamento e backup prévio.

Para restaurar as imagens, se existir o ZIP:

```bash
sudo apt-get install -y unzip
unzip -l /opt/quali-bispo/branding-AAAAMMDD-HHMMSS.zip
# Confira os caminhos do ZIP antes de extrair:
unzip /opt/quali-bispo/branding-AAAAMMDD-HHMMSS.zip -d /opt/quali-bispo/apps/api/storage/
# Se o ZIP contiver o diretório "branding", o destino será apps/api/storage/branding/
```

Se `BRAND_ASSET_DIR` for personalizado, restaure nesse caminho ao invés do padrão.
Permita leitura/escrita apenas ao usuário da API. A configuração visual no banco
aponta para os arquivos, mas **os PNG são armazenados fora do PostgreSQL**.

## 4. Build e iniciar os serviços

```bash
cd /opt/quali-bispo
pnpm db:generate
# Confira se as migrações usadas no Windows estão versionadas e reconhecidas:
pnpm --filter @quali/database exec prisma migrate status
# Em produção somente 'migrate deploy' quando novas migrações versionadas forem necessárias.
# Não executar 'prisma migrate dev' nem db:seed na base restaurada.
pnpm build
```

Se o build terminar sem erros:

```bash
pnpm exec pm2 start ecosystem.config.cjs --update-env
pnpm exec pm2 status
curl -fsS http://127.0.0.1:4002/v1/health
curl -I http://127.0.0.1:3002/
curl -I http://127.0.0.1:3002/admin
pnpm exec pm2 save
pnpm exec pm2 startup
# Siga a instrução emitida pelo PM2, com o usuário correto.
```

Verifique também `pnpm exec pm2 logs`. Não abra as portas 3003, 4002 ou
3435 no firewall. Deixe 3002 privada no loopback e publique somente 80/443
via proxy reverso (Nginx ou proxy do Linux Manager), com certificado TLS.

Exemplo Nginx (troque o domínio real e configure certificado via seu painel/ACME):

```nginx
server {
    listen 80;
    server_name quali.exemplo.com;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilite HTTPS **antes** de colocar dados pessoais em produção;
com HTTPS, faça redirecionamento HTTP → HTTPS e mantenha o cookie seguro.
Não exponha o admin em outra porta pública; ele já está em `/admin`.

## 5. Critérios para considerar a migração concluída

1. Comparar os totais de clientes, parceiros, usuários, cartões e atendimentos
   com os valores registrados no Windows **no momento do último dump**.
2. Conferir senha e login de DEV, ADMIN e um parceiro, e escopo da própria unidade.
3. Validar CPF existente, inclusive um cliente criado recentemente.
4. Conferir número de cartão, dependentes, preços, atendimentos e pendências.
5. Conferir logo principal, logo branca e favicon após restaurar os arquivos.
6. Verificar que **nenhuma operação** no Linux continua gravando no banco Windows.
7. Acompanhar logs, proteger firewall/SSL e configurar backup recorrente do banco
   e da pasta de imagens, com retenção e teste periódico de restauração.

Mantenha o dump original **intacto e offline** até o sistema Linux ser validado.
