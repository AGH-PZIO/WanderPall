# API Contract Workflow

FastAPI generates the REST API contract as OpenAPI. Use that contract as the shared source between backend and frontend.

## Rule

Every endpoint change should update the generated OpenAPI file and the frontend API types in the same pull request.

This matters most when backend and frontend work are split between different people, for example:

- Module 1 backend/auth: `@JK2Kgit`
- Module 1 frontend/account UI: `@mKepka16`

The same approach still works when one pair owns both sides of another module.

## Recommended workflow

1. Backend owner adds or changes FastAPI routes, request schemas, and response schemas.
2. Backend owner exports OpenAPI to `docs/openapi.json`.
3. Frontend owner regenerates TypeScript API types from `docs/openapi.json`.
4. Frontend calls only typed API helpers, not hand-written request shapes copied from memory.
5. Pull request reviewers check that route changes, OpenAPI output, and frontend type updates match.

## Commands

Export OpenAPI from the backend:

```bash
cd backend
python -m scripts.export_openapi
```

Or through Docker:

```bash
docker compose exec backend sh -c "OPENAPI_OUTPUT_PATH=/tmp/openapi.json python -m scripts.export_openapi"
docker cp wanderpall-backend:/tmp/openapi.json docs/openapi.json
```

Generate frontend API types after `docs/openapi.json` exists:

```bash
cd frontend
npm run api:types
```

Frontend code should use the shared typed client in `frontend/src/shared/api-client.ts`.

## Pull request checklist

- API path, method, request body, and response body are represented in FastAPI schemas.
- `docs/openapi.json` is updated after backend route changes.
- Frontend type generation is run after `docs/openapi.json` changes.
- API-breaking changes are called out in the pull request description.
- Error response shape is documented when the frontend needs to render field-level errors.
