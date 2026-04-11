#!/usr/bin/env sh
set -eu

uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" --reload
