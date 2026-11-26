# Phase 04 - Container and CI
Branch: `phase-4-container-ci`

## Goal
`docker compose up` runs the whole app (database, migrations, API, web) from production images, and a
GitHub Actions workflow proves on every pull request and every update of `main` that the code passes verify
against real Postgres and that the images start and work together.

## Decisions
- Two multi-stage images, the API and the web app on a non-root nginx, with `VITE_API_URL` as a build argument -
  chose this over one image that also serves the web files because each image has one job and it fits D22
  ([D24](../DECISIONS.md))
- One CI workflow: `verify` with a `postgres:18` service so the real-Postgres suite runs on every change, and
  `docker` that builds both images and smoke-tests the compose stack - chose this over a plain `docker build`
  so images are proven, not only built ([D25](../DECISIONS.md))
- Migrations run in a one-off `migrate` service built from the API image; the API starts only after it exits
  successfully - chose this over migrating on API startup, which races when several instances start ([D26](../DECISIONS.md))
- One smoke-test script, used both locally and in CI; the workflow does not repeat its checks inline
- Base images `node:24-alpine` and an unprivileged nginx, pinned by tag; no new production dependencies

## Tasks (in order, each one a small commit)
1. `.dockerignore` and the API image: build stage compiles with dev dependencies, runtime stage has production
   dependencies only, runs as a non-root user, `HEALTHCHECK` on `/health`, and can also run the migrate command -
   done when the image builds and `docker run` with a `DATABASE_URL` answers `/health`.
2. Web image: Vite build with `VITE_API_URL` as a build argument, static files served by non-root nginx on an
   unprivileged port - done when the image builds and serves the page.
3. Compose grows to `db`, `migrate`, `api` and `web`: the API waits for a healthy `db` and a finished `migrate`,
   runs with `NODE_ENV=production` and `CORS_ORIGIN` set to the web origin; all ports bound to localhost -
   done when `docker compose up --wait` brings every service up healthy from an empty volume.
4. Smoke-test script: against the running stack, checks `/health` is ok, the web page loads, the API answers
   with the web origin in its CORS header, a task can be created and then appears in the list; exits non-zero
   with a clear message on the first failure - done when it passes locally and fails when the API is stopped.
5. CI workflow, job `verify`: on pull requests and pushes to `main`, `contents: read` only, Node from `.nvmrc`,
   cached `npm ci`, `bash scripts/verify.sh` with a `postgres:18` service and `TEST_DATABASE_URL` set, newer
   runs cancel older ones - done when the job is green on the PR and the log shows the real-Postgres suite ran.
6. CI workflow, job `docker`: build both images, `docker compose up --wait`, run the smoke script, print service
   logs on failure, always tear down - done when the job is green on the PR.
7. Docs: README section on running with Docker and what CI checks; D26 recorded; phase table updated - done
   when verify is green and the reviewer has run.

## Tests
- Unit/E2E: unchanged; the existing Jest, Vitest and real-Postgres suites now run in CI on every change.
- Smoke (new seam, highest level): HTTP checks against the real compose stack, the same script locally and in CI.
- No new unit tests: this phase adds config and one shell script, no application code.

## Risks (performance, concurrency, security)
- Security: both containers run as non-root; no secrets in images, compose holds only the local-only database
  password; `.dockerignore` keeps `.env`, `node_modules` and tests out of the build context; workflow token is
  read-only; actions pinned to major tags (SHA pinning is the upgrade path, D25).
- Security: the `node-pg-migrate` 7 advisories (D17) ship in the runtime image; the practical risk stays low.
- Correctness: `VITE_API_URL` is baked in at build time, so the compose web image targets `localhost` only;
  phase 5 builds its own. A missing `CORS_ORIGIN` makes the API refuse to start in production, which is intended.
- Concurrency: only one `migrate` run per deploy; the API never migrates itself.
- Performance: npm cache and Docker layer order (manifests before sources) keep builds fast; the smoke test is the
  slowest and most fragile step, so it waits on health checks, not fixed sleeps.

## Out of scope
Publishing images to a registry, deploying, `trust proxy` and anything on AWS (phase 5); SHA-pinned actions;
image vulnerability scanning; Playwright or browser tests in CI; hot-reload development containers.
