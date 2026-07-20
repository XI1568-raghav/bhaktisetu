# cold-temple-outreach — 2026-07-20

Polled `/api/v1/admin/ops/cold-temples` for NEW TEMPLE leads (lastContactedAt=null, capped 25/run), sent personalized partnership outreach via Resend, then marked each as EMAILED to prevent re-contact.

## Summary

- Eligible: **0**
- Sent: **0**
- Skipped (no email): **0**
- Marked contacted: **0**

_⚠ RESEND_API_KEY not set — no emails actually sent._

## Send log

_no eligible leads_

---
_Lead status flipped NEW → EMAILED via `/mark-contacted`. Re-runs are idempotent — same lead won't be re-contacted._
