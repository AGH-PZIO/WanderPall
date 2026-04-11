#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: $0 [--yes] [db|backend|full]"
  echo
  echo "Deletes the local Docker Compose database volume and starts a fresh database."
  echo "Use this after changing DB migrations or switching PostgreSQL major versions."
  echo
  echo "Start mode defaults to db."
}

confirm_reset() {
  if [ "${1:-}" = "--yes" ]; then
    return 0
  fi

  if [ ! -t 0 ]; then
    echo "Refusing to reset DB without --yes in non-interactive mode." >&2
    exit 2
  fi

  printf "This will delete the local Docker database volume. Continue? [y/N] "
  read -r answer

  case "$answer" in
    y|Y|yes|YES)
      ;;
    *)
      echo "Cancelled."
      exit 0
      ;;
  esac
}

start_mode="db"

case "$#" in
  0)
    confirm_reset
    ;;
  1)
    if [ "$1" = "--yes" ]; then
      confirm_reset "$1"
    else
      start_mode="$1"
      confirm_reset
    fi
    ;;
  2)
    if [ "$1" != "--yes" ]; then
      usage
      exit 2
    fi
    confirm_reset "$1"
    start_mode="$2"
    ;;
  *)
    usage
    exit 2
    ;;
esac

case "$start_mode" in
  db|backend|full)
    ;;
  *)
    usage
    exit 2
    ;;
esac

docker compose down -v
"$(dirname "$0")/start.sh" "$start_mode"
