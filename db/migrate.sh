#!/usr/bin/env bash
set -euo pipefail

HOST="${POSTGRES_HOST:-db}"
DB="${POSTGRES_DB}"
USER="${POSTGRES_USER}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

# Commande psql de base (tableau = pas de problème de quoting)
psql_base=(psql -v ON_ERROR_STOP=1 -h "$HOST" -U "$USER" -d "$DB")

# Attendre Postgres
until "${psql_base[@]}" -c "SELECT 1" >/dev/null 2>&1; do
  echo "waiting for postgres…"
  sleep 2
done

restore_if_empty() {
  local n_tables
  n_tables="$("${psql_base[@]}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
  if [[ "${n_tables:-0}" != "0" ]]; then
    echo "restore_if_empty: public schema not empty (${n_tables} table(s)) -> skip restore"
    return
  fi

  local file="${BACKUP_FILE:-}"
  if [[ -z "$file" ]]; then
    file="$(ls -1t /backups/* 2>/dev/null | head -n1 || true)"
  fi
  if [[ -z "$file" || ! -f "$file" ]]; then
    echo "restore_if_empty: no backup file found -> skip"
    return
  fi

  echo "restore_if_empty: restoring from $file ..."
  if [[ "$file" == *.dump || "$file" == *.dump.gz ]]; then
    if [[ "$file" == *.gz ]]; then
      gunzip -c "$file" | pg_restore --no-owner --no-privileges -h "$HOST" -U "$USER" -d "$DB"
    else
      pg_restore --no-owner --no-privileges -h "$HOST" -U "$USER" -d "$DB" "$file"
    fi
  else
    if [[ "$file" == *.gz ]]; then
      gunzip -c "$file" | "${psql_base[@]}"
    else
      "${psql_base[@]}" -f "$file"
    fi
  fi
  echo "restore_if_empty: done."
}

if [[ "${RESTORE_ON_EMPTY:-0}" == "1" ]]; then
  restore_if_empty
fi

# Table de migrations
"${psql_base[@]}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);"

shopt -s nullglob
for f in /migrations/*.sql; do
  base="$(basename "$f")"
  sum="$(md5sum "$f" | awk '{print $1}')"

  exists="$("${psql_base[@]}" -t -A -c "SELECT checksum FROM schema_migrations WHERE filename='${base}'" || true)"

  if [[ "$exists" == "$sum" ]]; then
    echo "skip $base (already applied)"
    continue
  fi

  echo "applying $base …"
  "${psql_base[@]}" -f "$f"

  if [[ -z "$exists" ]]; then
    "${psql_base[@]}" -c "INSERT INTO schema_migrations(filename, checksum) VALUES ('${base}', '${sum}');"
  else
    "${psql_base[@]}" -c "UPDATE schema_migrations SET checksum='${sum}', executed_at=now() WHERE filename='${base}';"
  fi
done

echo "migrations done."
