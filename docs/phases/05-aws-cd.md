# Phase 05 - AWS and CD
Branch: `phase-5-aws-cd`

## Goal
Terraform provisions one EC2 instance that runs the app over HTTPS at `https://tasks.timur.co.il` (web) and
`https://tasks-api.timur.co.il` (API), and every green push to `main` deploys that commit automatically.

## Decisions
- One t3.small (Amazon Linux 2023, Frankfurt) runs the compose stack, Postgres on its disk; Terraform never replaces
  it by accident - chose this over RDS to keep it small; RDS is the 10x step ([D27](../DECISIONS.md))
- Caddy terminates HTTPS for two subdomains; A records added by hand at DNSExit; API trusts one proxy hop - chose this
  over plain HTTP or IP certificates ([D28](../DECISIONS.md))
- CI deploys through SSM Run Command with OIDC - chose this over SSH so no keys live in GitHub ([D29](../DECISIONS.md))
- Public GHCR images tagged by commit SHA - chose this over ECR for no AWS registry or login ([D30](../DECISIONS.md))
- Local Terraform state - chose this over an S3 backend for one author ([D31](../DECISIONS.md))
- Database password made on the instance; laptop access by SSH tunnel - chose this over SSM Parameter Store or an
  open port ([D32](../DECISIONS.md))
- The instance keeps a Git checkout moved to each deployed SHA - chose this over fetching single files ([D33](../DECISIONS.md))
- A third CI job deploys and runs a read-only production smoke test - chose this over a separate
  workflow ([D34](../DECISIONS.md))
- HSTS and CSP in Caddy, IMDSv2 hop limit 1, encrypted disk, minimal ingress - chose this over the brief's
  minimum ([D35](../DECISIONS.md))
- Container logs to CloudWatch through `awslogs` - chose this over rotated local files ([D36](../DECISIONS.md))

## Tasks (in order, each one a small commit)
- [x] 1. API `trust proxy` from an environment variable (off by default, one hop in production) - done when unit tests
   cover parsing and e2e tests show the rate limit keys on `X-Forwarded-For` only when it is on.
- [ ] 2. Production compose file and Caddyfile: GHCR images by `IMAGE_TAG`, `db` on loopback only, password from `.env`,
   Caddy on 80/443 with a certificate volume, HSTS and CSP, `awslogs` for every service - done when
   `docker compose config` and `caddy validate` pass.
- [ ] 3. Smoke test read-only mode (health, web page, CORS; no task created) - done when it passes against the local
   stack and the task count does not change.
- [ ] 4. Terraform for the instance: security group, key pair, IAM instance role (SSM, write to its log group),
   log group, encrypted disk, IMDSv2 hop limit 1, Elastic IP, `ignore_changes` on AMI and user data; outputs for the IP,
   the DNS records to add and the role ARN - done when `fmt` and `validate` pass in `verify.sh`.
- [ ] 5. Terraform for CI access: GitHub OIDC provider and a deploy role that trusts only this repo's `main` and may
   only send and read SSM commands on the tagged instance - done when `validate` passes.
- [ ] 6. First-boot script (Docker, Compose, Git, clone to `/opt/app`, password `.env`) and the deploy script
   (checkout SHA, pull, `up -d --wait`) - done when both pass `bash -n` and a dry run in a local container.
- [ ] 7. CI: Terraform in `verify`; production config checks in `docker`; the `deploy` job (push images, OIDC, SSM
   deploy and wait, read-only smoke test) with per-job permissions - done when the workflow is green on the PR and
   `deploy` is skipped there.
- [ ] 8. Docs: `docs/aws-setup.md` (tools, AWS sign-in, `apply`, DNS records, GitHub variables, GHCR visibility, first
   deploy order, SSH tunnel, logs, rollback, `destroy`), README Deployment section - done when a newcomer could follow it.
- [ ] 9. Live check after the author's `apply` and the merge: deploy green, both HTTPS names answer, HSTS and CSP
   present, SSH tunnel to Postgres, logs in CloudWatch, rollback to the previous SHA - results noted here.

## Tests
- Unit/E2E: `trust proxy` config parsing; rate limit by forwarded IP only when enabled. Coverage stays at 80%+.
- CI: Terraform `fmt`/`validate`; production compose `config`; `caddy validate`.
- Live (highest seam): read-only smoke test against both HTTPS names on every deploy; manual checks in task 9.
- Not tested: Terraform against real AWS in CI (needs credentials and costs money on each run).

## Risks (performance, concurrency, security)
- Order of the first deploy: `apply` (from the branch), DNS records, GitHub variables, then merge. The first boot
  does not start the app; the first deploy does. The live check only happens after the merge, so fixes may need a
  follow-up PR.
- GHCR: a first push may create private packages; if so the author makes them public once (confirmed during the build).
- Security: the deploy role is scoped to one repo, one branch and one instance; IMDSv2 hop limit 1 keeps credentials
  out of containers; CSP must list the API name; no secret in Git, GitHub or Terraform state.
- Concurrency: runs on `main` share one concurrency group and are never cancelled, so two deploys never overlap; a
  waiting run is replaced by a newer one, so the latest commit always ends up deployed.
- Performance: one t3.small; the 10x path (RDS, load balancer, several instances) goes in the README.
- Data: one disk, no backups (D27). Cost about $20-25 a month while running; `terraform destroy` stops it.

## Out of scope
RDS and backups; load balancer, auto-scaling, ECS; remote state and Terraform in CI; staging and approval gates;
alarms, dashboards, error tracking; WAF, automatic OS updates, closing port 22; SHA-pinned actions and image
scanning; the full README rewrite (phase 6).
