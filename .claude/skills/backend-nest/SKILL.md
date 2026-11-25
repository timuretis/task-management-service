---
name: backend-nest
description: Conventions for writing NestJS/TypeScript code in apps/api of task-management-service - module layout, validation, logging, errors, database migrations and indexes, concurrency and security. Use whenever creating or changing code in apps/api.
---

# Backend (NestJS) conventions

## Structure
- One Nest module per feature (`tasks`, `health`): controller (HTTP only) -> service
  (business logic) -> repository/ORM (data access). Controllers hold no logic.
- DTOs with `class-validator`; a global `ValidationPipe` with `whitelist` and
  `forbidNonWhitelisted`, so unknown fields are rejected.
- Config from environment variables, validated at startup. No secret in code.

## Readable code
- TypeScript `strict`; no `any`.
- Functions 20-40 lines; split into named helpers. Files about 200 lines at most.
- Names say what things are. Comment the *why* in a line or two; no dead or commented-out code.
- Prefer the conventional Nest way over clever code. The author must explain every line.

## HTTP
- Correct status codes: 200 read, 201 create, 400 validation, 404 missing, 500 unexpected.
- One global exception filter; consistent error body `{ statusCode, message, error }`.
  Never leak stack traces or SQL to clients.
- The custom request-logging middleware logs method, path, status, duration and a
  request id. Never log bodies containing secrets.

## Database
- Every schema change is a versioned migration committed to git; never auto-sync in production.
- Add an index for every column used in `WHERE`/`ORDER BY` on list endpoints (e.g. `created_at`).
- Lists are paginated with a capped `limit`, so one request can't load the whole table.
- Use parameterized queries only (the ORM does this); flag any raw SQL in the PR.

## Concurrency and performance
- Everything async; never block the event loop.
- Rely on DB constraints/transactions for consistency, not in-memory checks.
- Use a connection pool with a set size; close it on shutdown (enable shutdown hooks).

## Security
- `helmet`, CORS limited to the web origin, request body size limit, basic rate limit.
- Run as a non-root user in Docker (see infra-deploy).

## Commits
Conventional Commits, imperative, at most 72 characters, e.g. `feat(api): add POST /tasks validation`.
Each commit passes `npm run lint && npm test`.
