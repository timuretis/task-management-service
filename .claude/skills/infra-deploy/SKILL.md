---
name: infra-deploy
description: Conventions for Docker, Terraform on AWS and the GitHub Actions CI/CD pipeline of task-management-service, plus the beginner AWS guide. Use when working on Dockerfiles, infra/, .github/workflows, deployment or AWS setup.
---

# Infrastructure and deployment

The author has little AWS experience: prefer the simplest setup that meets
`docs/requirements.md`, and explain every resource in a short comment.

## Docker
- Multi-stage build: build stage with dev dependencies, runtime stage with `npm ci --omit=dev`.
- Small pinned base image (`node:24-alpine`), non-root `USER`, `HEALTHCHECK` on `/health`,
  `.dockerignore` excluding `node_modules`, tests, `.env`.
- Local dev: `docker compose` with the API and PostgreSQL.

## Terraform (`infra/`)
- Simple and explainable over "enterprise": an EC2 instance with Docker, a security group,
  and an IAM role. Write down any choice of a managed alternative (RDS, ECS) in `docs/DECISIONS.md`.
- Security group: SSH only from the author's IP (a variable), API/web port open.
- No secrets in `.tf` files; inputs via `terraform.tfvars` (git-ignored) or SSM Parameter Store.
- Pin provider versions; always `terraform fmt` and `terraform validate`.
- **Never run `terraform apply` or `destroy`.** Write the exact commands for the human instead.

## CI/CD (`.github/workflows`)
- On pull request: install, lint, unit + e2e tests with coverage, Docker build.
- On push to `main`: the same, then push the image and deploy to EC2.
- Secrets only in GitHub Actions secrets; least-privilege credentials.
- Pin action versions; cache npm.

## Beginner guide
Keep `docs/aws-setup.md` as numbered steps a newcomer can follow: create the AWS account
user, install the tools, `terraform init/plan/apply`, add the GitHub secrets, check
`/health`, and tear down. Explain each step in one sentence.
