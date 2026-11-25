#!/bin/bash
# Claude Code SessionStart hook for cloud sessions: selects Node.js 24 and
# installs npm dependencies.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0

if [ -x /opt/node24/bin/node ]; then
  export PATH="/opt/node24/bin:$PATH"
  # Lines in CLAUDE_ENV_FILE apply to the session's later Bash commands.
  if [ -n "$CLAUDE_ENV_FILE" ]; then
    # shellcheck disable=SC2016 # $PATH must expand later, not now
    echo 'export PATH="/opt/node24/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
  fi
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1
[ -f package.json ] || exit 0

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
