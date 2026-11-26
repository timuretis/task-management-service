---
name: testing
description: Testing standards for task-management-service - Jest unit tests with mocked data access, API e2e tests against a real database, the 80% coverage gate, and frontend tests. Use when writing or changing tests, adding a feature, fixing a bug, or checking coverage.
---

# Testing

Every feature and bug fix ships with tests.

| Change | Required tests |
|---|---|
| Service logic | Jest unit tests; data access is mocked; happy path + edge cases |
| Endpoint | e2e test (Jest + supertest) for status codes and response body |
| Bug fix | A failing test first, then the fix |
| React component/hook | Vitest + Testing Library: render, user action, loading/empty/error |

## Rules
- Backend coverage at least 80% lines and branches, enforced by `coverageThreshold` in Jest config.
- Never skip or delete a failing test to get green. Fix the code or the test.
- Test behavior, not internals. Name tests by behavior:
  `it('rejects a task with an empty title')`, not `it('works')`.
- Unit tests sit next to the code (`tasks.service.spec.ts`); e2e tests in `apps/api/test/`.
- Default e2e runs against `pg-mem` (an in-process Postgres emulator): the migration SQL is applied
  first and tables are cleaned between tests. Tests call HTTP only, never services directly (see D21).
- A small opt-in suite (`*.pg-spec.ts`) runs against a real PostgreSQL when `TEST_DATABASE_URL` is set
  (Docker locally, a service container in CI) and is skipped otherwise. It must check the real migration,
  the constraints, the index and the list ordering. The database name must end in `_test`.
- Don't test trivial glue (`main.ts`, module files); exclude it from coverage instead.

## Always cover
- Validation: missing title, empty or whitespace title, wrong types, unknown fields -> 400.
- Health returns status and uptime.
- Error path: data layer failure -> 500 with a safe message.

## Done means
`bash scripts/verify.sh` is green and coverage did not drop.
