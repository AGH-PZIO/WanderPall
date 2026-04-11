# WanderPall

WanderPall is a travel assistant project split into a React frontend, Python API backend, and PostgreSQL database.

## Repository layout

```text
frontend/        React application
backend/         Python API application
backend/app/modules/account/             Module 1: account, site settings, auth
backend/app/modules/travel_assistance/   Module 2: guides, email, calendar, translator, costs, notes
backend/app/modules/travel_buddies/      Module 3: travel buddies groups
backend/app/modules/maps/                Module 4: trip map editing
backend/app/modules/journal/             Module 5: travel journals
frontend/src/modules/account/            Module 1 frontend
frontend/src/modules/travel-assistance/  Module 2 frontend
frontend/src/modules/travel-buddies/     Module 3 frontend
frontend/src/modules/maps/               Module 4 frontend
frontend/src/modules/journal/            Module 5 frontend
docs/            Project documentation
infra/           Infrastructure helpers and DB migrations
```

## Local startup

Start PostgreSQL only:

```bash
./scripts/start.sh db
```

Start PostgreSQL and the backend API:

```bash
./scripts/start.sh backend
```

Start PostgreSQL, backend API, and frontend:

```bash
./scripts/start.sh full
```

Backend health check:

```bash
curl http://localhost:8000/health
```

Backend/frontend test endpoint:

```bash
curl http://localhost:8000/test
```

Frontend dev server:

```bash
http://localhost:5173
```

The local database uses PostgreSQL 18. `./scripts/start.sh db|backend|full` automatically runs pending SQL migrations from `infra/db/migrations/*.sql` after PostgreSQL is healthy. The first migration creates separate schemas for each module:

- `account`
- `travel_assistance`
- `travel_buddies`
- `maps`
- `journal`
- `shared`

Applied migrations are tracked in `shared.schema_migrations`, so the migration runner is safe to run repeatedly. If an older local database volume already exists and you want a fully fresh local DB, recreate the volume before starting the database again:

```bash
./scripts/reset_db.sh --yes db
```

Use `./scripts/status.sh` to check running containers.

For day-to-day work, put schema changes in new files under `infra/db/migrations/*.sql`.

## Backend approach

The backend uses FastAPI in one Python API process with clear domain packages. That keeps module ownership clean for pairs while avoiding the early complexity of multiple backend services, duplicated auth, distributed migrations, and cross-service calls.

If the course later requires separate backend applications, the module packages can be split into services after the API contracts and database boundaries are stable.

## API contract

FastAPI OpenAPI output is the shared contract between backend and frontend. Keep endpoint changes, `docs/openapi.json`, and generated frontend API types in the same pull request. Details are in `docs/api-contract.md`.
