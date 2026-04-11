# Repository Initialization Notes

## Current decision

Use a monorepo with:

- `frontend/` for React,
- `backend/` for one Python API process,
- `backend/app/modules/*` for clearly separated functional modules,
- `frontend/src/modules/*` for matching frontend module areas,
- `infra/` for database and deployment helpers.

The backend uses FastAPI. The skeleton is intentionally modular but not split into multiple backend services yet.

## Why not multiple backend apps now

Multiple backend applications would force the team to solve shared auth, API-to-API calls, migrations, local orchestration, and deployment boundaries immediately. The project currently maps more naturally to domain modules in one backend:

- Module 1: account/site settings/auth,
- Module 2: travel assistance,
- Module 3: travel buddies,
- Module 4: map editing,
- Module 5: travel journal.

This still lets pairs work independently while keeping one database migration path and one API contract for the React frontend.

## Team split

- Module 1 and auth: `@JK2Kgit`, `@mKepka16`
- Module 2 and Module 5: `@sggorski`, `@Gawronek-8`, `@pavlvs-91`
- Module 3: unassigned
- Module 4: unassigned

Unassigned modules are listed as comments in `.github/CODEOWNERS` until the remaining pairs are confirmed.

## Suggested next steps

1. Initialize the React app in `frontend/`.
2. Add database migrations after the first shared ERD-to-table pass.
3. Define auth API contracts first, because all logged-in modules depend on them.
