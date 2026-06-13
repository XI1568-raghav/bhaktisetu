# R-Q1-IT-004 Handoff — Resend Domain DNS Verify (DKIM+SPF+DMARC)

> **Item**: R-Q1-IT-004 · **Category**: IT · **Priority**: P0 · **Status**: founder-action-required · **Date**: 2026-06-13
>
> **Spec**: `docs/roadmap/items/Q1/it/004-resend-domain-dns-verify-dkim-spf-dmarc-for-darshy.md`
> **Runbook**: `docs/ops/resend-dns-verify-runbook.md` (263 lines, shipped 2026-06-12 in commit `eb50cba`)

## Why this matters

Without DKIM + SPF + DMARC on darshya.online, every transactional email Bhaktisetu sends — booking confirmations, refund notices, 80G PDFs, monthly impact reports, festival reminders, CS macros, gift puja recipient notifications, NRI welcome flows — lands in spam.

This already cost us: 230 stale leads from R-Q1-CS-005 went silent. Most likely cause is Gmail/Outlook greylisting our unsigned mail. Verified DNS is the unlock for re-sending those leads + every future transactional email.

## What is shipped (engineering hand)

| Artifact | Status |
|---|---|
| 10-step Resend DNS verify runbook (~45min founder time) | ✅ shipped `eb50cba` |
| SPF merge guidance (don't add 2nd record) | ✅ in runbook |
| DKIM record (`resend._domainkey`) | ✅ in runbook |
| MX bounce subdomain (`send.darshya.online`) | ✅ in runbook |
| SPF for bounce sub | ✅ in runbook |
| DMARC p=none v1 → escalate p=quarantine/p=reject over 90 days | ✅ in runbook |
| Resend dashboard verify steps | ✅ in runbook |
| Gmail "Show original" SPF/DKIM/DMARC PASS check | ✅ in runbook |
| API key rotation flow (U12 leaked key cleanup) — Render + GH + .env paste + restart | ✅ in runbook |
| 12 pass-criteria checkboxes | ✅ in runbook |
| 6 failure-mode triage | ✅ in runbook |
| DMARC monitoring inbox + monthly review cadence | ✅ in runbook |

## What is blocked on founder (45 min, DNS access required)

The runbook is execution-ready, but the engineering harness cannot:
- Add TXT/MX records to the darshya.online DNS zone
- Click "Verify domain" in the Resend dashboard
- Generate a new Resend API key (Resend dashboard MFA-gated)
- Paste the new key into Render + GitHub Secrets + local `.env`
- Send a test email from Gmail and read the SPF/DKIM/DMARC headers

These are physical-access tasks for the founder.

## Pass criteria (from runbook, copy here for ship-log trail)

```markdown
- [ ] Resend dashboard shows domain `darshya.online` = Verified (green)
- [ ] SPF TXT record live + valid (`dig TXT darshya.online +short` returns `v=spf1 ... include:_spf.resend.com ...`)
- [ ] DKIM TXT record live (`dig TXT resend._domainkey.darshya.online +short` returns `p=...`)
- [ ] MX record on send.darshya.online live + points to Amazon SES
- [ ] SPF TXT on send.darshya.online live + includes amazonses.com
- [ ] DMARC TXT live (`dig TXT _dmarc.darshya.online +short` returns `v=DMARC1; p=none; ...`)
- [ ] Gmail test send PASS — open inbox copy of test mail, "Show original" → SPF=PASS + DKIM=PASS + DMARC=PASS
- [ ] Outlook test send PASS — same check via "View > Message Source"
- [ ] Yahoo test send PASS — Settings > Internet Headers
- [ ] Resend test API call returns 200 + tracked in dashboard
- [ ] New API key rotated in Render env `RESEND_API_KEY` + Render service restarted
- [ ] New API key rotated in GitHub Actions secret `RESEND_API_KEY`
```

## Unblocks (downstream items that flip green after this lands)

| Item | What it does |
|---|---|
| R-Q1-CS-005 | Re-send 230 stale leads from prior outreach cycle — would land in spam without DNS green |
| U12 | Leaked Resend API key cleanup (key `re_46d7rTF7…` exposed in repo history) |
| All Bhaktisetu transactional email | Booking confirmations, refund notices, 80G PDFs, monthly impact reports, festival reminders, CS macros, gift puja, NRI welcome |

## Resume cheatsheet next session

1. Curl `dig TXT resend._domainkey.darshya.online +short` — if returns a long `p=` key blob, DNS is live, run remaining pass-criteria
2. Open Resend dashboard at https://resend.com/domains — confirm green Verified pill on `darshya.online`
3. Flip `shipped_at` + `verified_at` on `docs/roadmap/items/Q1/it/004-resend-domain-dns-verify-dkim-spf-dmarc-for-darshy.md` to UTC now-ish timestamp once all 12 pass-criteria green
4. Then trigger R-Q1-CS-005 re-send via `docs/ops/cs-005-resend-stale-leads-runbook.md`

## Spec status reasoning

Per `STATUS-USAGE.md` enum + the spec block "Status flips to shipped after founder completes 12 pass-criteria + Gmail test send PASS", the item stays `in_progress` until founder confirms green via the resume cheatsheet above. Engineering-hand work is complete — no further code can move this forward without founder DNS + dashboard access.
