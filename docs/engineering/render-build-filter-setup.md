# Render build filter setup — stop quota burn

> Founder action, ~5 min. Closes the 2026-06-15→17 incident (~80 failed Render deploys from R5 + docs commits exhausting free-tier pipeline minutes).

## Root cause

Render auto-deploys `bhaktisetu-api` on **every** push to `main`, regardless of `[skip ci]` tag. Render does not honor `[skip ci]` — that's CF Pages-only.

Result: R5 (12 PRs merged) + ~120 docs commits = ~130 deploys triggered → free-tier quota exhausted mid-cycle → all builds blocked "Your workspace has run out of pipeline minutes" until reset.

Prod stayed healthy throughout (api.darshya.online + darshya.online both 200) because Render keeps the last successful deploy live when new builds fail. No outage. Just zero new api deploys for ~48h.

## Fix 1 — Render Build Filter (5 min, founder dashboard)

1. Open https://dashboard.render.com/ → click `bhaktisetu-api` (the Fastify backend Web Service).
2. **Settings** tab → scroll to **Build & Deploy**.
3. Find **Auto-Deploy** section → **Build Filter** → click **Edit**.
4. Paste under **Included Paths** (one per line):

```
apps/api/**
packages/**
package.json
pnpm-lock.yaml
prisma/**
```

5. Leave **Ignored Paths** blank (Included acts as allow-list).
6. **Save Changes**.

Render now only triggers a build when one of those paths changes. Docs commits, web commits, mobile commits, agent reports, roadmap items → all skipped at Render level. Estimated reduction: ~80% of historical commit volume.

## Fix 2 — `[skip render]` convention (immediate, no founder action)

Already added to CLAUDE.md rules. Future agent commits append `[skip render]` to docs/non-api commits:

```
docs(roadmap): orchestrator cycle [skip ci] [skip render]
```

Render honors `[skip render]` in commit message subject. Combined with Fix 1, double-safety: even if the path filter misses an edge case, the tag stops the build.

## Fix 3 — quota reset

Free-tier Render pipeline minutes reset monthly. Last burnout: 2026-06-15. Next reset: 2026-07-01. Until then, new pushes queue but fail at "out of minutes". Prod unaffected (last successful deploy stays live).

## Verify after applying Fix 1

Push a docs-only commit:

```bash
echo "test" >> README.md
git add README.md && git commit -m "docs: render filter test [skip ci] [skip render]"
git push origin main
```

Expected:
- CF Pages dashboard: no new build (skip ci honored).
- Render dashboard `bhaktisetu-api` deploy log: no new deploy listed (path filter excluded README.md).

If Render still shows a new build attempt → path filter not active. Re-check the Included Paths entry, ensure each line is its own pattern, no leading slash, no quotes.

## Free-tier quota tracker (per `docs/free-tier-budgets.md`)

| Service | Cap | Pre-Fix-1 burn rate | Post-Fix-1 estimated |
|---|---|---|---|
| Render builds | ~500 min/mo (free) | ~130 deploys/cycle (R5 burned all) | ~20 deploys/mo (only api changes) |
| CF Pages builds | 500/mo | ~30/mo w/ `[skip ci]` discipline | unchanged |
| GH Actions min | 2000/mo | ~846/mo baseline | unchanged |

## Why not just pay $7/mo Render Starter?

Reserved decision. Free-tier discipline is the project doctrine (`docs/free-tier-budgets.md`). Path filter + `[skip render]` together = $0 fix that scales indefinitely. Starter tier upgrade only justified if api changes themselves exceed free quota (currently nowhere close).
