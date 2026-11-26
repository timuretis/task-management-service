---
name: to-spec
description: Turn the agreed brainstorm for a task-management-service phase into a short phase spec with ordered tasks, saved in docs/phases/. Use after /brainstorm or when the user asks for a spec or a task breakdown.
model: opus
---

# To spec

Synthesize what was already agreed. Do not interview again; ask only if something is
truly missing.

1. Name the test seams: the highest level that proves the behavior (usually the HTTP API
   via e2e, the service via unit tests). Confirm them with the user in one message.
2. Write `docs/phases/<NN>-<slug>.md` (e.g. `01-api-core.md`) with this template, under
   about 80 lines, in plain English:

```markdown
# Phase NN - <name>
Branch: `phase-N-<slug>` (e.g. `phase-2-database`)

## Goal
One or two sentences: what works at the end of this phase.

## Decisions
- <decision> - chose X over Y because ... (link to docs/DECISIONS.md entry)

## Tasks (in order, each one a small commit)
1. <task> - done when <acceptance check>

## Tests
- Unit: <what> / E2E: <what>

## Risks (performance, concurrency, security)
## Out of scope
```

3. No file paths or code beyond names of modules and endpoints; code changes fast.
4. Next: create the branch (see AGENTS.md naming), then start task 1. Building is a fresh step,
   so it can run on the default (Sonnet) model.
