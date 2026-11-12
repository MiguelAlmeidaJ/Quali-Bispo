#!/usr/bin/env bash
# Restaura SOMENTE em um PostgreSQL Quali novo/vazio, sem apagar dados existentes.
# Uso: bash scripts/restore-linux.sh /caminho/backup/quali-AAAAMMDD-HHMMSS.dump
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Uso: bash scripts/restore-linux.sh /caminho/arquivo.dump" >&2
  exit 2
fi
SOURCE="$(realpath "$1")"
echo "Verificando SHA256..."
if [[ -f "${SOURCE}.sha256" ]]; then
  ( cd "$(dirname "$SOURCE")" && sha256sum --check "$(basename "$SOURCE").sha256" )
else
  echo "AVISO: arquivo .sha256 ausente; confirme integridade por outro canal." >&2
fi
if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente. Configure-o antes de restaurar (incluindo CPF_HASH_KEY)." >&2
  exit 2
fi
docker compose -f compose.yaml up -d postgres
CONTAINER="$(docker compose -f compose.yaml ps -q postgres)"
if [[ -z "$CONTAINER" ]]; then echo "Container PostgreSQL indisponível." >&2;exit 2;fi
echo "Aguardando PostgreSQL ficar pronto..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U quali -d quali >/dev/null 2>&1; then break;fi
  sleep 2
done
docker exec "$CONTAINER" pg_isready -U quali -d quali
# Não sobrescreve um banco já restaurado / inicializado.
EXISTING="$(docker exec "$CONTAINER" psql -U quali -d quali -tAc "SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';")"
if [[ ! "$EXISTING" =~ ^[0-9]+$ ]]; then echo "Não foi possível conferir tabelas existentes." >&2;exit 1;fi
if (( EXISTING > 0 )); then
  echo "ABORTADO: banco de destino já contém $EXISTING tabela(s). Não será sobrescrito." >&2
  exit 1
fi
REMOTE="/tmp/quali-restore-$$.dump"
trap 'docker exec "$CONTAINER" rm -f "$REMOTE" >/dev/null 2>&1 || true' EXIT
docker cp "$SOURCE" "${CONTAINER}:$REMOTE"
docker exec "$CONTAINER" pg_restore --list "$REMOTE" >/dev/null
echo "Restaurando dados, esquema, usuários e auditoria da aplicação..."
docker exec "$CONTAINER" pg_restore -U quali -d quali --no-owner --no-acl --exit-on-error --single-transaction "$REMOTE"
echo "Conferindo registros básicos:"
docker exec "$CONTAINER" psql -U quali -d quali -c 'SELECT COUNT(*) AS clientes FROM "FinanceCustomer";'
docker exec "$CONTAINER" psql -U quali -d quali -c 'SELECT COUNT(*) AS parceiros FROM "Partner";'
docker exec "$CONTAINER" psql -U quali -d quali -c 'SELECT COUNT(*) AS atendimentos FROM "FinanceAttendance";'
docker exec "$CONTAINER" psql -U quali -d quali -c 'SELECT COUNT(*) AS usuarios FROM "User";'
echo "RESTAURAÇÃO CONCLUÍDA. Confira os números antes de iniciar a aplicação."
