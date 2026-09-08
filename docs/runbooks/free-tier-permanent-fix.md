# Staying inside the free tier, permanently

**Written 2026-09-01, the day the monthly quotas reset and production came back
after a 15-day outage.** The point of this document is that the outage was not
bad luck, and will happen again on roughly the 16th of every month unless
something structural changes. Two ceilings are in danger, not one.

`docs/free-tier-budgets.md` remains the per-service reference table. This file is
the *decision* and the *procedure*.

---

## 1. Render instance-hours — over by 2x, structurally

**The arithmetic.** Render's free tier grants **750 instance-hours per MONTH per
ACCOUNT** — not per service. Darshya runs two always-on web services:

| Scenario | Hours in a 30-day month | Fits in 750? |
|---|---:|---|
| 1 service always-on | ~720 | yes, ~30 h spare |
| **2 services always-on (today)** | **~1,440** | **no — over by ~690** |

On **2026-08-17** the account reached 750.2/750 and Render suspended **both**
services (`"suspenders": ["billing"]`). `darshya.online` and
`api.darshya.online` served 503 for three days before anyone noticed, and stayed
down until the quota reset on 2026-09-01.

**Cron tuning cannot fix this, and it was already tried.** Only three workflows
wake production — `agents-daily`, `agents-health` (×2/day) and `e2e` (weekly) —
worth about 23 h/month. That is **3% of a ~690-hour deficit**. The overrun is
arithmetic, not waste.

**Spin-down does not save us either.** Free services sleep after 15 minutes of
inactivity, but `darshya.online` is a public SEO surface with a 1,633-URL sitemap
and 58 indexed deep links. Crawler traffic alone keeps it awake most of the day —
which is precisely what the August numbers show: ~750 hours consumed across two
services in ~16 days is ~22 h/day each.

### The only three real options

| | Option | Monthly hours | Cost | Risk |
|---|---|---:|---:|---|
| **A** | **Merge web + API into ONE service** | ~720 | ₹0 | 512 MB RAM shared by two Node runtimes |
| B | Move web to a static host, API stays | ~720 | ₹0 | large migration: 157 ISR pages, middleware, image optimisation |
| C | Pay for a second service | ~1,440 | ~$7/mo | none |

**Chosen: A.** B is a multi-week migration that gives up Next features the app
uses. C is the right answer the moment there is revenue — and if A proves too
tight on memory, C is cheaper than the engineering time to shave another 80 MB.

### What has been built for option A

- `Dockerfile.combined` — builds both apps into one image.
- `scripts/render-combined-server.mjs` — boots the Fastify API and the Next
  standalone server as child processes behind a host-routing proxy, after running
  `prisma migrate deploy`. `api.darshya.online` → Fastify, everything else →
  Next, so **no client, CORS or mobile-app change is required**; the mobile app
  calls the API host directly and never goes through Next.
- `scripts/render-combined-server.test.mjs` — 11 routing tests, green, including
  the over-broad-match traps (`/healthcare`, `/apiary`, `therapist.darshya.online`).

**NOT YET VERIFIED, and this matters:** there is no Docker daemon on the
development machine, so **the combined image has never been built or run**. The
routing logic is unit-tested; the Dockerfile layering, the process supervision
under load, and above all the **memory footprint on a 512 MB instance are
untested assumptions**. Treat the first deploy as an experiment with a rollback
ready, not as a finished migration.

### Flip procedure (do this on a quiet day, not alongside a feature deploy)

1. Confirm both services are currently healthy and note the current commit.
2. In the Render dashboard, on **`darshya-web`**: set Dockerfile path to
   `Dockerfile.combined`. Leave the build filter alone for now.
3. Add **`api.darshya.online`** as a second custom domain on `darshya-web`.
4. Copy every runtime env var from `bhaktisetu` (API) onto `darshya-web` —
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, Razorpay keys, Supabase
   service-role, Resend. Miss one and the API half boots broken.
5. Deploy `darshya-web`. Watch the log for `[combined] proxy listening`.
6. Verify **before** touching DNS or the old service:
   ```bash
   curl -sI https://darshya-web.onrender.com/ | head -1
   curl -s  -H 'Host: api.darshya.online' https://darshya-web.onrender.com/health
   ```
7. Repoint the `api` DNS record to `darshya-web.onrender.com`.
8. Re-run the full uptime target list (all 14 must be 200):
   `node scripts/agents/uptime-pinger.mjs`
9. **Only then** suspend `bhaktisetu` in the Render dashboard. Suspend, do not
   delete — it is the rollback.

**Rollback:** un-suspend `bhaktisetu`, point `api` DNS back at it, and put
`darshya-web`'s Dockerfile path back to `apps/web/Dockerfile` in the Render
dashboard. No repository change is involved in either direction — and note that
no repository change would help if it were: `autoDeploy: false` on both services
(`render.yaml:28`, `:60`) means a commit and push deploys nothing. After putting
the Dockerfile path back, dispatch the deploy yourself so the setting takes
effect:

```bash
gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g
```

See `docs/runbooks/prod-rollback.md` for the full rollback decision table.

**Watch for:** OOM restarts in the Render log. If the container restarts under
normal traffic, option A has failed on memory and the answer is option C.

---

## 2. GitHub Actions minutes — 147 minutes of headroom, and everything depends on it

The second ceiling, and the less obvious one. Estimated burn is **~1,853 of
2,000 min/mo — about 7% headroom**. `OPS-09` states the risk plainly: *all*
production monitoring rides on this quota, and it has been exhausted once
already. A quota that fails takes the watchers down with it, which is how a
three-day outage goes unnoticed.

### The single biggest line item is dry-run output nobody reads

| Workflow | Trigger | Min/mo | Share |
|---|---|---:|---:|
| **`roadmap-loop.yml`** | **every 12h** | **720** | **39%** |
| `ci.yml` | PR + push | ~416 | 22% |
| `agents-health.yml` | every 12h | 180 | 10% |
| `db-backup.yml` | daily | 150 | 8% |

`roadmap-loop.yml` runs twice a day with `timeout-minutes: 50`, defaulting to
`DRY_RUN=true`. As of today it has produced **148 queued dry-run items that
nothing has consumed**, and its own budget tracker
(`docs/roadmap/_budget-snapshot.json`) has been frozen at `"month": "2026-06"`
with `ghMinutes.used: 0` since June — so the thing meant to watch the budget has
not recorded a single minute.

The 14-day soak that was supposed to gate this engine to live (ARE Phase 6) was
never completed. Until it is, twice-daily cycles buy nothing that a weekly cycle
does not.

**Change made:** cadence reduced to weekly. Saving **~660 min/mo**, taking the
fleet from ~1,853 to **~1,193 min/mo — roughly 800 minutes of headroom** instead
of 147. Reverting is one line in the cron if the soak resumes.

---

## 3. The other ceilings

| Resource | Cap | Status | First thing that will break it |
|---|---|---|---|
| Supabase DB | 500 MB | fine | agent report rows, `DailyPanchang` growth |
| Supabase egress | 5 GB/mo | fine | hotlinked images if ever self-hosted |
| **Resend email** | **100/day** | **first business cap** | `SCAL-11`: ~30 signups/day exhausts it |
| Render build minutes | 500/mo | fine | batch commits; every push builds both |
| Sentry | 5k errors/mo | fine | an error loop in production |
| Cloudflare | n/a post-cutover | fine | — |

**Resend is the first cap that real success will hit**, not a bug — around 30
signups a day. That is an owner spending decision (`SCAL-11`), not an
engineering one.

---

## 4. Monthly checklist — first working day of the month

1. `https://render.com/billing` — read the instance-hours figure. Under 1 service
   it should track ~24 h/day. If it is tracking ~48, a second service is awake
   and the clock to suspension is ~15 days.
2. `https://github.com/settings/billing` — Actions minutes used. Anything over
   1,400 by mid-month needs a workflow cut.
3. Confirm `render-hours-guard.yml` ran in the last 24h:
   `gh run list --workflow=render-hours-guard.yml --limit 3`
4. Run the uptime targets and expect **14/14 green**:
   `node scripts/agents/uptime-pinger.mjs`

### Before adding any workflow, cron, integration or SDK

Read `docs/free-tier-budgets.md`, add your row to the table, and check the total
still clears the cap. Two of the three incidents in this repository's history
came from a workflow that was never modelled — `commitlint.yml` and
`ai-review.yml` ran for months without appearing in the budget at all.

---

## 5. What actually caused the outage

Not the hours. The **silence**.

The hours were arithmetic anyone could have predicted, and
`docs/free-tier-budgets.md` did predict them on 2026-08-20 — three days *after*
the suspension. The failure was that nothing said anything for three days.

Two contributors, both now fixed:

- `render-hours-guard.yml` existed but lived only on a feature branch. **GitHub
  only registers `schedule:` and `workflow_dispatch` triggers from the DEFAULT
  branch**, so it could not fire, and `--ref` cannot conjure a trigger for a file
  main has never seen. Merging it is the installation step (`OPS-08`).
- The uptime pinger had **two of fourteen targets permanently 404ing** —
  `/healthz` (the API serves `/health`) and `/api/v1/puja-types` (the route is
  `/api/v1/pujas/types`). Both had failed on every run since the pinger was
  written. A monitor that is always partly red teaches its reader that red is the
  normal colour. Fixed and verified against production; guarded by
  `scripts/agents/uptime-pinger.targets.test.mjs`, which checks every polled API
  path against the prefixes `server.ts` actually registers.
