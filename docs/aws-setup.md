# AWS setup, step by step

This guide takes you from an empty AWS account to the app running at `https://tasks.timur.co.il` (web) and
`https://tasks-api.timur.co.il` (API). Only a human runs `terraform apply` and `terraform destroy`; nothing in CI does.
Cost while running: about $20-25 a month (one t3.small, one Elastic IP, a little CloudWatch).

## What gets built

One EC2 server in Frankfurt runs Docker Compose: Caddy (HTTPS), the web app, the API and Postgres. Terraform creates the
server, its firewall, its permissions, a log group and a role that lets GitHub Actions deploy to it. See
[DECISIONS.md](DECISIONS.md) D27-D36 for the reasons.

## 1. Prepare your machine

1. Create an AWS account and an IAM user with administrator access for yourself. Do not use the root user.
2. Install the tools: `brew install awscli terraform`.
3. Create an access key for that IAM user and run `aws configure` (region `eu-central-1`). Check with
   `aws sts get-caller-identity`.
4. The GitHub repository must be **public**: the server clones it without credentials.

## 2. Tell Terraform who you are

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` (it is git-ignored):
- `ssh_cidr`: your public address with `/32`. Find it with `curl https://checkip.amazonaws.com`. It is the only address
  that may open SSH. If your address changes, edit this and run `apply` again.
- `ssh_public_key`: the contents of your `.pub` file, e.g. `cat ~/.ssh/id_ed25519.pub`.

## 3. Create everything

```bash
terraform init
terraform plan      # read it: about 16 resources to add, none to change or destroy
terraform apply     # type "yes"
```

If `apply` says an OpenID Connect provider for `token.actions.githubusercontent.com` already exists (another project in
the account made it), import it once and run `apply` again:

```bash
terraform import aws_iam_openid_connect_provider.github \
  arn:aws:iam::<account id>:oidc-provider/token.actions.githubusercontent.com
```

`apply` prints the outputs. **Keep `infra/terraform.tfstate` safe** (copy it somewhere private): Terraform needs it to
manage or destroy what it built (D31).

The server installs Docker and clones the repo on its first start, which takes a couple of minutes. It does not start the
app yet: the first deploy does.

## 4. Add the DNS records

At DNSExit, add two **A records** using the `dns_records` output (both point to the same address):

| Name | Type | Value |
| --- | --- | --- |
| `tasks.timur.co.il` | A | `public_ip` output |
| `tasks-api.timur.co.il` | A | `public_ip` output |

Check with `dig +short tasks.timur.co.il`. Caddy can only get its HTTPS certificates once these resolve.

## 5. Tell GitHub where to deploy

Run these once (or add them in the repository's Settings > Secrets and variables > Actions > Variables). They are not
secrets, so they are variables:

```bash
gh variable set AWS_DEPLOY_ROLE_ARN --body "$(terraform output -raw deploy_role_arn)"
gh variable set AWS_INSTANCE_ID     --body "$(terraform output -raw instance_id)"
gh variable set WEB_DOMAIN          --body tasks.timur.co.il
gh variable set API_DOMAIN          --body tasks-api.timur.co.il
```

## 6. First deploy

The order matters: Terraform, DNS and variables first, then merge the phase pull request. The merge starts CI on `main`,
and its `deploy` job pushes the images, runs the deploy on the server and smoke-tests the live site.

**Make the images public.** The first push creates the GHCR packages, and GitHub may create them private, in which case the
server cannot pull them. In GitHub: your profile > Packages > `task-management-api` and `task-management-web` >
Package settings > Change visibility > Public. Then re-run the failed `deploy` job.

Check the result:

```bash
curl -s https://tasks-api.timur.co.il/health
curl -sI https://tasks.timur.co.il | grep -i -E 'strict-transport|content-security'
```

## Everyday use

**Deploy.** Merge to `main`; CI deploys the merged commit.

**Roll back.** Deploy an older commit by hand, from your laptop (the commit must have been deployed before, so its
images exist):

```bash
aws ssm send-command --instance-ids "$(terraform output -raw instance_id)" \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["bash /opt/app/scripts/deploy.sh <full 40-character sha>"]'
```

Or log in with `ssh ec2-user@<public_ip>` and run `sudo bash /opt/app/scripts/deploy.sh <sha>`. The next push to `main`
deploys forward again.

**Look at the database from your laptop** (Postgres listens on the server's loopback only, D32):

```bash
ssh -N -L 5433:127.0.0.1:5432 ec2-user@<public_ip>          # leave running
ssh ec2-user@<public_ip> 'sudo grep POSTGRES_PASSWORD /opt/app/.env'
psql "postgres://tasks:<password>@127.0.0.1:5433/tasks"      # in another terminal
```

**Read the logs.** In CloudWatch Logs, group `/task-management-service` (one stream per container), or:

```bash
aws logs tail /task-management-service --follow --region eu-central-1
```

The API logs JSON, so Logs Insights can filter by field. On the server, `sudo docker compose -f /opt/app/compose.prod.yml ps`
shows the containers.

## Take it all down

```bash
cd infra
terraform destroy   # type "yes"
```

This deletes the server **and the database on its disk** (D27). Also delete the two DNS records and, in GitHub, the four
variables. The OIDC provider is deleted too; if another project used it, import it first or recreate it afterwards.
