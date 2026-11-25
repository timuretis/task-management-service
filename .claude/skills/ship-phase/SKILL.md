---
name: ship-phase
description: Finish a development phase of task-management-service - verify, independent review, docs, push and open the PR. Never merges.
disable-model-invocation: true
---

# Ship phase

Run these steps in order and stop on any failure.

1. `bash scripts/verify.sh` (lint, tests with coverage, build). Fix until green.
2. Run the `code-reviewer` subagent once on the whole phase diff (`git diff main...HEAD`).
   Fix every Blocker and Should-fix in new commits; list the Nits you skip in the PR.
   Re-run step 1 if code changed.
3. Docs: tick off the tasks in the phase spec in `docs/phases/`, update `docs/DECISIONS.md`
   and the README sections the phase touched, and add any correction the user made to
   `docs/ai-log.md`.
4. Push the phase branch and open a PR to `main`:
   - Title: `Phase NN: <name>`
   - Body: what was built, decisions with their main alternative, trade-offs, how to test,
     review summary, and coverage numbers.
5. Stop. Give the user the PR link. **Do not merge** - merging is the user's call.
