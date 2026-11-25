#!/usr/bin/env bash
# One command to check the repo. Used by people and by any agent.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f package.json ]; then
  want=$(cat .nvmrc)
  case "$(node --version)" in
    "v$want".*) ;;
    *) echo "ERROR: Node $want required, found $(node --version)" >&2; exit 1 ;;
  esac
  npm run lint --if-present
  npm test --if-present
  npm run build --if-present
else
  echo "No package.json yet - skipping Node checks"
fi

if compgen -G "infra/*.tf" >/dev/null; then
  terraform -chdir=infra fmt -check -recursive
  terraform -chdir=infra init -backend=false -input=false
  terraform -chdir=infra validate
fi
echo "verify: OK"
