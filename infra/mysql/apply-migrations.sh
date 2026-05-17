#!/bin/sh

set -eu

COMPOSE_FILE="${COMPOSE_FILE:-infra/docker/docker-compose.local.yml}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-${MYSQL_ROOT_PASSWORD:-root}}"
MYSQL_DATABASE="${MYSQL_DATABASE:-wealthtrack}"

if ! docker compose -f "$COMPOSE_FILE" ps mysql >/dev/null 2>&1; then
  echo "MySQL service is not available. Start it with: docker compose -f $COMPOSE_FILE up -d mysql"
  exit 1
fi

echo "Applying WealthTrack migrations to $MYSQL_DATABASE"

for migration in infra/mysql/migrations/*.sql; do
  echo " - $(basename "$migration")"
  docker compose -f "$COMPOSE_FILE" exec -T mysql sh -c \
    "mysql -u\"$MYSQL_USER\" -p\"$MYSQL_PASSWORD\" \"$MYSQL_DATABASE\"" < "$migration"
done

echo "Migration application completed"
