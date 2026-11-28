# Task Management Service

REST API and React client for managing tasks, deployed to AWS.

## Live URL
- Web app: https://tasks.timur.co.il
- API: https://tasks-api.timur.co.il (try `/health` and `/tasks`)

## Architecture
```
 Browser
    |  HTTPS (Let's Encrypt, renewed by Caddy)
    v
 Caddy :80/:443 --- tasks.timur.co.il ------> web   (React build served by nginx)
    |
    +------------- tasks-api.timur.co.il ---> api   (NestJS, port 3000)
                                                |
                                                v
                                          db   (PostgreSQL 18, volume on the instance disk)

 migrate  runs once per deploy from the API image, then exits; api starts only after it succeeds
 Everything above is one docker compose stack (compose.prod.yml) on one EC2 instance in Frankfurt.
 All container logs go to CloudWatch Logs. The browser calls the API directly over CORS (D22).
```

- Only Caddy is reachable from the internet (ports 80 and 443); the API and web ports exist only inside the compose
  network. The database also listens on the instance's loopback for the author's SSH tunnel (D32), and SSH itself is
  open only to the author's IP.
- The browser loads the page from `web` and then calls the API's own name, so the two are separate origins.
- Terraform ([`infra/`](infra)) creates the instance, firewall, IAM roles and log group; GitHub Actions builds the images
  and deploys by commit SHA. The choices behind each box are in [DECISIONS.md](docs/DECISIONS.md) D24-D36.

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

### Everything in Docker
The production images, with no Node needed on your machine:

```bash
docker compose up --build --wait   # database, migrations, API and web app; waits until all are healthy
bash scripts/smoke-test.sh         # optional: health, web page, CORS, create and list a task (adds one task)
```

Open `http://localhost:8080`; the API is on `http://localhost:3000`. Stop the API from `npm run start:dev`
first, since both use port 3000. `docker compose down` stops the stack and keeps the data.

How it fits together (D24, D26):
- `db` is PostgreSQL 18, shared with the local setup above.
- `migrate` runs the migrations once from the API image and exits; `api` starts only if it succeeded, so the
  API never changes the schema itself.
- `api` runs in production mode (JSON logs, `CORS_ORIGIN=http://localhost:8080`) as a non-root user.
- `web` is the built app served by nginx as a non-root user. Its image is built for
  `VITE_API_URL=http://localhost:3000`, so another environment needs its own build:
  `docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=<api url> .`
- Every port is bound to `127.0.0.1`, and the passwords in `docker-compose.yml` are for local use only.

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

## Continuous integration
GitHub Actions (`.github/workflows/ci.yml`, D25) runs on every pull request and every push to `main`,
with a read-only token. A newer push to a PR cancels its run still in progress; runs on `main` always finish.
Two jobs run in parallel, and a third deploys after both pass on `main` (see Deployment):
- **Lint, test, build**: `bash scripts/verify.sh` with a `postgres:18` service and `TEST_DATABASE_URL` set,
  so the real-Postgres suite runs on every change.
- **Images and smoke test**: `docker compose up --build --wait`, then `scripts/smoke-test.sh`; service logs
  are printed if anything fails. It also checks `compose.prod.yml` and the `caddy/Caddyfile`.

Pushing a change to a workflow file needs a
GitHub token with the `workflow` scope (`gh auth refresh -s workflow`, then `gh auth setup-git`).

## Deployment
Every push to `main` that passes CI is deployed to one AWS EC2 instance (Frankfurt) created with Terraform in
[`infra/`](infra). Caddy serves HTTPS for the web app and the API, the containers run from images tagged with the
commit SHA, and logs go to CloudWatch. CI signs in to AWS with OIDC (no stored keys) and deploys through SSM, then
runs a read-only smoke test against the live URLs.

- First-time setup, DNS, rollback, database tunnel, logs and teardown: [docs/aws-setup.md](docs/aws-setup.md).
- Why it is built this way: [DECISIONS.md](docs/DECISIONS.md) D27-D36.
- Cost while running is about $20-25 a month; `terraform destroy` stops it (and deletes the database). The instance
  is protected against accidental destroy, so teardown is deliberate (see the guide).

## Scalability (10x traffic)
- Today everything runs on one instance, so the first limits are that instance and its disk, and there are no managed
  backups (D27). The first step for 10x is PostgreSQL on RDS (backups, Multi-AZ); then run several API containers
  behind a load balancer. The API keeps no state in memory except the rate limit counters below, so it can be copied.
- Rate limit counters (`@nestjs/throttler`) live in each instance's memory. With several
  instances the limits apply per instance; share them through Redis at that point.
- Behind a proxy or load balancer set `TRUST_PROXY` to the number of hops (production already sets 1 for Caddy),
  or every user shares the proxy's IP in the rate limit.
- The database pool allows 10 connections per instance, so N instances can open 10 x N; keep that
  below PostgreSQL's `max_connections` (or add a pooler such as PgBouncer) before scaling out.
- `GET /tasks` reads 100 rows through an index on `(created_at DESC, id DESC)`, so its cost does not
  grow with the table. The next step for large lists is cursor pagination on that same index.
- Every open browser tab polls `GET /health` every 30 seconds, which runs one `SELECT 1`. `/health` is
  exempt from rate limiting, so at 10x traffic this adds steady, cheap load; a longer interval or a
  readiness endpoint that does not touch the database would reduce it.

## Observability

## AI Utilization
