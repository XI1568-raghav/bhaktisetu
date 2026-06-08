#!/usr/bin/env bash
# preflight-cf-pages.sh
#
# Runs the EXACT same build CF Pages will run in prod. Catches:
#   - Non-edge route + dynamic feature combos (searchParams w/o runtime='edge')
#   - middleware.ts presence forcing all routes to declare runtime='edge'
#   - Invalid prerender configs flagged by @cloudflare/next-on-pages
#   - Any other CF-only error that `next build` alone misses
#
# Run BEFORE every `git push` that touches apps/web/**.
#
# Usage:
#   bash scripts/preflight-cf-pages.sh
#
# Exit 0 = safe to push. Exit 1 = will break CF Pages, do NOT push.

set -euo pipefail

cd "$(dirname "$0")/.."

DIRTY_WEB=$(git diff --cached --name-only --diff-filter=ACM | grep -c '^apps/web/' || true)
if [ "$DIRTY_WEB" = "0" ]; then
  echo "[preflight-cf-pages] No staged apps/web changes — skipping CF Pages dry-run."
  exit 0
fi

echo "[preflight-cf-pages] Running CF Pages build dry-run (this catches what 'next build' misses)..."
echo ""

# Same command Cloudflare Pages runs in prod (see wrangler.toml + .github/workflows)
cd apps/web
if ! pnpm exec next build > /tmp/preflight-next-build.log 2>&1; then
  echo "[preflight-cf-pages] FAIL: pnpm next build failed."
  tail -40 /tmp/preflight-next-build.log
  exit 1
fi

if ! pnpm dlx @cloudflare/next-on-pages > /tmp/preflight-cf-build.log 2>&1; then
  echo ""
  echo "[preflight-cf-pages] FAIL: @cloudflare/next-on-pages build failed."
  echo "[preflight-cf-pages] CF Pages prod will fail with the same error. DO NOT push."
  echo ""
  echo "── Last 80 lines of failure log ────────────────────────"
  tail -80 /tmp/preflight-cf-build.log
  echo ""
  echo "── Common fixes ────────────────────────────────────────"
  echo "  1. Dynamic route w/o edge runtime: add 'export const runtime = edge;'"
  echo "  2. middleware.ts present: every non-static route MUST add runtime = edge"
  echo "  3. searchParams in server component: add 'export const runtime = edge;'"
  exit 1
fi

echo ""
echo "[preflight-cf-pages] PASS — CF Pages build succeeded. Safe to push."
exit 0
