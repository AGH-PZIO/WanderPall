#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: $0 [backend|backend-unit|backend-integration|frontend|all]"
}

target="${1:-all}"
venv_dir="${BACKEND_VENV_DIR:-.venv}"
requirements_file="backend/requirements.txt"

if command -v python3 >/dev/null 2>&1; then
  python_cmd="python3"
else
  python_cmd="python"
fi

ensure_backend_venv() {
  if [ ! -x "$venv_dir/bin/python" ]; then
    echo "Creating backend virtualenv in $venv_dir..."
    "$python_cmd" -m venv "$venv_dir"
  fi

  if [ ! -f "$venv_dir/.requirements-installed" ] || [ "$requirements_file" -nt "$venv_dir/.requirements-installed" ]; then
    echo "Installing backend dependencies..."
    "$venv_dir/bin/python" -m pip install -r "$requirements_file"
    touch "$venv_dir/.requirements-installed"
  fi
}

run_backend_unit() {
  echo "Running backend unit checks..."
  ensure_backend_venv
  PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}backend" PYTHONDONTWRITEBYTECODE=1 \
    "$venv_dir/bin/python" -m compileall -q backend/app backend/scripts
  PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}backend" PYTHONDONTWRITEBYTECODE=1 \
    "$venv_dir/bin/python" -m pytest backend/app/modules/account/tests -q
}

run_backend_integration() {
  echo "Running backend integration checks..."
  ensure_backend_venv
  ./scripts/start.sh db
  PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}backend" PYTHONDONTWRITEBYTECODE=1 \
    "$venv_dir/bin/python" -m pytest tests -q
}

run_backend() {
  run_backend_unit
  run_backend_integration
}

run_frontend() {
  echo "Running frontend checks..."
  (
    cd frontend
    npm run lint
    npm run build
  )
}

case "$target" in
  backend)
    run_backend
    ;;
  backend-unit)
    run_backend_unit
    ;;
  backend-integration)
    run_backend_integration
    ;;
  frontend)
    run_frontend
    ;;
  all)
    run_backend
    run_frontend
    ;;
  *)
    usage
    exit 2
    ;;
esac
