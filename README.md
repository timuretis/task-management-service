# Task Management Service

REST API and React client for managing tasks, deployed to AWS.

## Live URL
## Local setup
Requires Node 24 (see `.nvmrc`).

```bash
npm ci
cp .env.example .env              # PORT, NODE_ENV, CORS_ORIGIN, DATABASE_URL
docker compose up -d db           # PostgreSQL 18 on 127.0.0.1:5432 (local-only password)
npm run migrate -w api            # create the tables
npm run start:dev -w api          # build, then start the API
```

The API listens on `http://localhost:3000`:
`GET /health` (503 when the database is down), `GET /tasks`, `POST /tasks` with
`{ "title": "...", "description": "..." }`. Tasks are stored in PostgreSQL.

`npm run migrate:down -w api` rolls back the last migration. Migrations are plain SQL files in
`apps/api/migrations`, run by `node-pg-migrate`. The schema is never changed automatically.

### Web app
In a second terminal, with the API running:

```bash
cp apps/web/.env.example apps/web/.env   # VITE_API_URL=http://localhost:3000 (optional locally)
npm run dev -w web                       # http://localhost:5173
```

The page shows an API health badge (re-checked every 30 seconds), a form to create a task and the list
of tasks, with loading, empty and error states. The dev server must stay on port 5173, because that is the
origin the API allows by default (`CORS_ORIGIN`, see D22 in `docs/DECISIONS.md`).

Two things to remember for a real deployment:
- `VITE_API_URL` is read when the app is **built** (`npm run build -w web`), not when it runs, and it is
  public: it ends up in the JavaScript. Never put a secret in a `VITE_` variable.
  A production build without it shows "The app is not configured" instead of calling `localhost`.
- The API's `CORS_ORIGIN` must list the web app's exact origin, or the browser blocks every call.

### Without Docker
Any local PostgreSQL works. Create the role and the two databases that `docker-compose.yml` creates,
then run the same migrate and start commands:

```bash
psql -U postgres -c "CREATE ROLE tasks LOGIN PASSWORD 'tasks'" \
  -c "CREATE DATABASE tasks OWNER tasks" -c "CREATE DATABASE tasks_test OWNER tasks"
```

The migration and the opt-in real-Postgres suite pass on both PostgreSQL 16 and the `postgres:18`
image from `docker-compose.yml`. Use `docker compose down -v` to reset the local database.

## Running tests
```bash
bash scripts/verify.sh   # lint, unit + e2e tests with coverage (80% gate), build; needs no database
```

This runs both workspaces. The web app's tests use Vitest, jsdom and Testing Library with a mocked API
layer (D23). To run only them: `npm test -w web`. The first release was also checked once in a real
browser against the real API and database (create, reload, rate limit, API stopped and restarted, phone
width); that check is not part of the test suite.

The default e2e tests run on `pg-mem`, an in-process PostgreSQL emulator (see D21 in
`docs/DECISIONS.md`). One more suite checks the real migration, constraints, index and ordering
against a real PostgreSQL. It is skipped unless `TEST_DATABASE_URL` is set, and it refuses a
database whose name does not end in `_test`:

```bash
TEST_DATABASE_URL=postgres://tasks:tasks@127.0.0.1:5432/tasks_test bash scripts/verify.sh
```
## Deployment
## System Architecture
### Scalability (10x traffic)
- Rate limit counters (`@nestjs/throttler`) live in each instance's memory. With several
  instances the limits apply per instance; share them through Redis at that point.
- Behind a load balancer set Express `trust proxy` (phase 5), or every user shares the proxy's IP.
- The database pool allows 10 connections per instance, so N instances can open 10 x N; keep that
  below PostgreSQL's `max_connections` (or add a pooler such as PgBouncer) before scaling out.
- `GET /tasks` reads 100 rows through an index on `(created_at DESC, id DESC)`, so its cost does not
  grow with the table. The next step for large lists is cursor pagination on that same index.
- Every open browser tab polls `GET /health` every 30 seconds, which runs one `SELECT 1`. `/health` is
  exempt from rate limiting, so at 10x traffic this adds steady, cheap load; a longer interval or a
  readiness endpoint that does not touch the database would reduce it.
### Observability
### AI Utilization
