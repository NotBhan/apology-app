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

# -------------------------------------------------------- V1: trigger exists
echo "== V1: function triggers available on this project =="
if command -v neon >/dev/null 2>&1; then
  if neon triggers list --output json > /tmp/triggers.json 2>/tmp/triggers.err; then
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
else
  note "V1 SKIPPED: neon CLI not installed"
fi

# ------------------------------------------------ V3/V4 + end-to-end deletion
echo "== V3/V4 + end-to-end deletion: running acceptance suite =="
ACCEPTANCE=1 npm run acceptance 2>&1 | tee /tmp/acceptance-suite.log
note "V3/V4/end-to-end PASS: acceptance suite green"

# ------------------------------------------------------- V2/V5: it actually ran
echo "== V2/V5: trigger fired =="
if command -v neon >/dev/null 2>&1; then
  neon logs query --source function --since 2h > /tmp/function-logs.txt 2>&1 || true
  if grep -qi "cleanup" /tmp/function-logs.txt; then
    note "V2 PASS: cleanup invocations present in the last 2h"
  else
    note "V2 UNVERIFIED: no cleanup invocation in the last 2h (the schedule may not have fired yet)"
  fi
  note "\`\`\`"
  tail -n 40 /tmp/function-logs.txt >> "${OUT}" || true
  note "\`\`\`"
else
  note "V2 SKIPPED: neon CLI not installed"
fi

# --------------------------------------------------------------- operator path
echo "== manual invocation is authenticated =="
if [ -n "${NEON_FUNCTION_URL:-}" ] && [ -n "${CLEANUP_SECRET:-}" ]; then
  code_ok=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${NEON_FUNCTION_URL}" \
    -H "x-cleanup-secret: ${CLEANUP_SECRET}")
  code_bad=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${NEON_FUNCTION_URL}" \
    -H "x-cleanup-secret: wrong-secret-value-that-is-long-enough")
  note "manual invocation: correct=${code_ok} wrong=${code_bad}"
  [ "${code_ok}" = "200" ] || fail "manual invocation with the correct secret returned ${code_ok}"
  [ "${code_bad}" = "401" ] || fail "manual invocation with a wrong secret returned ${code_bad}"
else
  note "manual invocation SKIPPED: NEON_FUNCTION_URL / CLEANUP_SECRET not set"
fi

echo
echo "Evidence written to ${OUT}"
