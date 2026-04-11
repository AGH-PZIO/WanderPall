#!/usr/bin/env sh
set -eu

db_user="${POSTGRES_USER:-wanderpall}"
db_name="${POSTGRES_DB:-wanderpall}"
max_attempts="${DB_WAIT_ATTEMPTS:-30}"
migrations_dir="${MIGRATIONS_DIR:-infra/db/migrations}"

if [ ! -d "$migrations_dir" ]; then
  echo "No migrations directory found: $migrations_dir"
  exit 0
fi

attempt=1
while ! docker compose exec -T db pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database did not become ready after $max_attempts attempts." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 1
done

docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" <<'SQL'
CREATE SCHEMA IF NOT EXISTS shared;

CREATE TABLE IF NOT EXISTS shared.schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' | sort | while read -r migration; do
  filename="$(basename "$migration")"

  already_applied="$(
    docker compose exec -T db psql -t -A -U "$db_user" -d "$db_name" \
      -c "SELECT 1 FROM shared.schema_migrations WHERE filename = '$filename';"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "Skipping already applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"
  {
    echo "BEGIN;"
    cat "$migration"
    echo
    echo "INSERT INTO shared.schema_migrations (filename) VALUES ('$filename');"
    echo "COMMIT;"
  } | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name"
done
