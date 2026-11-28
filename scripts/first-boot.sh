#!/usr/bin/env bash
# Runs once as root when the EC2 instance first starts (Terraform passes it as user data, D33).
# Prepares the machine but does not start the app: the first deploy does that (scripts/deploy.sh).
# Amazon Linux 2023 only.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/timuretis/task-management-service.git}"
APP_DIR="${APP_DIR:-/opt/app}"
COMPOSE_VERSION="v5.7.1"
COMPOSE_PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"

install_packages() {
  dnf install -y docker git
  systemctl enable --now docker
}

# Amazon Linux's repositories have no Compose plugin, so download a pinned release and check its checksum.
install_compose() {
  local base="https://github.com/docker/compose/releases/download/$COMPOSE_VERSION"
  local file="docker-compose-linux-$(uname -m)"
  mkdir -p "$COMPOSE_PLUGIN_DIR"
  curl -fsSL -o "$COMPOSE_PLUGIN_DIR/docker-compose" "$base/$file"
  curl -fsSL "$base/$file.sha256" | awk '{print $1 "  '"$COMPOSE_PLUGIN_DIR"'/docker-compose"}' | sha256sum -c -
  chmod +x "$COMPOSE_PLUGIN_DIR/docker-compose"
}

clone_repo() {
  # Safe to run again: an existing checkout is left alone.
  [ -d "$APP_DIR/.git" ] || git clone "$REPO_URL" "$APP_DIR"
}

# The database password never leaves this machine (D32). Hex, so it is safe inside a database URL.
# An existing .env is never overwritten: a new password would not match the data already on disk.
create_env_file() {
  local env_file="$APP_DIR/.env" password
  [ -f "$env_file" ] && return 0
  # From the kernel's random source, so it needs no extra package. Checked, because a failure inside
  # $(...) would not stop the script and would leave an empty password.
  password=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
  [ "${#password}" -eq 48 ] || {
    echo "could not generate the database password" >&2
    exit 1
  }
  (umask 077 && printf 'POSTGRES_PASSWORD=%s\n' "$password" >"$env_file")
}

install_packages
install_compose
clone_repo
create_env_file
echo "first boot: OK"
