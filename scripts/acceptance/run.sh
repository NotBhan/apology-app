#!/usr/bin/env bash
# Production infrastructure acceptance.
#
# Runs the checks that can only be answered by the real providers, then writes
# an evidence file. Never fabricates a result: if a command fails, the script
# stops and reports it.
#
#   ./scripts/acceptance/run.sh
#
# Requires: DATABASE_URL, FILEBASE_* , and `neon` CLI (>= 4.21) linked to the
# project, plus `openssl` and `curl`.

set -euo pipefail

EVIDENCE_DIR="docs/evidence"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${EVIDENCE_DIR}/acceptance-${STAMP}.md"
mkdir -p "${EVIDENCE_DIR}"

fail() { echo "FAIL: $*" >&2; exit 1; }
note() { echo "- $*" >> "${OUT}"; }

require() {
  [ -n "${!1:-}" ] || fail "missing required environment variable: $1"
}

echo "# Acceptance run ${STAMP}" > "${OUT}"
note "host: $(uname -srm)"
note "node: $(node --version)"

# ---------------------------------------------------------------- preflight
require DATABASE_URL
require FILEBASE_ACCESS_KEY
require FILEBASE_SECRET_KEY
require FILEBASE_BUCKET
note "database: configured"
note "storage bucket: ${FILEBASE_BUCKET}"
note "storage endpoint: ${FILEBASE_ENDPOINT:-https://s3.filebase.io}"
note "storage region: ${FILEBASE_REGION:-auto}"

# The gate checks need the Neon CLI. Missing tooling fails the run rather than
# downgrading V1/V2 to "SKIPPED" and still exiting 0.
if command -v neon >/dev/null 2>&1; then
  NEON_CMD=(neon)
elif command -v npx >/dev/null 2>&1; then
  NEON_CMD=(npx --yes neon@latest)
else
  fail "cannot verify V1/V2: neither 'neon' nor 'npx' is available"
fi

# -------------------------------------------------------- V1: trigger exists
echo "== V1: function triggers available on this project =="
if "${NEON_CMD[@]}" triggers list --output json > /tmp/triggers.json 2>/tmp/triggers.err; then
  note "V1 PASS: \`neon triggers list\` succeeded"
  note "\`\`\`json"
  sed 's/^/  /' /tmp/triggers.json >> "${OUT}"
  note "\`\`\`"
  python3 - <<'PY' >> "${OUT}" 2>/dev/null || true
import json
data = json.load(open("/tmp/triggers.json"))
items = data if isinstance(data, list) else data.get("triggers", [])
for t in items:
    print(f"- trigger `{t.get('name')}` next run: {t.get('nextRunAt') or t.get('next_run_at')}")
PY
else
  note "V1 FAIL: \`neon triggers list\` errored"
  sed 's/^/  /' /tmp/triggers.err >> "${OUT}"
  fail "V1 failed — see ${OUT}"
fi

# ------------------------------------------------ V3/V4 + end-to-end deletion
echo "== V3/V4 + end-to-end deletion: running acceptance suite =="
ACCEPTANCE=1 npm run acceptance 2>&1 | tee /tmp/acceptance-suite.log
note "V3/V4/end-to-end PASS: acceptance suite green"

# ------------------------------------------------------- V2/V5: it actually ran
echo "== V2/V5: trigger fired =="
"${NEON_CMD[@]}" logs query --branch production --source function --since 2h > /tmp/function-logs.txt 2>&1 || true
if grep -q "trigger delivery" /tmp/function-logs.txt; then
  note "V2 PASS: a scheduled delivery reached the function"
  v2_ok=1
else
  note "V2 UNVERIFIED: no scheduled delivery in the last 2h; a manual invocation does not satisfy this gate"
  v2_ok=0
fi
note "\`\`\`"
tail -n 40 /tmp/function-logs.txt >> "${OUT}" || true
note "\`\`\`"
[ "${v2_ok}" = "1" ] || fail "V2 is not verified — see ${OUT}"

# --------------------------------------------------------------- operator path
echo "== manual invocation is authenticated =="
# A cold function or a dropped connection can fail before any HTTP status is
# returned. Retry those; a real status is reported as-is.
post_cleanup() {
  local secret="$1" code attempt
  for attempt in 1 2 3; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${NEON_FUNCTION_URL}" \
      -H "x-cleanup-secret: ${secret}" 2>/dev/null) || code="000"
    if [ "${code}" != "000" ]; then
      printf '%s' "${code}"
      return 0
    fi
    sleep 1
  done
  printf '%s' "${code}"
}

if [ -n "${NEON_FUNCTION_URL:-}" ] && [ -n "${CLEANUP_SECRET:-}" ]; then
  code_ok=$(post_cleanup "${CLEANUP_SECRET}")
  code_bad=$(post_cleanup "wrong-secret-value-that-is-long-enough")
  note "manual invocation: correct=${code_ok} wrong=${code_bad}"
  [ "${code_ok}" = "200" ] || fail "manual invocation with the correct secret returned ${code_ok}"
  [ "${code_bad}" = "401" ] || fail "manual invocation with a wrong secret returned ${code_bad}"
else
  note "manual invocation SKIPPED: NEON_FUNCTION_URL / CLEANUP_SECRET not set"
fi

echo
echo "Evidence written to ${OUT}"
