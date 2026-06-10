#!/usr/bin/env bash
# Lint structural integrity of uptime monitor docs.
# RED first per TDD — write this before docs. GREEN after docs ship.
set -e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CHECKLIST="docs/it/uptime-setup-checklist.md"
RUNBOOK="docs/it/uptime-monitors.md"
OPS="docs/operational-context.md"

fail=0
note() { echo "[uptime-lint] $1"; }
err()  { echo "[uptime-lint] FAIL: $1" >&2; fail=1; }

[ -f "$CHECKLIST" ] || err "missing $CHECKLIST"
[ -f "$RUNBOOK" ]   || err "missing $RUNBOOK"
[ -f "$OPS" ]       || err "missing $OPS"

# checklist must list 4 monitor specs (### Monitor N — name)
if [ -f "$CHECKLIST" ]; then
  COUNT=$(grep -c "^### Monitor" "$CHECKLIST" || true)
  if [ "$COUNT" -lt 4 ]; then err "checklist has $COUNT '### Monitor' headers, expected >= 4"; fi
fi

# runbook escalation policy
if [ -f "$RUNBOOK" ]; then
  grep -q "## Escalation Policy" "$RUNBOOK" || err "runbook missing '## Escalation Policy' section"
fi

# checklist cross-links to runbook
if [ -f "$CHECKLIST" ]; then
  grep -q "uptime-monitors.md" "$CHECKLIST" || err "checklist does not cross-link uptime-monitors.md"
fi

# operational-context.md mentions UptimeRobot
if [ -f "$OPS" ]; then
  grep -qi "uptimerobot" "$OPS" || err "operational-context.md missing UptimeRobot mention"
fi

# all 4 monitor URLs must appear verbatim in checklist
if [ -f "$CHECKLIST" ]; then
  for url in "https://api.darshya.online/health" "https://darshya.online" "https://darshya.online/pujas"; do
    grep -qF "$url" "$CHECKLIST" || err "checklist missing URL: $url"
  done
fi

if [ "$fail" -ne 0 ]; then
  echo "[uptime-lint] FAILED"
  exit 1
fi
echo "[uptime-lint] OK"
