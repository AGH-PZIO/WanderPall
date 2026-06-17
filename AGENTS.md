# Repository Guidelines

## Project Structure & Module Organization

WanderPall is split into a FastAPI backend, React/Vite frontend, PostgreSQL migrations, and supporting docs.

- `backend/app/` contains the API application. Feature code lives under `backend/app/modules/<module>/`.
- `frontend/src/` contains the React app, with matching feature folders under `frontend/src/modules/`.
- `frontend/legacy/` holds a snapshot of the pre–C1 UI (`src/` before the Together design overhaul).
- `frontend/src/shared/design/` contains the C1 (Together) design tokens and layout CSS.
- `infra/db/migrations/` contains SQL migrations, applied by the startup scripts.
- `tests/` contains backend integration tests; module-level backend tests live beside each module in `backend/app/modules/*/tests/`.
- `docs/` stores API and project documentation. `designs/` and `demos/` are standalone design/demo artifacts.

## Build, Test, and Development Commands

- `./scripts/start.sh db` starts PostgreSQL and applies migrations.
- `./scripts/start.sh backend` starts database plus backend via Docker Compose.
- `./scripts/start.sh full` starts database, backend, and frontend.
- `./scripts/status.sh` shows running Compose services.
- `./scripts/test.sh backend-unit` runs Python compile checks and module unit tests.
- `./scripts/test.sh backend-integration` starts the DB and runs `tests/`.
- `./scripts/test.sh frontend` runs `npm run lint` and `npm run build`.
- `./scripts/test.sh all` runs backend and frontend checks.
- In `frontend/`, use `npm run dev`, `npm run lint`, `npm run build`, and `npm run api:types`.

## Coding Style & Naming Conventions

Use existing module boundaries and naming patterns. Python code uses 4-space indentation, typed FastAPI/Pydantic style, and snake_case filenames/functions. React code uses TypeScript, PascalCase components, camelCase hooks/utilities, and feature-local folders such as `pages`, `hooks`, `api`, and `ui`. Keep SQL migrations numbered and descriptive, for example `006_add_trip_status.sql`.

Frontend linting is configured with ESLint in `frontend/eslint.config.js`; TypeScript build validation is part of `npm run build`.

## Testing Guidelines

Backend tests use `pytest`. Name test files `test_*.py` and place unit tests near the owning module. Put cross-module/API tests in `tests/`. Prefer focused tests for service behavior and integration tests for API/database contracts. Run `./scripts/test.sh backend-unit` before backend-only changes and `./scripts/test.sh all` before broad changes.

## Commit & Pull Request Guidelines

Recent history uses short, imperative or feature-style subjects, sometimes with PR numbers, for example `feat: Travel maps (#12)` or `Travel assistance refactor (#9)`. Keep commits scoped to one concern.

PRs should include a concise description, affected modules, test results, linked issue if applicable, and screenshots for UI changes. When API contracts change, update FastAPI routes, `docs/openapi.json`, and generated frontend API types together.

## Security & Configuration Tips

Copy `.env.example` to `.env` for local overrides. Do not commit secrets, OAuth credentials, database dumps, or generated local virtualenvs. Docker Compose is the expected local runtime for the full app.
