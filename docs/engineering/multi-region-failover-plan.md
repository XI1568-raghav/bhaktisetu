# Multi-Region Failover Plan — SUPERSEDED, DO NOT FOLLOW

> **→ For an actual outage, read [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md).**
>
> Original: R-Q4-IT-001, authored 2026-06-13, titled *"Mumbai Primary + Singapore
> Standby"*. Removed 2026-08-28 under `OPS-10`, together with the sibling
> [`multi-region-deployment-strategy.md`](multi-region-deployment-strategy.md)
> and [`disaster-recovery-runbook.md`](disaster-recovery-runbook.md).

## Why this page no longer has a body

It was a Q4 *plan*, but nothing in it said so once you were three headings deep.
It had a "## Runbook" section with numbered steps, an RTO, an RPO and a failover
trigger, all written in the present tense. Under stress that reads as a
procedure — and a responder who follows it spends the recovery window hunting for
regions, replicas, alerting and consoles that this product has never had. Every
one is listed below against what is actually deployed. That cost is the finding;
the plan never being built is not.

The stub is kept rather than the file deleted so an old bookmark, a Notion link
or a printed page still lands somewhere true.

## Every removed instruction, against what is actually there

| Removed instruction | Reality, read out of this repo on 2026-08-28 |
|---|---|
| Mumbai is the primary region | Both Render services run in **`oregon`** (US West) — `render.yaml:15` (API), `:56` (web). There has never been a Mumbai region. |
| Singapore standby, daily-warmed; "Singapore API becomes primary" | No standby, no second Render service, no warm spare, in any region. |
| Supabase Postgres Singapore read-replica; logical replication with ~5s lag | No replica. One Supabase Postgres instance, and the repo does not even record which region it is in — marked `[verify]` in the DR runbook. |
| S3 Mumbai for media, bucket replication MUM ↔ SG | No S3 tier and no bucket replication. The only object storage in use is Supabase Storage, holding the daily `pg_dump`. |
| Redis (Upstash) geo-replicated | Not wired as a multi-region concern; see `/ready` in `apps/api/src/routes/health.ts` for what is actually checked. |
| UptimeRobot detects the outage | **No external uptime monitor exists in this repository.** Every check runs on GitHub Actions — which is the monitoring gap `OPS-09` is about. The 2026-08-17 outage ran three days before a human noticed. |
| PagerDuty alerts founder + on-call | No PagerDuty, no on-call rota, no second person. |
| Cloudflare DNS API flips `mumbai.` ↔ `singapore.bhaktisetu.com` | Neither hostname exists. Cloudflare is DNS + edge proxy only; apex and `www` CNAME to `darshya-web.onrender.com`. |
| Announce on Twitter + Status page | `status.bhaktisetu.com` does not exist. |
| Follow `docs/ops/runbooks/regional-failover.md` | That file does not exist, and neither does the `docs/ops/` directory. |
| RTO 15 min / RPO 5 sec | Nothing in this system produces those numbers. Honest figures — API/web recovery bounded only by a human noticing, RPO unbounded until a backup is *proven* to exist — are in the DR runbook under *Honest RTO / RPO*. |
| "~$30/mo. Acceptable." | The product is on free tiers and is $0-budget. The 2026-08-17 outage was caused by exceeding the Render free-tier 750 instance-hours-per-**account** cap with two always-on services; a third service makes that arithmetic worse, not better. See `docs/free-tier-budgets.md`. |

## If you are here to plan multi-region for real

Nothing above is forbidden as a future design — it is forbidden as a *procedure*.
Two things have to be true before any of it is worth costing:

1. Both services fit inside 750 instance-hours/month, or the account is paid.
   Today they do not, which is why they were suspended.
2. A backup has been proven to exist and proven to restore. Neither has happened
   (`OPS-02`), and a DR plan on top of an unproven backup is decoration.

## Where the real procedures live

- Outage, data loss, security incident → [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md)
- Roll back or deploy a service → [`docs/runbooks/prod-rollback.md`](../runbooks/prod-rollback.md)
  (a `git revert` + push deploys nothing — `autoDeploy: false` on both services)
- Restore the database → [`docs/runbooks/db-restore.md`](../runbooks/db-restore.md)
- What a new workflow or region costs → [`docs/free-tier-budgets.md`](../free-tier-budgets.md)
