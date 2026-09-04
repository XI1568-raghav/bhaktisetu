# Multi-Region Deployment Strategy — SUPERSEDED, DO NOT FOLLOW

> **→ For an actual outage, read [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md).**
>
> Original: R-Q4-E-014, a Q4-2026/Q1-2027 aspiration written before any of it
> existed. Removed 2026-08-28 under `OPS-10`, together with the sibling
> [`multi-region-failover-plan.md`](multi-region-failover-plan.md) and
> [`disaster-recovery-runbook.md`](disaster-recovery-runbook.md).

## Why this page no longer has a body

Its "## Current state (Q3 2026)" section was written in the present tense and was
wrong in every line — that is what made it dangerous rather than merely stale.
Anyone reading this page to answer *where does our data live* got Mumbai and
Cloudflare Pages, and the truthful answer is Render `oregon` on both services.
That question is not academic here: it was answered wrongly to counterparties in
`docs/legal/additional-legal-docs-pack.md`, where a data-residency statement is a
warranty rather than internal prose. The legal pack has been corrected; this page
was the upstream source of the claim, so it is corrected too.

The stub is kept rather than deleted so an old bookmark still lands somewhere
true.

## Every "current state" claim, against what is actually there

| Claimed as current | Reality, read out of this repo on 2026-08-28 |
|---|---|
| Primary: Render **Mumbai** (apps/api) | `region: oregon` — `render.yaml:15`. US West, not India. |
| **Cloudflare Pages** (apps/web), global edge by default | Pages is not a hosting layer. Auto-deploy was killed 2026-07-08 (`cf-kill-zombie.yml`); web is a Render Docker service, `region: oregon` (`render.yaml:56`), with Cloudflare providing DNS + edge proxy only. |
| Supabase: **Mumbai** primary | The repo does not record the Supabase region anywhere. The DR runbook marks it `[verify]` rather than guessing, and so does this page. |
| **CloudFront / R2** for video-proof storage, global CDN | Neither is wired. The only object storage in use is Supabase Storage, holding the daily `pg_dump`. |
| "All servers Mumbai" | Both are `oregon`. Personal data is therefore processed outside India today — the point the legal pack now states plainly. |
| Latency table (Mumbai 30ms, Bay Area 250ms, …) | Measured against infrastructure that does not exist, and inverted relative to reality: the app tier is in US West, so the Indian numbers are the optimistic ones. No latency measurement from the real deployment exists in this repo. |

## Every future phase, and what has to be true first

The phases below are not forbidden as a future design — they are forbidden as a
description of the present. They were also costed as if the constraint were
money, and it is not.

| Planned | Blocker that comes first |
|---|---|
| Phase 1: Singapore standby + Supabase read-replica, ~$50/mo | The Render **free tier grants 750 instance-hours per ACCOUNT per month, not per service**. Two always-on services need ~1,488h and the account was suspended for exactly this on 2026-08-17, taking both sites down for three days. A third service makes the arithmetic worse. `docs/free-tier-budgets.md`. |
| Phase 2/3: Frankfurt, US-East, US-West, 4–5 regions, $100–300/mo | Same cap, multiplied. Also assumes a monitoring layer that can detect a regional failure; there is no external uptime monitor at all (`OPS-09`) — every check runs on GitHub Actions, i.e. on the quota it is meant to protect. |
| Read-replica routing (`dbRead(req)` by region) | A DR plan on top of an **unproven backup** is decoration. No backup has ever been produced and no restore has ever been performed (`OPS-02`); and until `BACKUP_S3_*` is configured, the one backup destination is inside the account it insures (`OPS-03`). |
| "99.99% uptime achievable"; "multi-region production-ready" for a pitch deck | Do not put this in a deck, a DPA, an insurance form or a customer contract. The honest figures are in `docs/runbooks/disaster-recovery.md` under *Honest RTO / RPO*: recovery bounded only by a human noticing, and RPO unbounded until a backup is proven to exist. |

## Where the real procedures live

- Outage, data loss, security incident → [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md)
- Roll back or deploy a service → [`docs/runbooks/prod-rollback.md`](../runbooks/prod-rollback.md)
- Restore the database → [`docs/runbooks/db-restore.md`](../runbooks/db-restore.md)
- What a new region, workflow or cron actually costs → [`docs/free-tier-budgets.md`](../free-tier-budgets.md)
- What may be said about data residency → [`docs/legal/additional-legal-docs-pack.md`](../legal/additional-legal-docs-pack.md)
