# Phases

Each phase: `/brainstorm` -> `/to-spec` -> small commits -> `/ship-phase` -> PR -> you merge.
Each phase gets a spec file here (`NN-<slug>.md`), written by `/to-spec`.

Proposed roadmap (one working day). The order and scope are confirmed in each phase's brainstorm.

| # | Phase | Result |
|---|---|---|
| 0 | Project setup | Skills, hooks, reviewer agent, docs (this PR) |
| 1 | API core | NestJS, `/health`, `/tasks`, validation, logging middleware, unit tests |
| 2 | Database | PostgreSQL, migrations, indexes, e2e tests, docker compose |
| 3 | Web app | React list, form, health badge, UI states |
| 4 | Container and CI | Multi-stage Dockerfile, GitHub Actions (lint, test, build) |
| 5 | AWS and CD | Terraform EC2, deploy on push to `main`, `docs/aws-setup.md` |
| 6 | Docs | README: setup, architecture, scalability, observability, AI usage |
