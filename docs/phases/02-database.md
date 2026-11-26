# Phase 02 - Database
Branch: `phase-2-database`

## Goal
Tasks are stored in PostgreSQL instead of memory. The schema comes from a versioned migration,
`GET /health` reflects database health, and `docker compose` starts a local database. The API
contract from phase 1 does not change.

## Decisions
- `pg` with plain parameterized SQL and `node-pg-migrate` 7 (CommonJS) - chose this over TypeORM or
  Drizzle because two queries do not need an ORM ([D17](../DECISIONS.md))
- The app keeps generating UUIDv7 ids; the column is a plain `uuid` - chose this over Postgres 18
  `DEFAULT uuidv7()` because it works on every version and e2e runs here on Postgres 16 ([D18](../DECISIONS.md))
- `tasks` table with CHECK and length constraints; list ordered by `created_at DESC, id DESC` with an index
  on exactly those columns - chose this over `ORDER BY id DESC` ([D19](../DECISIONS.md))
- One `pg.Pool` (max 10, timeouts); `/health` runs `SELECT 1` and answers 503 on failure ([D20](../DECISIONS.md))
- Default e2e on `pg-mem`, plus an opt-in suite on real Postgres when `TEST_DATABASE_URL` is set ([D21](../DECISIONS.md))

## Tasks (in order, each one a small commit)
1. Add dependencies (`pg`, `node-pg-migrate` 7; dev: `@types/pg`, `pg-mem`) and a required `DATABASE_URL`
   in config and `.env.example` - done when config unit tests cover a missing or invalid URL.
2. Migration 001 (`tasks` table, constraints, list index) and `migrate` / `migrate:down` scripts -
   done when it applies, rolls back and applies again on a local Postgres.
3. `docker-compose.yml` with a `db` service (`postgres:18`, volume, health check, development and `_test`
   databases, local-only port) - done when the file is valid; the first real run is on the author's machine.
4. Database module with the `Pool` provider, closed on shutdown - done when its unit tests pass.
5. `PostgresTasksRepository` (create, newest first with a limit) - done when unit tests with a mocked pool
   check the SQL, the parameters, the row mapping and error propagation.
6. Wire `TasksModule` to the Postgres repository; remove the in-memory repository if nothing uses it -
   done when the existing e2e cases pass unchanged.
7. `GET /health` checks the database: 200 when it answers, 503 `{ status: "error" }` when it does not -
   done when unit and e2e tests pass.
8. e2e harness on `pg-mem`: apply the migration SQL, clean tables between tests, keep the phase 1 cases -
   done when `bash scripts/verify.sh` passes with no database running.
9. Opt-in real-Postgres suite (skipped without `TEST_DATABASE_URL`, database name must end in `_test`) -
   done when it passes against the local Postgres 16 here.
10. Docs: README (compose, migrations, opt-in suite, Postgres 18 not run here) and a coverage check -
    done when coverage is 80%+ and `bash scripts/verify.sh` is green.

## Tests
- Unit: repository with a mocked pool, config (`DATABASE_URL`), pool provider, health controller with
  a failing check.
- E2E (`pg-mem`): the phase 1 cases; created tasks survive an app restart; `/health` returns 503 when the
  database is unreachable; a store failure still gives a safe 500.
- Real Postgres (opt-in): real migration up and down, CHECK and length constraints reject bad rows, newest-first
  order with equal timestamps, the 100-row cap.

## Risks (performance, concurrency, security)
- Performance: the list query is `LIMIT 100` on an indexed ordering; the pool caps connections at 10.
- Concurrency: `POST` is a single-row `INSERT ... RETURNING`, so there are no read-then-write races.
- Security: all queries are parameterized, database errors never reach clients, the test suite refuses a
  database whose name does not end in `_test`, the compose password is local-only and the port is bound to
  localhost.
- `pg-mem` is not exact Postgres; only the opt-in suite proves the migration and constraints (D21).
- `postgres:18` and the compose file cannot be run in the cloud session (no Docker); tested on 16 here.

## Out of scope
The API Dockerfile and API service in compose, migrations at container start (phase 4), seed data,
backups, update and delete endpoints, pagination, replicas.
