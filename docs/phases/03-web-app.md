# Phase 03 - Web app
Branch: `phase-3-web-app`

## Goal
A React page in `apps/web` shows an API health badge, a create-task form with client-side validation, and
the task list with loading, empty and error states. It talks to the existing API without changing it.

## Decisions
- The app calls the API by full URL from `VITE_API_URL`, over the CORS allow-list - chose this over a
  same-origin proxy because CORS already exists and hosting stays open ([D22](../DECISIONS.md))
- Vite, React 19 and TypeScript; Vitest, jsdom and Testing Library with a hand-mocked `fetch` - chose this over
  adding `msw` for fewer dependencies; plus one real-browser check with Playwright ([D23](../DECISIONS.md))
- Production dependencies are only `react` and `react-dom`; everything else is dev-only
- One page: health badge (re-checked every 30 s), form (title required, description optional), list;
  status is shown but cannot be changed because the API has no update endpoint

## Tasks (in order, each one a small commit)
- [x] 1. Correct the README note about `postgres:18` (verified by the author) - done, first commit on the branch.
- [x] 2. Scaffold `apps/web` (Vite, React, TypeScript), ESLint with the React hooks rules, Prettier, Vitest with
   an 80% coverage gate, `.env.example` - done when `bash scripts/verify.sh` passes on the empty app.
- [x] 3. Typed API wrapper: base URL from `VITE_API_URL`; maps network failure, 400 (message list), 429 and
   5xx to readable errors - done when its unit tests pass.
- [x] 4. `useHealth` (polls every 30 s, cleans up on unmount) and `HealthBadge` - done when tests cover
   online, offline, a 503 and cleanup.
- [ ] 5. `useTasks` (list, create, retry; a new task is added at the top; a slow list answer must not overwrite
   a task created meanwhile) - done when tests cover loading, empty, error, retry, create and that race.
- [ ] 6. `TaskForm` with validation that mirrors the API (title trimmed, 1-200; description up to 2000),
   disabled while submitting, server errors shown with the typed text kept - done when tests cover each case.
- [ ] 7. `TaskList` with loading, empty and error (with Retry) states - done when its tests pass.
- [ ] 8. `App` composition and styles (CSS Modules, one column, mobile-first) - done when the app renders in the tests.
- [ ] 9. Real-browser check: run the API on Postgres and the built app, create a task, see it listed, stop the
   API and see "offline" - done when screenshots show it works and found issues are fixed.
- [ ] 10. Docs: README web section, coverage check, decisions up to date - done when verify is green.

## Tests
- Unit/component (Vitest + Testing Library, mocked `fetch`): API wrapper errors, both hooks, the three components,
  accessibility basics (labels, `role="alert"`), polling cleanup. Coverage 80% or more.
- E2E: no suite in CI. One manual Playwright run against the real API and database (task 9).

## Risks (performance, concurrency, security)
- Performance: the API caps the list at 100, so no pagination; health polling is one small request per 30 s.
- Concurrency: the submit button is disabled while sending; an older list answer must not overwrite a newer
  create (React already ignores updates after unmount, so no guard code for that).
- Security: React escapes text and `dangerouslySetInnerHTML` is never used; `VITE_` values are public, so
  no secrets; a 429 shows a clear "try again in a minute" message.
- Deployment: production must set `CORS_ORIGIN` to the web origin or the browser blocks every call.
- Time: if the budget runs short, cut the 30 s re-polling and check health once on load.

## Out of scope
Edit, delete, filter and pagination; routing, global state, authentication, i18n, offline mode; a web
Dockerfile and hosting (phases 4 and 5); end-to-end tests in CI.
