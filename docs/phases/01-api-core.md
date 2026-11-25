# Phase 01 - API core
Branch: `claude/clever-brahmagupta-4p47l2` (session branch, used instead of `phase/01-api-core`)

## Goal
A NestJS API in `apps/api` serves `GET /health`, `GET /tasks` and `POST /tasks` from an async
in-memory store, with validation, request logging, basic hardening and 80%+ test coverage.

## Decisions
- PostgreSQL later; in-memory `TasksRepository` behind an interface now ([D6](../DECISIONS.md))
- Task: `id` (UUIDv7), `title` (trimmed, 1-200), optional `description` (max 2000),
  `status` (`todo`/`in_progress`/`done`, default `todo`), `createdAt`; server sets id/status/createdAt
- UUIDv7 ids from the `uuid` package; Postgres generates them in phase 2 ([D7](../DECISIONS.md))
- `class-validator` + global `ValidationPipe` (whitelist, forbid unknown, trim), 100 KB body limit ([D8](../DECISIONS.md))
- Custom request-logging middleware, `x-request-id`, JSON logs in production ([D9](../DECISIONS.md))
- `GET /tasks`: newest first, max 100, no pagination; no `/api` prefix ([D10](../DECISIONS.md))
- `helmet`, CORS allow-list from `CORS_ORIGIN`, `@nestjs/throttler` 100/min, 20/min on create ([D11](../DECISIONS.md))
- Added while building: NestJS 11 and `uuid` 11 because newer majors are ESM-only (D12, D13);
  one global exception filter with a fixed error body (D14)

## Tasks (in order, each one a small commit)
- [x] 1. Scaffold NestJS app in the `apps/api` workspace with TypeScript strict, ESLint, Prettier, Jest;
   root `lint`/`test`/`build` scripts - done when `scripts/verify.sh` passes on the empty app.
- [x] 2. Config module: read and validate `PORT`, `CORS_ORIGIN`, `NODE_ENV`; update `.env.example` -
   done when bad values fail fast at startup (unit tested).
- [x] 3. Health module: `GET /health` returns `{ status, uptime, timestamp }` - done when controller unit test passes.
- [x] 4. Task model and `TasksRepository` interface plus async `InMemoryTasksRepository` (UUIDv7 ids) -
   done when repository unit tests pass.
- [x] 5. `TasksService` (create, list newest 100) - done when unit tests with a mocked repository pass.
- [x] 6. `CreateTaskDto`, global `ValidationPipe`, `TasksController` (`GET`/`POST /tasks`) -
   done when DTO and controller unit tests pass.
- [x] 7. Request-logging middleware with request ID and JSON logger - done when middleware unit tests pass.
- [x] 8. Hardening in bootstrap: `helmet`, CORS, throttler, body limit, shutdown hooks -
   done when the app starts and these are covered by e2e.
- [x] 9. E2E suite with `supertest` - done when all e2e cases below pass and coverage is 80%+.

## Tests
- Unit: service (repository mocked), controllers (service mocked), in-memory repository,
  DTO rules via `validate()`, logging middleware, config. Jest `coverageThreshold` 80% on all metrics.
- E2E (in-memory store): `/health`; create then list; 400 on empty/whitespace/long title and
  unknown fields; 404 on unknown route; `x-request-id` echoed; 429 after the create limit.

## Risks (performance, concurrency, security)
- Performance: list capped at 100; logging adds one timestamp and one write per request.
- Concurrency: single-threaded in-memory store has no races; real concurrency comes with Postgres.
- Security: public URL - mass assignment blocked by whitelist, payload size and rate limited,
  helmet headers, strict CORS, no bodies or auth headers in logs. In-memory data is lost on restart.
- Throttler counters are per instance; several instances would need Redis (README note).

## Out of scope
Postgres, Docker, Swagger/OpenAPI, auth, update/delete, pagination, metrics and tracing.
