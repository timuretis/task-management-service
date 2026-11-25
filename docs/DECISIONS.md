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
