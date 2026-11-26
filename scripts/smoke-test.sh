#!/usr/bin/env bash
# Smoke test for a running stack: does the app work end to end over HTTP?
# Usage: docker compose up --build --wait && bash scripts/smoke-test.sh
# The same script runs in CI. It stops at the first failed check with a clear message.
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
WEB_URL="${WEB_URL:-http://localhost:8080}"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "ok - $*"
}

check_health() {
  local body
  body=$(curl -sf "$API_URL/health") || fail "GET $API_URL/health did not answer 200"
  grep -q '"status":"ok"' <<<"$body" || fail "/health is not ok: $body"
  pass "API health is ok"
}

check_web_page() {
  local body
  body=$(curl -sf "$WEB_URL/") || fail "GET $WEB_URL/ did not answer 200"
  grep -q '<div id="root">' <<<"$body" || fail "the web page has no React root element"
  pass "web page loads"
}

# Without this header the browser blocks every API call from the web app (D22).
check_cors() {
  local headers
  headers=$(curl -sf -D - -o /dev/null -H "Origin: $WEB_URL" "$API_URL/tasks") ||
    fail "GET $API_URL/tasks did not answer 200"
  grep -qi "^access-control-allow-origin: $WEB_URL" <<<"$headers" ||
    fail "the API does not allow the web origin $WEB_URL (check CORS_ORIGIN)"
  pass "API allows the web origin"
}

check_create_and_list() {
  local title body id
  # A unique title, so a rerun never matches a task from an earlier run.
  title="smoke test $(date +%s)-$$"
  body=$(curl -sf -X POST -H 'Content-Type: application/json' \
    -d "{\"title\":\"$title\"}" "$API_URL/tasks") || fail "POST $API_URL/tasks did not succeed"
  id=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$body")
  [ -n "$id" ] || fail "POST /tasks returned no id: $body"
  pass "task created ($id)"

  body=$(curl -sf "$API_URL/tasks") || fail "GET $API_URL/tasks did not answer 200"
  grep -q "\"id\":\"$id\"" <<<"$body" || fail "the new task $id is not in the list"
  pass "new task is listed"
}

check_health
check_web_page
check_cors
check_create_and_list
echo "smoke test: OK"
