#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: $0 {db|backend|full}"
  echo
  echo "  db       Start PostgreSQL only"
  echo "  backend  Start PostgreSQL and backend"
  echo "  full     Start PostgreSQL, backend, and frontend"
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

case "$1" in
  db)
    docker compose up -d db
    "$(dirname "$0")/migrate_db.sh"
    ;;
  backend)
    docker compose up -d db
    "$(dirname "$0")/migrate_db.sh"
    docker compose --profile backend up --build -d backend
    ;;
  full)
    docker compose up -d db
    "$(dirname "$0")/migrate_db.sh"
    docker compose --profile full up --build -d backend frontend
    ;;
  *)
    usage
    exit 2
    ;;
esac
