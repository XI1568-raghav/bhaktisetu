# R-Q1-M-010 — Verification evidence tracker

> Log each Meta interaction here. Roadmap item flips to `shipped` only when all three "KPI flip" rows below are checked off and engineering confirms test-send success.

## Pre-req gathering

| # | Item | Status | Path / Notes |
|---|---|---|---|
| 1 | Section 8 cert PDF | [ ] | TBD |
| 2 | Bhaktisetu PAN PDF | [ ] | TBD |
| 3 | Address proof (<90d) | [ ] | TBD |
| 4 | Dedicated WA number (no prior WA account) | [ ] | TBD |
| 5 | Founder govt photo ID | [ ] | TBD |
| 6 | Website + Privacy + Terms live | [x] | https://darshya.online (already live) |
| 7 | Logo 500×500 PNG | [ ] | apps/web/public/branding/ |
| 8 | Brand bio (≤139 chars) | [x] | drafted in R-Q1-M-010-handoff.md |
| 9 | Business website URL | [x] | https://darshya.online |
| 10 | Business email | [x] | support@darshya.online |

## Meta Business Suite milestones

| # | Milestone | Date submitted | Date confirmed | Meta ticket ID | Screenshot path |
|---|---|---|---|---|---|
| 1 | Meta Business account created (Bhaktisetu Foundation) | TBD | TBD | TBD | assets/R-Q1-M-010/01-business-created.png |
| 2 | WhatsApp Business Account (WABA) created | TBD | TBD | TBD | assets/R-Q1-M-010/02-waba-created.png |
| 3 | Phone number added + OTP verified | TBD | TBD | TBD | assets/R-Q1-M-010/03-phone-verified.png |
| 4 | Display name "Bhaktisetu" approved | TBD | TBD | TBD | assets/R-Q1-M-010/04-display-name.png |
| 5 | Business verification submitted (Security Center) | TBD | TBD | TBD | assets/R-Q1-M-010/05-verification-submitted.png |
| 6 | Business verification **approved** (green tick) | TBD | TBD | TBD | assets/R-Q1-M-010/06-verification-approved.png |

## Template approvals

| # | Template name | Submitted | Approved | Meta ticket ID |
|---|---|---|---|---|
| 1 | booking_confirmation (en + hi) | TBD | TBD | TBD |
| 2 | darshan_reminder (en + hi) | TBD | TBD | TBD |
| 3 | festival_promo (en + hi, MARKETING tier) | TBD | TBD | TBD |
| 4 | support_ticket_response (en + hi) | TBD | TBD | TBD |

## KPI flip checklist

KPI `wa_meta_verified` only flips from `0` → `1` when ALL THREE checked:

- [ ] Meta returned "Verified" on the WABA (row #6 above complete)
- [ ] ≥1 of 4 templates "Approved" (any row in template table above complete)
- [ ] Engineering confirmed Render env vars set + test-send returned `{ok:true, messageId:'...'}`

When all three confirmed, update roadmap item:

```yaml
status: shipped
shipped_at: 2026-XX-XX
kpi:
  current: 1
```

Then commit + push as a separate `docs(roadmap)` commit. Do NOT auto-flip this in an agent run.

## Engineering test-send protocol (after env paste)

```bash
# from apps/api/
node -e "
import('./src/services/whatsapp-broadcast.service.js').then(async (m) => {
  const r = await m.broadcastToWaitlist({
    templateName: 'booking_confirmation',
    languageCode: 'en',
    variables: ['Test User', 'Aarti', 'Kashi Vishwanath', '2026-12-25 09:00 IST', 'BS-TEST', 'https://darshya.online/test'],
    triggeredBy: 'kpi-flip-test',
  });
  console.log(JSON.stringify(r, null, 2));
});
"
```

Expected if real: `{enabled: true, sent: N, ...}`. Record output here:

```json
TBD
```

## Webhook configuration

After Meta approval, configure webhook in WhatsApp Manager → Configuration:

- Callback URL: `https://api.darshya.online/webhooks/whatsapp` (TBD — add route if missing)
- Verify token: same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var
- Subscribed fields: `messages`, `message_template_status_update`, `account_alerts`

## Notes

- Verification queue: Meta states 3-5 business days; real-world 24-72h for clearly-documented businesses
- If rejected: most common reasons = (a) phone number had prior WA account, (b) docs name mismatch with WABA legal name, (c) display name too generic or too brand-y
- Re-submission allowed after fix; no penalty
