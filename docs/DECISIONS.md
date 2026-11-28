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

## D24. Two container images: the API, and the web app on nginx (phase 4)
- Decision: a multi-stage image for the API (build stage with dev dependencies, runtime stage with production
  dependencies only) and a multi-stage image for the web app (Vite build, then static files served by a
  non-root nginx). `VITE_API_URL` is a build argument. `docker-compose.yml` grows to `db`, `migrate` (D26), `api` and `web`.
- Alternative: one image where the API also serves the built web files, or hosting the web files on S3.
- Why / trade-off: one job per image, small runtime images and a fit with D22 (separate origins, CORS).
  `VITE_API_URL` is baked in at build time, so each environment needs its own web image build.

## D25. CI runs verify with Postgres 18 and a compose smoke test (phase 4)
- Decision: one workflow on every pull request and on every update of the default branch, permissions
  `contents: read` only. Job `verify`: Node 24, `npm ci` (cached), `bash scripts/verify.sh` with a `postgres:18`
  service container and `TEST_DATABASE_URL` set, so the real-Postgres suite runs on every change (D21). Job
  `docker`: build both images, `docker compose up`, then check `/health`, the web page, and create and list a
  task. Actions are pinned to major version tags, npm is cached, and a newer run cancels the older one on a
  pull request (runs on the default branch always finish).
- Alternative: `verify` plus a plain `docker build` with no smoke test.
- Why / trade-off: images and the compose file are proven on every change, not only built. The smoke test is the
  slower, more fragile part. Pinning to tags is easier to read than commit SHAs but trusts the action's author;
  SHA pinning is the upgrade path. No image publishing or deploy yet (phase 5).

## D26. Migrations run as a one-off `migrate` service (phase 4)
- Decision: compose has a `migrate` service built from the API image that runs the migrate command once; the
  `api` service starts only after it exits successfully. The API never migrates on startup.
- Alternative: the API container runs migrations in its entrypoint before starting.
- Why / trade-off: one migration run per deploy, with no race when several API instances start, and the same step
  can run on EC2 in phase 5. Costs one more service, and a failed migration blocks the API from starting, which is intended.

## D27. One EC2 instance runs the compose stack, Postgres included (phase 5)
- Decision: Terraform provisions one EC2 instance that runs the same compose stack as CI (`db`, `migrate`, `api`,
  `web`). Postgres data lives on the instance's EBS disk. Terraform ignores changes to the AMI and the startup
  script, so an `apply` never replaces the instance (and its data) by accident. API termination protection and
  `prevent_destroy` add two more guards; a deliberate teardown lifts them first (docs/aws-setup.md).
- Alternative: EC2 for the app and RDS for Postgres.
- Why / trade-off: it meets the assignment literally (an EC2 instance; even an in-memory store is allowed), keeps
  Terraform small and runs in production exactly what CI tests. There are no managed backups, and losing the
  instance loses the data. Moving to RDS (backups, Multi-AZ) is the first step of the 10x plan, described in the README.

## D28. HTTPS with Caddy on two subdomains of the author's domain (phase 5)
- Decision: a Caddy container terminates TLS on 443 with Let's Encrypt certificates for `tasks.timur.co.il`
  (web) and `tasks-api.timur.co.il` (API), and redirects port 80 to HTTPS. `web` and `api` are no longer
  published on the host. The two A records are added by hand at the domain's DNS host (DNSExit, which has no
  Terraform provider), using the Elastic IP that Terraform prints. The API sets `trust proxy` to one hop (Caddy),
  as D15 planned. Caddy's certificates live in a volume, so redeploys do not hit Let's Encrypt's limits.
- Alternative: plain HTTP on the Elastic IP (web on 80, API on 3000), or HTTPS by IP address with Let's Encrypt's
  6-day IP certificates (generally available since January 2026).
- Why / trade-off: real HTTPS on standard ports and names that do not change if the instance does, at the cost of
  one more container and one manual DNS step outside AWS. The API stays cross-origin, so D22 (CORS) is unchanged.

## D29. CI deploys through SSM Run Command, signed in to AWS with OIDC (phase 5)
- Decision: on a push to `main`, GitHub Actions gets short-lived AWS credentials through OIDC (an IAM role that
  trusts only this repository's `main` branch) and runs the deploy command on the instance with SSM Run Command,
  then waits for its result and fails the run if it failed. The instance has an IAM role for the SSM agent.
  SSH stays open only to the author's IP and is never used by CI. The role names the repository the way GitHub's
  token now does, with the numeric owner and repo IDs (`repo:owner@id/name@id`), not the plain `owner/name`.
- Alternative: SSH from GitHub Actions with a private key in GitHub Secrets.
- Why / trade-off: no long-lived AWS keys or SSH keys in GitHub, and port 22 is not opened to GitHub's thousands of
  runner IP ranges. Costs more Terraform (OIDC provider, deploy role, instance role) and more concepts to explain.

## D30. Images on GitHub Container Registry, public, tagged by commit SHA (phase 5)
- Decision: CI pushes the API and web images to GHCR with the workflow's `GITHUB_TOKEN` (`packages: write` on the
  deploy job only). The images are public, so the instance pulls them without registry credentials. Every deploy
  uses the exact commit SHA that CI built and tested; a rollback redeploys an older SHA.
- Alternative: private Amazon ECR repositories (scan on push, but more Terraform and a registry login on the instance).
- Why / trade-off: no AWS resources and no credentials on the instance. The images are public, which is safe because
  they contain no secrets (D24, `.dockerignore`), and a deploy depends on GitHub being up as well as AWS.

## D31. Terraform state stays local on the author's machine (phase 5)
- Decision: no remote backend. The state file lives in `infra/` on the author's machine and is git-ignored (D5:
  only the author runs `apply`).
- Alternative: an encrypted, versioned S3 bucket as the backend, with S3's built-in state locking.
- Why / trade-off: nothing to create before the first `apply` and nothing more to explain. If the state file is
  lost, Terraform no longer knows its resources and they must be imported or deleted by hand, so the author keeps
  a private backup. Move to S3 when a second person or CI needs to run Terraform.

## D32. Database password made on the instance; laptop access through an SSH tunnel (phase 5)
- Decision: the instance's first-boot script generates a random Postgres password once and writes it to a
  root-only `.env` next to the production compose file. `db` is published only on the instance's loopback
  (`127.0.0.1:5432`), and the security group has no database port. The author connects from a laptop with an SSH
  tunnel (`ssh -L`), over the SSH access the security group already allows from the author's IP.
- Alternative: Terraform generates the password and stores it in SSM Parameter Store; or open 5432 to the author's IP.
- Why / trade-off: the password never leaves the instance (not in Terraform state, GitHub or the repo) and Postgres
  never faces the internet. If the instance is lost the password goes with it, but so does the data (D27).

## D33. The instance keeps a Git checkout and each deploy moves it to the deployed SHA (phase 5)
- Decision: the first-boot script clones the public repo to `/opt/app`. A deploy (run through SSM, D29) checks out
  the commit SHA that CI built, then runs `docker compose -f compose.prod.yml pull` and `up -d --wait` with that SHA
  as the image tag (D30). Only our own images are pulled, so a new upstream `postgres` or `caddy` release never
  replaces a running container during an unrelated deploy. The password `.env` (D32) stays outside Git.
- Alternative: fetch only the needed files with `curl`, or send their contents inside the SSM command.
- Why / trade-off: config, images and code always come from the same commit, and a rollback is the same command with
  an older SHA. The instance needs Git and network access to GitHub, but no credentials because the repo is public.

## D34. Deploy is a third CI job, checked by a read-only production smoke test (phase 5)
- Decision: `ci.yml` gets a `deploy` job that runs only on pushes to `main` and only after `verify` and `docker`
  pass. It pushes both images to GHCR (D30), deploys through SSM (D29, D33), then runs `scripts/smoke-test.sh`
  against the live HTTPS names in a read-only mode (health, web page, CORS; no task is created). Only this job has
  `packages: write` and `id-token: write`. The deploy role's ARN and the domain names are repository variables.
- Alternative: a separate `deploy.yml` started by `workflow_run` when CI finishes on `main`.
- Why / trade-off: one file shows the whole path from test to production, and the job graph guarantees nothing
  untested is deployed. Testing and deploying share one workflow, so the file grows. The read-only check never
  writes to the live site, so creating a task in production is not proven on each deploy.

## D35. Security hardening: headers in Caddy, IMDSv2 with hop limit 1, minimal ingress (phase 5)
- Decision: Caddy sends HSTS (one year, the two names only, no `includeSubDomains`) and a Content-Security-Policy
  for the web app that allows `connect-src` to the API name only, with `frame-ancestors 'none'`. The instance
  requires IMDSv2 with a hop limit of 1, so containers cannot read the instance role's credentials. The root disk
  is encrypted. The security group allows 22 from the author's IP and 80 and 443 from anywhere. The instance role
  has the SSM policy only.
- Alternative: only the brief's minimum (security group and encrypted disk).
- Why / trade-off: closes the open CSP item from phase 4 and the container-to-credentials path, at the cost of a few
  more lines to explain. The CSP must be kept in step with the API name. Automatic OS updates, WAF and SSM-only access
  (closing 22) are named as next steps, not built.

## D36. Container logs go to CloudWatch Logs through the `awslogs` driver (phase 5)
- Decision: the production compose file sends every container's logs to one CloudWatch log group (created by
  Terraform, 14-day retention). The instance role may write to that group only. The API's JSON logs (D9) can be
  queried in CloudWatch Logs Insights; `docker compose logs` still works on the instance through Docker's local cache.
- Alternative: Docker's local `json-file` logs with rotation, read over SSH.
- Why / trade-off: logs survive the instance and can be searched without SSH, which also gives the README's
  observability section a working base. Costs a few cents a month, a little more Terraform and IAM, and a
  dependency on CloudWatch for log delivery.

## D37. The AI log separates author corrections from bugs the AI found itself (phase 6)
- Decision: `docs/ai-log.md` keeps its main table for corrections the author made to AI output. A second table lists
  bugs the AI introduced and later found and fixed itself (the three post-phase-5 fixes: OIDC subject, duplicate
  HSTS header, stale Caddy file mount). The README's AI section names the model split (Opus plans, Sonnet builds) and
  uses an author correction as its required example.
- Alternative: one merged table.
- Why / trade-off: the requirement asks for a correction made to AI output, and presenting AI-found bugs as the
  author's corrections would overstate the author's role. Costs a second table to maintain.
