# Runbook — roll back / redeploy production

> **Status: authoritative.** Written 2026-08-20 for `OPS-06`.
> Supersedes the rollback paragraphs in `docs/deploy-runbook-2026-04-28.md`
> (§"Rollback procedures") and `docs/sentry-releases.md` (§"Reverting a bad
> release"). Both of those used to say *revert the commit and push*. **That does
> nothing.** See "Why the old procedure cannot work" below before you argue
> with this file.
>
> Updated 2026-08-28: both of those sections have since been rewritten to point
> here, each keeping the old command visible and explicitly marked as deploying
> nothing — so a reader who half-remembers it is corrected rather than left to
> re-derive the failure. `docs/render-web-cutover-runbook.md` was corrected the
> same way on 2026-08-20. If you find any *other* page still presenting a revert
> as a rollback, it is stale and this file wins.

## TL;DR

```bash
# 1. Find the last good commit for the service you are rolling back.
gh workflow run render-diag.yml -f mode=deploys -f sid=<SID>
gh run watch                                   # read the deploy list it prints

# 2. Deploy that commit. THIS is the rollback.
gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>
gh run watch                                   # polls to live, then curls the service
```

| Service | Render service id | Public URL |
|---|---|---|
| API (`bhaktisetu`) | `srv-d7mc2n8sfn5c73dfce0g` | `https://api.darshya.online` |
| Web (`darshya-web`) | `srv-d970l2ks728c738fc33g` | `https://darshya.online` |

---

## Why the old procedure cannot work

`render.yaml` sets `autoDeploy: false` on **both** services (`:28` for the API,
`:60` for the web). That was deliberate — on the free tier a new push to `main`
cancels any in-flight deploy, so auto-deploy meant a code merge could be silently
killed by the next docs push.

The consequence nobody wrote down is that **nothing in this repository deploys on
push**. `git revert && git push` produces a clean history and leaves the exact
same bytes serving traffic. There is no `deploy-on-main` workflow;
`deploy-web-render.yml` is a Docker *smoke build* that never touches the Render
service, and `render-cutover.yml` is a one-shot migration script from July.

The only thing that changes what production runs is a `workflow_dispatch` on
`.github/workflows/render-diag.yml`.

Until 2026-08-20 that dispatch could not roll back either. Its `branch` input was
declared, bound into the step environment, and never referenced; the request body
contained only `clearCache`. Render's create-deploy API accepts `commitId` and
`clearCache` — not a branch — so the dispatch could only ever redeploy whatever
the service's tracked branch already pointed at. A rollback therefore required
authoring, reviewing and merging a revert *while production was down*. The
`commit` input added on 2026-08-20 is the lever that removes that step.

---

## 1. Decide what you are rolling back

| Symptom | Roll back | Notes |
|---|---|---|
| API 5xx after a deploy | API only | Web is mostly static/ISR and usually keeps serving |
| Page renders but data is wrong/missing | API first | The web calls the API during SSR on 7 pages |
| Layout/route/build breakage on the site | Web only | |
| **Both** return 503 with `x-render-routing` naming suspension | **Neither — this is not a code fault** | Jump to §5 |

A 503 from *both* hosts at once is almost never a bad deploy. It is the
account-wide free instance-hour cap. Check `render-hours-guard.yml` first; it
runs daily and opens an issue when either service is suspended.

## 2. Find the last good commit

```bash
gh workflow run render-diag.yml -f mode=deploys -f sid=<SID>
```

The step prints, newest first:

```
2026-08-16T09:12:04Z  live          commit=<sha>  id=dep-...  cache=do_not_clear
2026-08-15T18:40:11Z  build_failed  commit=<sha>  id=dep-...
```

Take the newest row with status `live` that predates the bad change. Note the
commit SHA — a full 40-character SHA is safest; Render resolves short SHAs
inconsistently.

## 3. Deploy it

```bash
gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>
```

The step POSTs `{"commitId": "<SHA>", "clearCache": "clear"}`, polls the deploy
for up to ~15 minutes, fails the run on `build_failed` / `update_failed` /
`canceled`, and then curls the service (`/`, `/jyotirlinga/somnath`,
`/sitemap.xml`, `/api/orchestrator-status`) with cold-start retries.

Omitting `-f commit=` redeploys the tracked branch's HEAD — that is a *forward*
deploy, not a rollback. The step prints a NOTE saying so.

`-f branch=` is inert. It is retained only so older documented commands still
parse; Render's API has no branch parameter on a deploy.

## 4. ⚠ Rolling back code does NOT roll back the database

The API's start command is
`prisma migrate deploy && node dist/server.js` (`apps/api/package.json`), run by
`render.yaml`'s `startCommand`. Migrations apply automatically on every boot,
including the boot that follows a rollback.

That means:

- **Forward-only.** `migrate deploy` applies pending migrations; it never
  un-applies one. A schema change shipped by the bad deploy is still there after
  you roll the code back.
- **So roll back to a commit whose code tolerates the current schema.** Additive
  migrations (new nullable column, new table) are safe to roll code back across.
  A destructive one (dropped/renamed column, tightened NOT NULL) is not — the old
  code will query something that no longer exists.
- If the bad deploy included a destructive migration, a code rollback is not
  enough. Write a forward migration that restores the shape, and deploy forward.
  Do **not** hand-edit `_prisma_migrations`.
- **Never** add `CREATE INDEX CONCURRENTLY` to a migration. Prisma wraps each
  migration in a transaction; it fails with `25001` and then blocks every later
  migration. Plain `CREATE INDEX IF NOT EXISTS` only.

Check what the rollback window contains before you dispatch:

```bash
git diff --stat <good-sha>..<bad-sha> -- apps/api/prisma/migrations
```

Empty output means a plain code rollback is safe.

## 5. If the service is SUSPENDED rather than broken

A suspended service is a billing/quota state, not a deploy state. Deploying does
not fix it.

```bash
# Confirm: reads .suspended and .suspenders straight from the Render API
gh workflow run render-diag.yml -f mode=detail -f sid=<SID>

# After the monthly free-hours reset (or after the account is corrected):
gh workflow run render-diag.yml -f mode=resume -f sid=<SID>
```

Free tier is **750 instance-hours per ACCOUNT per month**, not per service. Two
always-on services need ~1,488 hours in a 31-day month. They cannot both stay up;
see `docs/free-tier-budgets.md`. Resuming without changing that arithmetic buys
days, not a fix.

## 6. Verify — do not trust the workflow's own summary

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.darshya.online/health
curl -sS https://api.darshya.online/health | jq .        # expect db:"ok"
curl -sS -o /dev/null -w '%{http_code}\n' https://darshya.online/
curl -sS https://api.darshya.online/ready | jq .         # db + redis + queue
curl -sS https://api.darshya.online/ops/scheduler | jq . # 503 when stale
```

`/health` performs a real `SELECT 1` (`apps/api/src/routes/health.ts`) and
answers 503 when the database has been unreachable for several consecutive
probes, so a 200 there means the process is up **and** the database answered.

Then force a monitor run rather than waiting 12 hours:

```bash
gh workflow run agents-health.yml
```

## 7. What NOT to do

- **Do not** repoint DNS to `darshya.pages.dev`. The Cloudflare Pages project's
  auto-deploy was killed on 2026-07-08 and its last build is from that day; it
  would serve a months-old site with no API contract guarantees, and the project
  may have been deleted in post-cutover cleanup. See
  `docs/render-web-cutover-runbook.md`.
- **Do not** push a revert and wait. Nothing is listening.
- **Do not** trigger a deploy while another is in flight on the same service —
  the free tier cancels the in-flight one.
- **Do not** roll the API back across a destructive migration. See §4.
