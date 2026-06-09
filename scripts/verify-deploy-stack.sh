#!/usr/bin/env bash
#
# verify-deploy-stack.sh — Pre-deploy global verification.
# Checks API + DB + BE + FE all working BEFORE allowing push.
#
# Usage:
#   bash scripts/verify-deploy-stack.sh          # local dev verify
#   bash scripts/verify-deploy-stack.sh prod     # post-deploy prod verify
#
# Exits 0 only if every layer GREEN. Pre-push hook calls this.

set -e

MODE="${1:-local}"

if [ "$MODE" = "prod" ]; then
  WEB_BASE="https://darshya.online"
  API_BASE="https://api.darshya.online"
else
  WEB_BASE="http://localhost:3000"
  API_BASE="http://localhost:8787"
fi

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  local actual
  actual=$(eval "$cmd" 2>/dev/null || echo "ERROR")
  if [ "$actual" = "$expected" ]; then
    echo "  PASS: $name (got: $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

check_grep() {
  local name="$1"
  local url="$2"
  local pattern="$3"
  local count
  count=$(curl -s "$url" 2>/dev/null | grep -c "$pattern" || echo "0")
  if [ "$count" -gt "0" ]; then
    echo "  PASS: $name (matches: $count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (pattern '$pattern' NOT found)"
    FAIL=$((FAIL + 1))
  fi
}

check_grep_zero() {
  local name="$1"
  local url="$2"
  local pattern="$3"
  local count
  count=$(curl -s "$url" 2>/dev/null | grep -c "$pattern" 2>/dev/null | head -1)
  count="${count:-0}"
  if [ "$count" = "0" ]; then
    echo "  PASS: $name (correctly absent)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (pattern '$pattern' SHOULD NOT exist, found: $count)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Pre-Deploy Global Stack Verification ($MODE) ==="
echo ""

# Layer 1: API health (BE alive, DB reachable)
echo "[1/5] BE + DB Layer"
check "API health" "curl -s -o /dev/null -w '%{http_code}' $API_BASE/health" "200"

# Layer 2: API critical endpoints
echo ""
echo "[2/5] API Critical Endpoints"
check "/api/v1/temples returns" "curl -s -o /dev/null -w '%{http_code}' $API_BASE/api/v1/temples" "200"
check "/api/v1/pujas/types returns" "curl -s -o /dev/null -w '%{http_code}' $API_BASE/api/v1/pujas/types" "200"
AUTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"email":"nonexistent@test.fake","password":"wrong-password-1234"}' $API_BASE/api/v1/auth/login 2>/dev/null)
if [ "$AUTH_CODE" = "401" ] || [ "$AUTH_CODE" = "400" ]; then
  echo "  PASS: /api/v1/auth/login rejects bad creds (got: $AUTH_CODE)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: /api/v1/auth/login expected 400/401 got $AUTH_CODE"
  FAIL=$((FAIL + 1))
fi

# Layer 3: FE pages render
echo ""
echo "[3/5] FE Page Renders"
check "Home renders" "curl -s -o /dev/null -w '%{http_code}' $WEB_BASE/" "200"
check "Kundli renders" "curl -s -o /dev/null -w '%{http_code}' $WEB_BASE/astrology/kundli" "200"
check "Pujas list renders" "curl -s -o /dev/null -w '%{http_code}' $WEB_BASE/pujas" "200"
check "Profile renders" "curl -s -o /dev/null -w '%{http_code}' $WEB_BASE/profile" "200"

# Layer 4: FE feature presence (the actual fixes)
echo ""
echo "[4/5] FE Feature Verification"
check_grep_zero "StickyHeadlinePin removed from home" "$WEB_BASE/?v=$$" "See divinity. Hear devotion"
check_grep "Golden Temple object-center applied" "$WEB_BASE/?v=$$" "object-cover object-center"
check_grep "Trust strip rendered" "$WEB_BASE/?v=$$" "verified temples"
check_grep "Section padding tightened (py-6)" "$WEB_BASE/?v=$$" "py-6 md:py-8"
check_grep "CityAutocomplete combobox on kundli" "$WEB_BASE/astrology/kundli?v=$$" "combobox"

# Layer 5: Security headers
echo ""
echo "[5/5] Security Headers"
CSP=$(curl -sI "$WEB_BASE/" 2>/dev/null | grep -i "content-security-policy" | wc -l)
if [ "$CSP" -ge "1" ]; then
  echo "  PASS: CSP header present"
  PASS=$((PASS + 1))
else
  echo "  WARN: CSP header absent (acceptable on free-tier)"
fi

echo ""
echo "=== Result: $PASS PASS, $FAIL FAIL ==="
echo ""

if [ "$FAIL" -gt "0" ]; then
  echo "BLOCKED: $FAIL checks failed. Fix issues before pushing."
  exit 1
fi

echo "ALL GREEN. Safe to deploy."
exit 0
