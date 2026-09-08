# Multi-Region Failover Plan — SUPERSEDED, DO NOT FOLLOW

> **→ For an actual outage, read [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md).**
>
> Retired 2026-09-02 under `OPS-10`, alongside the siblings already retired on
> 2026-08-28: [`multi-region-failover-plan.md`](multi-region-failover-plan.md),
> [`multi-region-deployment-strategy.md`](multi-region-deployment-strategy.md)
> and [`disaster-recovery-runbook.md`](disaster-recovery-runbook.md). This file
> was missed by that pass and kept asserting the same infrastructure in the
> present tense.
>
> **Nothing below is deployed.** Read out of this repository on 2026-09-02:
>
> | Claim in this document | Reality |
> |---|---|
> | Render **Mumbai** / `BOM` primary, `api-bom.render.com` | Both services run in Render **`oregon`** (US West) — `render.yaml:15` (API), `:56` (web). There has never been a Mumbai region, and no such hostname exists. |
> | **Singapore** standby / `api-sin.render.com` / Frankfurt | No standby, no second Render service, no warm spare, in any geography. |
> | Supabase **Mumbai** primary + SIN/FRA **read replicas** | One Supabase Postgres instance, no replica. The repository does not record its region anywhere — `[verify]` in the dashboard rather than assuming Mumbai. |
> | Cloudflare load balancer, health checks, weighted pools, DNS swap | Cloudflare is DNS + edge proxy only. Apex and `www` CNAME to `darshya-web.onrender.com`; there is no load balancer and no second origin to fail over to. |
> | An RTO / RPO, or a promotion runbook | Nothing in this system produces those numbers. Honest figures are in the DR runbook under *Honest RTO / RPO*. |
>
> Two things must be true before any of this is worth costing: both services fit
> inside the Render free tier's **750 instance-hours per ACCOUNT per month** (today
> they do not — see `docs/free-tier-budgets.md`), and a backup has been proven to
> restore (it has not — `OPS-02`). A DR plan on top of an unproven backup is
> decoration.
>
> Kept as a stub rather than deleted so an old bookmark still lands somewhere true.
> Everything below this line is a **historical proposal, not a procedure.**

> **Quoted, not asserted (2026-09-08, `OPS-10`).** Everything from here to the end of
> the file is now a blockquote. The banner above already said this text was historical,
> but the text itself went on describing Mumbai, Singapore, read replicas and a
> Cloudflare load balancer in the present tense, in the page’s own voice, for dozens of
> lines — which is what a reader skimming past a banner actually absorbs. None of it
> exists. Ground truth: `render.yaml:15` and `:56` (both services `oregon`),
> `docs/runbooks/disaster-recovery.md`.

>
>
> **Roadmap item**: R-Q4-E-014 (P2) · **Authored**: 2026-06-13
>
> ## Goal
>
> Q4 multi-region failover plan. Mumbai primary + Singapore standby + Frankfurt for EU/NRI.
>
> ## Topology
>
> - **Primary**: Render Mumbai region (R-Q4-E-003 Standard tier)
> - **Standby**: Render Singapore (passive replica)
> - **EU/UK NRI**: Cloudflare Workers (R-Q3-G-001) for edge-cached reads
> - **DB**: Supabase Mumbai primary + Singapore read-replica (R-Q3-IT-002)
>
> ## Failover triggers
>
> - Mumbai region 5xx >50% sustained 10min → manual flip Singapore primary
> - Mumbai region down >5min → automated DNS flip
> - Recovery: founder manual cutback once Mumbai stable 30min
>
> ## DNS
>
> - CF DNS w/ failover health-check pointing to Render Mumbai
> - TTL 60sec for fast failover
> - Singapore standby pre-warmed (always running)
>
> ## Cost
>
> - Singapore standby: $25/mo
> - Frankfurt edge: $0 (CF free tier)
> - Total Q4 multi-region overhead: ~$30/mo
>
> ## Engineering tickets
>
> - R-Q4-E-014a: Singapore standby Render setup
> - R-Q4-E-014b: CF DNS failover config
> - R-Q4-E-014c: DB read-replica multi-region
> - R-Q4-E-014d: Failover runbook + drill
>
> ## Closes
>
> R-Q4-E-014 — spec shipped.
>