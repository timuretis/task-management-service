#!/bin/bash
# Paste into the cloud environment's "Setup script" field (runs as root on Ubuntu).
# Installs Node.js 24, Terraform and AWS CLI v2. A failed install warns but does not block.

install_node() {
  [ -x /opt/node24/bin/node ] && return 0
  local base=https://nodejs.org/dist/latest-v24.x tmp file
  tmp=$(mktemp -d) || return 1
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt" || return 1
  file=$(grep -o 'node-v24[0-9.]*-linux-x64\.tar\.xz' "$tmp/SHASUMS256.txt") || return 1
  curl -fsSL "$base/$file" -o "$tmp/$file" || return 1
  (cd "$tmp" && grep " $file\$" SHASUMS256.txt | sha256sum -c -) || return 1
  mkdir -p /opt/node24 &&
    tar -xJf "$tmp/$file" -C /opt/node24 --strip-components=1
}

install_terraform() {
  command -v terraform >/dev/null && return 0
  local codename
  codename=$(. /etc/os-release && echo "$VERSION_CODENAME")
  curl -fsSL https://apt.releases.hashicorp.com/gpg |
    gpg --batch --yes --dearmor -o /usr/share/keyrings/hashicorp.gpg || return 1
  echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $codename main" \
    > /etc/apt/sources.list.d/hashicorp.list
  apt-get update || true
  apt-get install -y terraform
}

install_awscli() {
  command -v aws >/dev/null && return 0
  local tmp
  tmp=$(mktemp -d) || return 1
  curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o "$tmp/awscli.zip" &&
    unzip -q "$tmp/awscli.zip" -d "$tmp" &&
    "$tmp/aws/install"
}

install_node || echo "WARNING: Node.js 24 install failed"
install_terraform || echo "WARNING: Terraform install failed"
install_awscli || echo "WARNING: AWS CLI install failed"
exit 0
