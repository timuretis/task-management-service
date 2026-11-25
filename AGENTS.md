# Agent instructions

Shared by every coding agent. Tool-specific notes belong in that tool's own file.

## Project
Task Management REST API with a React SPA, in Docker, on AWS (Terraform),
deployed by GitHub Actions. Requirements: `docs/requirements.md`.
Stack: Node.js 24, TypeScript, NestJS, PostgreSQL (confirm in phase 1), React + Vite.

## Layout
- `apps/api` - NestJS service, Jest unit + e2e tests
- `apps/web` - React (Vite) frontend
- `infra` - Terraform
- `.github/workflows` - CI/CD
- `docs/phases/` - one spec per phase; `docs/DECISIONS.md` - decision log

The root `package.json` uses npm workspaces.

## Commands
- Install: `npm ci`
- Verify everything: `bash scripts/verify.sh` (must pass before a task is done)
- Root `package.json` must expose `lint`, `test` and `build` scripts.

## Workflow
1. Each phase: `/brainstorm` -> `/to-spec` -> build in small commits -> `/ship-phase`.
2. One branch and one PR per phase. Never commit to `main`/`master`; never merge a PR.
3. Independent review by the `code-reviewer` subagent once per phase, before the PR.

## Rules
- Use only this project's skills (`.claude/skills`), not global ones.
- Code must be easy to explain in an interview: simple, conventional, short functions
  (20-40 lines; up to 100 only for an algorithm that can't be split - ask first).
  Comments explain *why*, not *what*.
- Ask before adding a production dependency, and say why it is needed.
- Backend coverage stays at 80% or higher. Unit tests mock data access.
- Never commit secrets, `.env`, `*.tfstate`, `*.tfvars` or key files.
- Do not run `terraform apply` or `terraform destroy`. A human does that.
- Every architectural choice goes in `docs/DECISIONS.md` with its main alternative and trade-off.
- When the author corrects your output, add an entry to `docs/ai-log.md`.
