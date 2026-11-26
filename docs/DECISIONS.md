# Decision log

One entry per decision that is hard to reverse or would surprise a reader.
Newest at the bottom. Format:

```
## D<n>. <title> (phase <n>)
- Decision: what we chose.
- Alternative: the main option we did not choose.
- Why / trade-off: in one or two sentences.
```

## D1. AI workflow: plan on Opus, build on Sonnet (phase 0)
- Decision: Sonnet is the default model; `/brainstorm` and `/to-spec` run on Opus.
- Alternative: Opus for everything.
- Why / trade-off: Opus is best at design choices, but the Pro plan limits run out fast.
  Coding to an agreed spec works well on Sonnet.

## D2. Independent review once per phase (phase 0)
- Decision: a read-only `code-reviewer` subagent (Sonnet) reviews the whole phase diff before the PR.
- Alternative: review before every commit.
- Why / trade-off: about 6 reviews instead of 30+, so far fewer tokens. A problem can sit
  for a few commits before it is caught, but nothing reaches `main` unreviewed.

## D3. Project skills split by area (phase 0)
- Decision: small skills (`backend-nest`, `frontend-react`, `testing`, `infra-deploy`, ...)
  that load only for matching work; `AGENTS.md` stays short.
- Alternative: one large `CLAUDE.md` with all the rules.
- Why / trade-off: less context per task means fewer tokens and better focus. Rules are spread
  over several files, so `AGENTS.md` points to them.

## D4. Guardrails as hooks, not only instructions (phase 0)
- Decision: hooks block commits/pushes on `main`/`master` and ask before any PR merge.
- Alternative: rely on the written rules in `AGENTS.md`.
- Why / trade-off: a hook is enforced and an instruction can be missed. Hooks only guard
  Claude, so GitHub branch protection on `main` is still recommended for humans.

## D5. Humans run `terraform apply` (phase 0)
- Decision: Claude writes and validates Terraform; the author runs `apply` locally.
- Alternative: give the Claude cloud environment AWS keys.
- Why / trade-off: AWS keys never leave the author's machine. It costs a few manual steps,
  covered in `docs/aws-setup.md`.

## D6. PostgreSQL, behind a repository interface (phase 1)
- Decision: PostgreSQL is the database (added in phase 2). Phase 1 uses an async in-memory
  `TasksRepository` behind the same interface, so the service does not change when Postgres arrives.
- Alternative: Postgres from phase 1, or an in-memory/JSON store only.
- Why / trade-off: keeps phase 1 small and gives a clear seam for mocking and swapping the store.
  The in-memory class is extra code, but it can stay as a test double.

## D7. Task IDs are UUIDv7 (phase 1)
- Decision: `id` is a UUIDv7. Phase 1 generates it in the app with the `uuid` package;
  phase 2 moves generation to Postgres 18 (`DEFAULT uuidv7()`).
- Alternative: UUIDv4 (`crypto.randomUUID()`, no dependency) or an auto-increment integer.
- Why / trade-off: time-ordered IDs keep B-tree inserts at the end of the index and sort like
  `createdAt`; unlike integers they are not guessable. Costs one small dependency and
  reveals the creation time, which is public anyway.

## D8. Validation with class-validator and a global ValidationPipe (phase 1)
- Decision: DTO classes with `class-validator` decorators; global `ValidationPipe` with
  `whitelist`, `forbidNonWhitelisted` and `transform` (trims input). Body limit 100 KB.
- Alternative: Zod schemas with a custom pipe.
- Why / trade-off: the NestJS default, easy to explain and to read. Costs two dependencies and
  the schemas cannot be shared with the React app as easily as Zod's.

## D9. Custom request-logging middleware with JSON logs (phase 1)
- Decision: own middleware logs one line per request (method, path, status, duration, request ID);
  `x-request-id` is reused or generated and echoed. Nest's `ConsoleLogger({ json: true })` in production.
  Bodies, query strings and auth headers are never logged.
- Alternative: `nestjs-pino`.
- Why / trade-off: meets the "custom middleware" requirement with no dependency and gives
  CloudWatch-friendly JSON. Less feature-rich and slower than pino at very high volume.

## D10. `GET /tasks` returns the newest 100, no pagination yet (phase 1)
- Decision: list is newest first and capped at 100; no `/api` prefix or version in the path.
- Alternative: cursor pagination (`?limit&cursor` on the UUIDv7 id) from the start.
- Why / trade-off: bounded response time with no extra API surface. Older tasks are not
  reachable past 100; cursor pagination can be added later without breaking clients.

## D11. Helmet, CORS allow-list and in-app rate limiting (phase 1)
- Decision: `helmet`; CORS only for origins in `CORS_ORIGIN`; `@nestjs/throttler` at
  100 req/min per IP and 20 req/min on `POST /tasks`; config read from env in one `config.ts`.
- Alternative: no app-level limits, rely on AWS (ALB + WAF) later.
- Why / trade-off: protects the public URL and the in-memory store at no cost. Throttler counters
  are per instance, so at 10x with several instances they would need a shared store (Redis).

## D12. NestJS 11 (CommonJS), not NestJS 12 (phase 1)
- Decision: pin `@nestjs/*` to 11.x and compile to CommonJS.
- Alternative: NestJS 12, which is ESM-only.
- Why / trade-off: Jest and ts-jest cannot load ESM-only packages without extra setup
  (`Must use import to load ES Module`). Nest 11 is stable and conventional; we upgrade later if needed.

## D13. `uuid` pinned to 11.x (phase 1)
- Decision: use `uuid` 11 for `v7()`, not the latest 14.
- Alternative: latest `uuid`, which is ESM-only (same problem as D12).
- Why / trade-off: 11.x ships a CommonJS build and already has UUIDv7. We miss newer releases
  until the project moves to ESM.

## D14. One global exception filter with a fixed error body (phase 1)
- Decision: every failure returns `{ statusCode, message, error }`. Nest and body-parser 4xx
  errors keep their status; anything unexpected becomes a plain 500 and only its stack is logged.
- Alternative: Nest's built-in filter only.
- Why / trade-off: the built-in one returns a different shape for non-Nest errors (such as a 413)
  and logs client mistakes at ERROR level. One small filter keeps the contract the web app relies on
  and never leaks messages, SQL or stacks.

## D15. `trust proxy` is set in phase 5, not now (phase 1)
- Decision: the API does not trust `X-Forwarded-For` yet; phase 5 sets `trust proxy` for the real load balancer.
- Alternative: always set `trust proxy` now.
- Why / trade-off: with no proxy in front, a client could fake that header and dodge the per-IP rate limit.
  Until phase 5 nothing runs behind a proxy, so the limit is accurate where we run today.

## D16. Merging is a user-invoked skill, `/merge-pr` (phase 1)
- Decision: after the author's own review, `/merge-pr` squash-merges the PR into `main` (pinned to the
  reviewed commit), checks that GitHub deleted the branch and updates local `main`. The merge hook still asks first.
- Alternative: the author merges by hand in GitHub, or Claude merges on its own.
- Why / trade-off: removes repetitive steps and forgotten branch cleanup, while the author keeps the
  decision. One more skill to maintain.
  Branch deletion is left to the repo setting "Automatically delete head branches": the GitHub tools
  have no delete call and the cloud session's git access is refused with a 403 when it tries.

## D17. `pg` with plain SQL and `node-pg-migrate` (phase 2)
- Decision: a `PostgresTasksRepository` using the `pg` driver with parameterized SQL; versioned SQL
  migrations with `node-pg-migrate` 7 (CommonJS). `pg` and `node-pg-migrate` are production dependencies
  because migrations run at deploy time.
- Alternative: TypeORM (`@nestjs/typeorm` 11), or Drizzle.
- Why / trade-off: two queries do not justify an ORM; every query and index is visible SQL that is easy to
  explain. Rows are mapped by hand and the code grows less gracefully if the schema gets large.
  `node-pg-migrate` is pinned to 7.x because 8.x and 9.x declare `type: module` (same reason as D12 and D13).
  Known cost: 7.x pulls in `glob` and `minimatch` versions with advisories (`npm audit --omit=dev`: 2 high,
  1 moderate). They only scan our own migrations folder, the `glob` CLI is never run and no untrusted pattern
  reaches them, so the practical risk is low. The only fix is 9.x, which needs the move to ESM; revisit then.
  Migrations run through its API from a 25-line wrapper script, which reads `.env` and gives a clear error
  when `DATABASE_URL` is missing; the same package is used by the real-Postgres test suite.

## D18. The app keeps generating UUIDv7 ids; the database does not (phase 2)
- Decision: `id` stays an app-generated UUIDv7 (the `uuid` package stays a production dependency);
  the column is a plain `uuid PRIMARY KEY`. This replaces the "Postgres 18 `DEFAULT uuidv7()`" part of D7.
- Alternative: Postgres 18 generates the id.
- Why / trade-off: works on every Postgres version, and e2e runs against a real database in the cloud
  session (Postgres 16, no Docker). The id exists before the insert; ids from several instances are
  ordered by each instance's clock, which is close enough for index locality.

## D19. `tasks` table with DB-level constraints and a `created_at` index (phase 2)
- Decision: `tasks(id uuid PK, title varchar(200) NOT NULL, description varchar(2000), status text NOT NULL
  DEFAULT 'todo' CHECK in (todo, in_progress, done), created_at timestamptz NOT NULL DEFAULT now())`.
  The list orders by `created_at DESC, id DESC` and has an index on exactly those columns.
- Alternative: `ORDER BY id DESC`, served by the primary-key index with no extra index.
- Why / trade-off: the ordering says what the API means and does not depend on how ids are generated.
  Costs one extra index (slightly slower inserts). Constraints duplicate the DTO rules on purpose, so bad
  rows cannot be stored even if the app has a bug.

## D20. One `pg.Pool` provider; `/health` checks the database (phase 2)
- Decision: a single `Pool` (max 10, connect and idle timeouts) from `DATABASE_URL`, validated at startup and
  closed on shutdown. `GET /health` runs `SELECT 1` with a 2 s timeout and answers 503 `{ status: "error" }`
  (cause logged) when it fails.
- Alternative: keep `/health` free of the database and add a separate readiness endpoint.
- Why / trade-off: one endpoint, as the requirements list, and a real signal for deploy checks. A database
  outage makes the API report unhealthy, which an orchestrator could treat as a reason to restart it.
  The check shares the request pool: if all 10 connections stay busy for 2 s, a healthy but overloaded
  instance also answers 503. A separate one-connection pool for health would avoid that, at the cost of
  an eleventh connection per instance; revisit if probes ever flap under load.

## D21. e2e on `pg-mem`, plus an opt-in real-Postgres suite (phase 2)
- Decision: the default e2e suite runs the real `PostgresTasksRepository` against `pg-mem` (dev dependency),
  so `bash scripts/verify.sh` needs no database. A small suite runs against real PostgreSQL only when
  `TEST_DATABASE_URL` is set (name must end in `_test`) and covers the real migration, constraints, the
  index and the list ordering. Unit tests mock the pool.
- Alternative: e2e always on a real PostgreSQL (the `testing` skill's earlier rule), or reuse the in-memory repository.
- Why / trade-off: fast, dependency-free verification, and this cloud session has no Docker. `pg-mem`
  does not emulate Postgres exactly, so only the opt-in suite proves the migration and constraints; if it is
  not run (for example, CI not set up yet), those are untested. The `testing` skill is updated to match.

## D22. The web app calls the API by full URL, over CORS (phase 3)
- Decision: the React app reads the API base URL from `VITE_API_URL` and calls it directly; the API's CORS
  allow-list (D11) names the web origin (`http://localhost:5173` in development).
- Alternative: same origin, through a Vite dev proxy and a reverse proxy in production.
- Why / trade-off: uses the CORS setup already built and keeps hosting open for phase 5. Production must set
  `CORS_ORIGIN` to the web app's origin or the browser blocks every call. `VITE_` values are public, so no secret goes there.

## D23. Web stack: Vite, React 19 and Vitest with a mocked `fetch` (phase 3)
- Decision: `apps/web` uses Vite, React and TypeScript; production dependencies are only `react` and
  `react-dom`. Tests use Vitest, jsdom and Testing Library with a hand-mocked `fetch`, and the app is also run
  once against the real API in a real browser (Playwright) to catch CORS and layout problems.
- Alternative: add `msw` to mock the network at a lower level.
- Why / trade-off: fewer dependencies and less to explain; the API wrapper is small enough for a plain mock.
  jsdom is not a real browser, so the browser check covers what it cannot.
