# Option 2 — Founder Paste Sheet (one-time, ~5 min)

## Why

GH Actions cron now only fires a 5-second curl. Render Background Worker runs the orchestrator with unlimited time + full sub-agent fan-out (3-7 spawn, 5 concurrent, 8min per sub-agent).

Without the secrets below, the Render endpoint returns 401 (auth fail) or the bg-wrapper exits 1 (no PAT for push). Cycle does nothing.

## Step 1 — Generate the shared secret + GH PAT

### Shared secret (`ORCHESTRATOR_TRIGGER_SECRET`)

```bash
openssl rand -hex 32
# Copy the 64-char hex string — paste it in BOTH Render + GH below
```

### GitHub fine-grained PAT (`GH_ORCHESTRATOR_PAT`)

1. https://github.com/settings/personal-access-tokens/new
2. Token name: `bhaktisetu-orchestrator-bot`
3. Expiration: **1 year** (calendar reminder to rotate)
4. Repository access: **Only select repositories** → `XI1568-raghav/bhaktisetu`
5. Repository permissions:
   - **Contents** → **Read and write** ← MUST
   - everything else → No access
6. Generate token. Copy `github_pat_...` value.

## Step 2 — Paste in Render dashboard

Service: **api** (the Fastify service backing `api.darshya.online`)

Environment → Add the following:

| Key | Value |
|---|---|
| `GH_ORCHESTRATOR_PAT` | `github_pat_...` (from Step 1) |
| `ORCHESTRATOR_TRIGGER_SECRET` | 64-char hex (from Step 1) |
| `GH_REPO` | `XI1568-raghav/bhaktisetu` *(optional, this is the default)* |

Verify the following already exist (they should, used by other agents):

- `ANTHROPIC_API_KEY` (or `ANTHROPIC_API_KEY_BLACKBOX_PROXY` → map to `ANTHROPIC_API_KEY`)
- `ANTHROPIC_BASE_URL`
- `SUPABASE_DIRECT_URL`
- `DATABASE_URL_READONLY`
- `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`
- `RENDER_API_KEY` (yes, Render needs its own key to introspect its own services)
- `CF_ANALYTICS_TOKEN`

Click **Save changes**. Render redeploys (~2 min).

## Step 3 — Paste in GitHub repo secrets

https://github.com/XI1568-raghav/bhaktisetu/settings/secrets/actions

| Name | Value |
|---|---|
| `ORCHESTRATOR_TRIGGER_SECRET` | **same 64-char hex** as Render |
| `RENDER_API_URL` | `https://api.darshya.online` |

## Step 4 — Smoke test

After Render finishes redeploying, run from your terminal:

```bash
# 1. Verify endpoint exists + auth gate works
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://api.darshya.online/api/v1/admin/roadmap/orchestrator-trigger \
  -H "Content-Type: application/json" \
  -H "X-Orchestrator-Secret: wrong" \
  -d '{"dryRun":true}'
# Expect: 401

# 2. Real trigger (paste your secret)
SECRET="<paste 64-char hex>"
curl -s -X POST \
  https://api.darshya.online/api/v1/admin/roadmap/orchestrator-trigger \
  -H "Content-Type: application/json" \
  -H "X-Orchestrator-Secret: $SECRET" \
  -d '{"dryRun":true}' | head -c 500
# Expect: 202 + {"ok":true,"cycleId":"C-...","pollAt":"/api/v1/.../orchestrator-status?cycleId=..."}

# 3. Tail logs (wait ~30sec for orchestrator to start)
sleep 30
curl -s "https://api.darshya.online/api/v1/admin/roadmap/orchestrator-status" | head -c 2000
# Expect: latest cycle in flight, log tail showing "==== Orchestrator BG wrapper start ===="
```

## Step 5 — Verify GH workflow

```bash
gh workflow run roadmap-loop.yml -f dry_run=true
gh run watch
```

The workflow should complete in ~30 seconds (only does the curl POST). Render does the heavy work in the background.

## Step 6 — Verify end-to-end push

Watch for the orchestrator commit on main:

```bash
sleep 600  # give orchestrator ~10min to finish
git fetch origin
git log origin/main --oneline -5
# Expect: top commit = "roadmap: orchestrator cycle C-... (dryrun) [skip ci]"
```

Then check `/admin/roadmap` dashboard — new queue files should appear under `_dryrun/queue/`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| GH workflow fails with "RENDER_API_URL not set" | Add `RENDER_API_URL` to GH repo secrets |
| GH workflow gets 401 | `ORCHESTRATOR_TRIGGER_SECRET` mismatch between GH + Render |
| Render endpoint returns 500 + "orchestrator script missing" | Render service hasn't redeployed yet — wait or trigger manual deploy |
| Cycle starts but no push appears on main | Tail `/orchestrator-status` — likely `PUSH FAILED` because PAT missing/wrong scope |
| Cycle stuck "in flight" >2hr | Lock file stale. Delete `docs/roadmap/_lock.json` manually + push |

## CRITICAL — Render free-tier survival (2026-06-12 update)

Cycle 8 was killed mid-execution by Render free-tier container restart. **Render free tier WILL kill bg-spawned children unpredictably** for: deploys (every git push to api files), env-var changes, periodic free-tier rebalances, OOM events.

### Mitigations applied in code (already shipped, no founder action)

1. Decision Agent maxTokens 32k → 16k (faster completion = smaller restart-kill window)
2. Sub-agent maxTokens 16k → 12k (same reason)
3. Sub-agent wall-clock 12min → 8min
4. Concurrency 4 → 3 (lower 512MB Render memory peak)
5. Lock TTL 90min → 15min (faster retry after silent kill)
6. Resume state file (`docs/roadmap/_cycle-resume.json`) — best-effort: if orchestrator completes Decision but Render kills before sub-agents, next cycle skips Decision (saves Opus call)

Net: cycle wall-clock ~20min → ~8min. Restart window ~2.5× less likely to overlap.

### Mitigations founder can apply in Render dashboard

**Disable Render's build-on-every-commit behaviour** — **ALREADY DONE, no founder action left**
(corrected 2026-09-02, `OPS-06`; this section used to be written as a pending
recommendation, which read as though pushes still redeployed).

`render.yaml` sets `autoDeploy: false` on **both** services (`:28` API, `:60`
web), so a commit reaching `main` already triggers no Render build and cannot
kill an in-flight orchestrator cycle. There is nothing to toggle.

**Consequence, and it is the whole point of the setting**: a code fix to
`apps/api` does not reach production by being merged. Deploys are dispatched by
hand — `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID>`
(API sid `srv-d7mc2n8sfn5c73dfce0g`), procedure in `docs/runbooks/prod-rollback.md`.

### If cycles still fail after both mitigations

Last resort: pay $7/mo for Render Background Worker — actual persistent process, no restart-kills. Document in `docs/free-tier-budgets.md` if/when crossed.

## Cost accounting

| Resource | Cost per cycle | Cycles/mo | Monthly |
|---|---|---|---|
| GH Actions (5min trigger + poll) | ~5 GH-min | 120 (4/day) | 600 GH-min |
| Render bg-worker (orchestrator) | ~5-15min CPU | 120 | ~25 Render-hours |
| Anthropic Opus 4.7 (Decision Agent + 5 sub-agents) | ~200k tokens | 120 | ~24M tokens |

GH free tier: 2000/mo → 30% utilized.
Render free tier: 750h/mo → 3% utilized.
Anthropic: Blackbox proxy (already provisioned).

All within free-tier budgets.
