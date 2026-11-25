# Agent instructions

Shared by every coding agent. Tool-specific notes belong in that tool's own file.

## Project
Task Management REST API (Node.js) with a React SPA, containerized, provisioned
on AWS with IaC, deployed by GitHub Actions. Requirements: `docs/requirements.md`.

## Layout
- `apps/api` - backend service and Jest tests
- `apps/web` - React (Vite) frontend
- `infra` - Terraform
- `.github/workflows` - CI/CD

The root `package.json` uses npm workspaces.

## Commands
- Install: `npm ci`
- Verify everything: `bash scripts/verify.sh` (must pass before a task is done)
- Root `package.json` must expose `lint`, `test` and `build` scripts.

## Rules
- Work on a branch and open a pull request. Do not push to `main`.
- Ask before adding a production dependency, and say why it is needed.
- Backend coverage stays at 80% or higher. Unit tests mock data access.
- Never commit secrets, `.env`, `*.tfstate`, `*.tfvars` or key files.
- Do not run `terraform apply` or `terraform destroy`. A human does that.
- The author must be able to defend every line: prefer simple, conventional code,
  and explain each architectural choice and its main alternative in the PR.
- When the author corrects your output, add an entry to `docs/ai-log.md`.
