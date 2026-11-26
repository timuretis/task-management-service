---
name: brainstorm
description: Interview the user to settle the decisions for a new phase or a design question in task-management-service before any code is written. Use when the user says "brainstorm", starts a phase, or faces a choice (database, framework, hosting, API shape).
model: opus
---

# Brainstorm

1. Check the git state in one line (branch, uncommitted changes). If not on an up-to-date
   phase branch (`phase-N-<slug>`, from the latest `main`), say so and let the user decide.
2. Read `docs/requirements.md`, `docs/DECISIONS.md` and the specs in `docs/phases/`.
   Look facts up in the repo instead of asking.
3. Interview the user **one question at a time**. Open each with your recommended answer
   so they can accept it in a word. When a choice really branches, give 2-3 options with
   trade-offs. Prefer the simplest option the user can explain in an interview.
4. Always cover, briefly: performance, concurrency and security impact; how it will be
   tested; what is out of scope given the one-day budget.
5. The decisions belong to the user. When one is settled and it is hard to reverse or
   would surprise a reader, add it to `docs/DECISIONS.md` (format is in that file).
6. Don't write code. When you both agree the picture is complete, suggest `/to-spec`
   and run it once the user says yes.
