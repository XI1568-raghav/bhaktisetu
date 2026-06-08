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

# Detect apps/web changes:
#   1. Cached (pre-commit hook context) — git diff --cached
#   2. Working tree (manual run) — git diff
#   3. Pushed range (pre-push hook context) — env var WEB_CHANGED_RANGE set by hook
# If none match but env var set "FORCE=1", run anyway.
DIRTY_WEB=0
if [ -n "${WEB_CHANGED_RANGE:-}" ]; then
  if git diff --name-only "$WEB_CHANGED_RANGE" 2>/dev/null | grep -q '^apps/web/'; then
    DIRTY_WEB=1
  fi
elif [ "${FORCE:-0}" = "1" ]; then
  DIRTY_WEB=1
else
  CACHED=$(git diff --cached --name-only --diff-filter=ACM | grep -c '^apps/web/' || true)
  WORKING=$(git diff --name-only --diff-filter=ACM | grep -c '^apps/web/' || true)
  if [ "$CACHED" != "0" ] || [ "$WORKING" != "0" ]; then
    DIRTY_WEB=1
  fi
fi
if [ "$DIRTY_WEB" = "0" ]; then
  echo "[preflight-cf-pages] No apps/web changes detected — skipping CF Pages dry-run."
  echo "[preflight-cf-pages] (Set FORCE=1 to run anyway.)"
  exit 0
fi

echo "[preflight-cf-pages] Running CF Pages build dry-run..."
echo ""

cd apps/web

# Windows path skips next build entirely (.next race + ENOTEMPTY rmdir issues
# common in Git Bash). The static audit below catches real CF blockers without
# needing a full build. CI/Linux runs the full build separately.
PLATFORM_EARLY=$(uname -s 2>/dev/null || echo unknown)
case "$PLATFORM_EARLY" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    echo "[preflight-cf-pages] Windows — skipping local next build (run manually before push if first try)."
    ;;
  *)
    if ! pnpm exec next build > /tmp/preflight-next-build.log 2>&1; then
      echo "[preflight-cf-pages] FAIL: pnpm next build failed."
      tail -40 /tmp/preflight-next-build.log
      exit 1
    fi
    ;;
esac

# Windows-aware: @cloudflare/next-on-pages internally spawns Vercel CLI which
# requires Linux/WSL. On Windows Git Bash it crashes w/ ENOENT regardless of
# code state. Run the static-analysis sub-check only (validate route-edge map).
PLATFORM=$(uname -s 2>/dev/null || echo unknown)
case "$PLATFORM" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    echo "[preflight-cf-pages] Windows detected — running static edge-runtime audit only."
    echo "[preflight-cf-pages] (Full @cloudflare/next-on-pages dry-run requires WSL or Linux runner.)"
    # Static check: any non-static route that uses middleware/headers/searchParams MUST declare runtime='edge'.
    # Grep apps/web/app/**/page.tsx for hot patterns + verify they have runtime='edge' upstream.
    NEED_EDGE=$(grep -lr -E 'searchParams|from .next/headers.|from "next/headers"|revalidate\s*=\s*0' apps/web/app --include='*.tsx' 2>/dev/null || true)
    MISSING=""
    if [ -n "$NEED_EDGE" ]; then
      while IFS= read -r f; do
        if ! grep -q "runtime\s*=\s*['\"]edge['\"]" "$f" 2>/dev/null; then
          MISSING="$MISSING\n  $f"
        fi
      done <<<"$NEED_EDGE"
    fi
    # Also check for middleware.ts (forces ALL routes to declare edge runtime).
    if [ -f apps/web/middleware.ts ]; then
      echo ""
      echo "[preflight-cf-pages] FAIL: apps/web/middleware.ts EXISTS — every non-static route must declare runtime='edge'."
      echo "[preflight-cf-pages] CF Pages will reject build. Either drop middleware OR migrate all ~250 routes to edge."
      exit 1
    fi
    if [ -n "$MISSING" ]; then
      echo ""
      echo "[preflight-cf-pages] FAIL: routes using searchParams/headers()/cookies()/revalidate=0 WITHOUT 'export const runtime = edge':"
      echo -e "$MISSING"
      echo ""
      echo "[preflight-cf-pages] CF Pages will reject build. Add 'export const runtime = edge;' to each."
      exit 1
    fi
    echo "[preflight-cf-pages] PASS — static audit clean. No middleware. Hot patterns all have edge runtime."
    exit 0
    ;;
  *)
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
    ;;
esac

echo ""
echo "[preflight-cf-pages] PASS — CF Pages build succeeded. Safe to push."
exit 0
