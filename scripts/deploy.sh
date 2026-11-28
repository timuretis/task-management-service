#!/usr/bin/env bash
# Deploys one commit on the instance. CI runs it through SSM Run Command (D29); a rollback is the same
# command with an older SHA. Usage: sudo bash /opt/app/scripts/deploy.sh <full commit sha>
set -euo pipefail

SHA="${1:-}"
APP_DIR="${APP_DIR:-/opt/app}"

# Reject anything but a full SHA: the value ends up in git and docker commands.
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || {
  echo "usage: $0 <40-character commit sha>" >&2
  exit 2
}

cd "$APP_DIR"
# Config, images and code all come from this one commit (D33). CI already ran this same checkout so that
# this script is the new version; it is repeated here so a manual rollback works on its own.
git fetch --quiet origin main
git checkout --quiet --detach "$SHA"

# Remember the tag in .env, so `docker compose -f compose.prod.yml ...` by hand matches what is deployed.
{ grep -v '^IMAGE_TAG=' .env || true; echo "IMAGE_TAG=$SHA"; } >.env.new
chmod 600 .env.new
mv .env.new .env

# Only our own images: pulling `db` and `caddy` too would let a new upstream release replace the
# database container during an unrelated deploy.
docker compose -f compose.prod.yml pull --quiet api web migrate
docker compose -f compose.prod.yml up -d --wait --remove-orphans
echo "deployed $SHA"
