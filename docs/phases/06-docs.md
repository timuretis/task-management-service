# Phase 06 - Docs
Branch: `phase-6-docs`

## Goal
The README is complete for a reviewer: it explains the architecture, how the service scales to 10x, how it is
observed and how AI was used, including a real correction, and every statement matches the code.

## Decisions
- The AI log keeps author corrections and AI-found bugs in two tables; the README names the Opus/Sonnet split and uses an
  author correction as its required example - chose this over one merged table so the author's role is not
  overstated ([D37](../DECISIONS.md))
- Text-only architecture diagram, no images - chose this over a drawn diagram so it stays in version control and
  needs no tooling

## Tasks (in order, each one a small commit)
1. [x] Architecture overview near the top of the README: browser, Caddy, web, API and PostgreSQL on one EC2 instance, as a
   text diagram with a link to D24-D36 - done when a newcomer can name every container and what talks to what.
2. [x] Fix the README structure: the `System Architecture` heading sits after Deployment with Scalability under it - done
   when the order is overview, setup, tests, CI, deployment, scalability, observability, AI.
3. [x] Check the Scalability section against the code (rate limit store, `TRUST_PROXY`, pool size, `GET /tasks` index,
   `/health` polling) and correct anything that is out of date - done when each claim is verified.
4. [x] Observability section: JSON request logs with request ID (D9), `/health` backed by the database (D20), CloudWatch
   logs and Logs Insights (D36), the post-deploy smoke test (D34); then what is missing and the next step (metrics,
   alerts, tracing) - done when every claim is checked against the code and Terraform.
5. [x] `docs/ai-log.md`: add the second table with the three post-phase-5 fixes (OIDC subject, duplicate HSTS header,
   stale Caddy file mount), each with what went wrong and how it was found - done when it matches the phase 5 spec.
6. [x] AI Utilization section: workflow (Opus plans, Sonnet builds, project skills, hooks, one independent review per
   phase), where AI helped and where it did not, the Dockerfile `COPY` correction in full, the three AI-found bugs and
   the lesson that the live check caught what tests and CI could not - done when it links to `docs/ai-log.md`.
7. [ ] Final check: every README link and command resolves, no secrets or personal details in the new
   text; note the results here - done when `bash scripts/verify.sh` passes. The live `GET /health` check is deferred to the
   author (see results).

## Tests
- Unit/E2E: none added, there is no new code. `bash scripts/verify.sh` must still pass (80% coverage gate unchanged).
- Documentation checks (manual, results noted under task 7): each claim in Observability, Scalability and the
  architecture overview compared with the source and `compose.prod.yml`; relative links and commands tried; one
  read-only `curl` of the live `/health`.

## Risks (performance, concurrency, security)
- Performance and concurrency: no runtime change. The docs only describe existing limits.
- Security: no secrets, `.env` values or personal details in the new text. The OIDC subject IDs are already public in
  the Terraform defaults.
- Accuracy: a documented claim that is wrong is worse than a missing one, so each is checked or removed.

## Out of scope
- New code or behaviour changes, including the Scalability improvements the README only describes.
- Diagrams as images, a changelog, an API reference, a link-checker dependency.
- Changing the deployed infrastructure.

### Task 7 results (2026-11-28)
- Claims checked against the code: Scalability (rate limit 100 a minute and 20 for `POST /tasks`, `/health` exempt, pool of
  10, index and `LIMIT 100`, 30 second poll), Observability (log fields and levels, the 2 second `SELECT 1` timeout,
  14-day retention, container healthchecks, `up --wait` in the deploy), Architecture (ports, services). One error was
  found and fixed while writing: the database also listens on the instance's loopback for the SSH tunnel (D32).
- Added to Scalability: the single-instance and no-backup limit with the RDS step, which D27 said the README would describe.
- README relative links and the files and scripts it names all exist. No secrets or personal details in the new text.
- `bash scripts/verify.sh`: OK.
- Live `GET /health`: not run in this session. The network allowlist did not include the host, and the live request was
  then denied by the permission check. Deferred to the author: `curl -fsS https://tasks-api.timur.co.il/health`. Last verified
  live in phase 5, task 9.
