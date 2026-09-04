# Disaster Recovery Runbook — SUPERSEDED, DO NOT FOLLOW

> **→ The runbook you want is [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md).**

## Why this file no longer has a body

`OPS-10`. Every operational instruction previously on this page described
infrastructure that has never existed in this product. The body was removed on
2026-08-28 rather than left in place, because a disaster-recovery runbook is
read exactly once — at 2am, under stress, by someone who believes it. Sending
that person to look for consoles that do not exist costs the whole recovery
window. The stub is kept so an old bookmark, a Notion link or a printed page
still lands somewhere true instead of 404ing.

The removed content told a responder to:

| Removed instruction | Reality |
|---|---|
| Fail over from the **Render Mumbai** region | Both services run in Render **`oregon`** (US West) — `render.yaml:15`, `:56`. There has never been a Mumbai region. |
| Promote the **Singapore standby** / **Singapore read-replica** | No standby, no replica, no warm spare exists in any region. |
| Route around a **Cloudflare Pages** outage | Pages is not a hosting layer. Auto-deploy was killed 2026-07-08; web is Render Docker behind Cloudflare DNS + edge only. |
| Switch payments to the **Stripe** rail | Stripe was removed (2026-08-11 audit); its webhook 404s. `PaymentGateway.stripe` survives only as an unused schema enum value. Razorpay is the only rail. |
| Restore from the **S3 / Glacier / Glacier Deep Archive** tiers | No S3 or Glacier tier exists. Backups are a daily `pg_dump` into Supabase Storage — the same Supabase project the database lives in (`OPS-03`), so one account suspension takes the database and every backup together. |
| Post to the **status page** (`status.bhaktisetu.com`) | Does not exist. Aspirational copy. |
| Wait for the **UptimeRobot** alert | No external uptime monitor is wired in this repository. Monitoring runs on GitHub Actions (`OPS-09`). |
| Meet **RTO 4h / RPO 15min–1h** | Nothing in this system produces those numbers. API/web recovery is bounded only by a human noticing; RPO is unbounded until a backup is *proven* to exist. |

## What to do instead

1. Open [`docs/runbooks/disaster-recovery.md`](../runbooks/disaster-recovery.md) —
   authoritative, written 2026-08-20, every row cited to a file in this repo,
   and anything unverifiable marked `[verify]` rather than asserted.
2. To roll back or redeploy a service:
   [`docs/runbooks/prod-rollback.md`](../runbooks/prod-rollback.md).
   (A `git revert` + push deploys nothing — `autoDeploy: false` on both
   services. See `OPS-06`.)
3. To restore the database: [`docs/runbooks/db-restore.md`](../runbooks/db-restore.md).
   Note that no restore has ever been recorded as executed.

## If you are here to write an RTO/RPO into a document

Do not copy the table that used to be on this page into a pitch deck, an
insurance form, a DPA or a customer contract. Those were targets that no
mechanism in this system delivers. `docs/runbooks/disaster-recovery.md` carries
the honest numbers under "Honest RTO / RPO". The same correction was applied to
`docs/legal/additional-legal-docs-pack.md`, which was selling a Singapore
standby to counterparties.
