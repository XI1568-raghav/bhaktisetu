# R-Q1-M-010 — WhatsApp Cloud API business verification submitted

> **Status: founder-action-required.** Engineering scaffold + service + opt-out plumbing shipped in prior batches (`apps/api/src/services/whatsapp-broadcast.service.ts`, env-or-noop pattern). Meta Business Suite onboarding + business verification submission + 4 template approvals = founder-only Meta UI actions. KPI `wa_meta_verified=1` flips only when Meta returns the green-tick approval.

> **R3 PR #61 was rejected** because it auto-flipped status to `shipped` while Meta verification is a manual UI workflow that only the legal-bind business owner can submit. This batch ships the founder runbook + checklist + env paste-once doc; the spec stays `in_progress` until Meta replies.

## Why this matters

WhatsApp = the highest-conversion devotional channel in India. Booking confirmations, live darshan reminders, daily aarti opt-ins, and festival promo blasts on a verified Bhaktisetu number unlock:

- **1000 free business-initiated conversations/mo** (Meta WA Cloud free tier)
- **Green-tick verified badge** (massively improves message delivery + recipient trust)
- **Template messaging at scale** (not throttled like personal WhatsApp)
- **Webhook events** (delivered / read / replied / failed) feeding back into delivery analytics

This is the gating asset for U7 (one of the user-action blockers tracked in `docs/activation-gates.md`). Until verification submits, the `whatsapp-broadcast.service.ts` runs in skipped mode — every send records `status='SKIPPED'` in `WhatsAppDelivery` so dev/demo flows still exercise the pipeline but no real message hits Meta.

## What's shipped (engineering side, prior batches)

| Asset | Path | Status |
|---|---|---|
| WhatsApp Cloud API client (env-or-noop) | `apps/api/src/lib/whatsapp.ts` | ✓ shipped prior |
| Broadcast service (waitlist + booking holders + all) | `apps/api/src/services/whatsapp-broadcast.service.ts` | ✓ shipped prior |
| `WhatsAppDelivery` + `WhatsAppOptOut` schema (auto-CREATE) | same | ✓ shipped prior — no Prisma migration needed |
| 50 msg/sec rate limit (Meta tier-1 cap) | same | ✓ shipped prior |
| STOP / अनसब्सक्राइब opt-out replay | same | ✓ shipped prior |
| Phone normalisation (+91, 10-digit, leading-zero) | same | ✓ shipped prior |
| Audience selectors (waitlist opt-in, confirmed bookings, all) | same | ✓ shipped prior |
| Original public spec | `docs/marketing/whatsapp-cloud-business-verify-spec.md` | ✓ shipped prior |
| Daily devotional broadcast spec | `docs/marketing/whatsapp-daily-devotional-broadcast-spec.md` | ✓ shipped prior |
| Founder runbook + checklist (this doc) | `docs/marketing/R-Q1-M-010-handoff.md` | ✓ shipped this batch |
| Verification-evidence tracker (timestamps, ticket IDs) | `docs/marketing/R-Q1-M-010-verification-tracker.md` | ✓ shipped this batch |
| Env-paste-once doc for Render after Meta approval | `docs/marketing/R-Q1-M-010-env-paste.md` | ✓ shipped this batch |

## What's NOT shipped (and cannot be — Meta UI only)

- Meta Business Suite account for "Bhaktisetu Foundation"
- WhatsApp Cloud API phone-number registration + OTP verify on Meta UI
- Business documents upload (Section 8 cert / PAN / address proof)
- Business verification submission (3-5 day Meta review queue)
- 4 template approvals (`booking_confirmation`, `darshan_reminder`, `festival_promo`, `support_ticket_response`) — 24-48h Meta review each
- Display name approval (must read exactly "Bhaktisetu")

Each is a UI form on `business.facebook.com` requiring the legal business owner's identity, ID, and signed declaration.

## Founder action (one-time submission, ~90 min hands-on + 3-5 day Meta wait)

### Pre-req: gather these BEFORE opening Meta Business Suite

| # | Item | Where it lives |
|---|---|---|
| 1 | Bhaktisetu Foundation Section 8 incorporation cert (PDF) | MCA registry / founder email |
| 2 | Bhaktisetu Foundation PAN card (PDF) | TRACES / accountant |
| 3 | Bhaktisetu Foundation address proof (utility bill or rent agreement <90 days old) | founder records |
| 4 | Dedicated mobile number (NEW SIM or unused Foundation number — MUST NOT have prior WhatsApp account) | telecom provider |
| 5 | Founder government photo ID (passport / Aadhaar / driving licence) | founder wallet |
| 6 | Bhaktisetu website live + Privacy + Terms pages reachable (already live at darshya.online) | already shipped |
| 7 | Bhaktisetu logo 500×500 PNG transparent bg | `apps/web/public/branding/` |
| 8 | Brand bio (≤139 chars): "Bhaktisetu — devotional super-app. Live darshan, video-proof pujas, NRI gift puja, 80G receipts." | already drafted, copy from this doc |
| 9 | Business website URL: `https://darshya.online` | already live |
| 10 | Business email: `support@darshya.online` | already operational (Resend) |

### Step-by-step Meta submission (~60 min UI)

1. **Meta Business Suite account** — go to `business.facebook.com`. Sign in with founder's personal FB profile.
2. **Create business** — Settings → Business Info → "Add" → name `Bhaktisetu Foundation`, legal-name same, address from pre-req #3, primary page = create new "Bhaktisetu" page if not exists.
3. **Add WhatsApp** — left nav → Accounts → WhatsApp Accounts → "Add" → Create a new WhatsApp Business Account → name "Bhaktisetu WA".
4. **Add phone number** — under the new WABA → Phone numbers → Add → enter pre-req #4 number → choose verification method (SMS or call) → enter OTP → confirm.
5. **Display name** — set display name to exactly `Bhaktisetu` (no spaces, no "Foundation", no emoji). Meta enforces brand-match rules; if rejected try `Bhaktisetu — Devotional` or `Bhaktisetu App`.
6. **Business verification** — left nav → Security Center → Start Verification → upload pre-req #1 (Section 8 cert) + #2 (PAN) + #3 (address proof). Add business legal name + address exactly as on documents. Submit.
7. **Verification queue** — Meta says 3-5 business days. Real-world: usually 24-72 hours for clearly-documented businesses. Check daily on Security Center.
8. **Once verified** — green-tick badge appears on WABA. Then proceed to template approvals.

### Template approvals (~20 min UI + 24-48h Meta wait per template)

Submit these 4 templates in WhatsApp Manager → Templates → Create:

#### Template 1: `booking_confirmation` (TRANSACTIONAL)

- Category: UTILITY
- Languages: en, hi
- en body: `Namaste {{1}}, your {{2}} puja at {{3}} is confirmed for {{4}}. Booking #{{5}}. Track: {{6}}`
- hi body: `नमस्ते {{1}}, आपकी {{3}} में {{2}} पूजा {{4}} को निश्चित है। बुकिंग #{{5}}। ट्रैक: {{6}}`
- Footer: `Bhaktisetu — Reply STOP to unsubscribe`
- Sample values for Meta approval: `Aarti / Rudrabhishek / Kashi Vishwanath / 2026-12-25 09:00 IST / BS-20261225-00042 / https://darshya.online/track/BS-20261225-00042`

#### Template 2: `darshan_reminder` (TRANSACTIONAL)

- Category: UTILITY
- Languages: en, hi
- en body: `Live darshan starts in 15 min — {{1}} aarti at {{2}}. Watch: {{3}}`
- hi body: `लाइव दर्शन 15 मिनट में शुरू — {{2}} पर {{1}} आरती। देखें: {{3}}`
- Footer: `Bhaktisetu — Reply STOP to unsubscribe`
- Sample: `Sandhya / Tirupati Balaji / https://darshya.online/darshan/tirupati-balaji`

#### Template 3: `festival_promo` (MARKETING)

- Category: MARKETING (requires marketing-tier approval — slower review)
- Languages: en, hi
- en body: `{{1}} blessings from Bhaktisetu! Book {{2}} puja by {{3}} for guaranteed video proof. {{4}}`
- hi body: `Bhaktisetu की ओर से {{1}} की शुभकामनाएँ! {{3}} तक {{2}} पूजा बुक करें और वीडियो प्रमाण पाएँ। {{4}}`
- Footer: `Bhaktisetu — Reply STOP to opt out of promos`
- Sample: `Diwali / Lakshmi / Nov 1 / https://darshya.online/pujas/lakshmi-puja-diwali`

#### Template 4: `support_ticket_response` (TRANSACTIONAL)

- Category: UTILITY
- Languages: en, hi
- en body: `Hi {{1}}, our team replied to your ticket #{{2}}: {{3}}. Reply here to continue.`
- hi body: `नमस्ते {{1}}, आपके टिकट #{{2}} पर हमारी टीम ने जवाब दिया: {{3}}। उत्तर देने के लिए यहीं लिखें।`
- Footer: `Bhaktisetu Support`
- Sample: `Aarti / TKT-1042 / Your refund of ₹2100 will be credited within 5 business days.`

### Post-approval engineering (~10 min, after Meta returns green-tick + template approvals)

Hand the following 4 values to engineering for Render env paste — see `docs/marketing/R-Q1-M-010-env-paste.md`:

| Env var | Where to find it in Meta Business Suite |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Manager → API Setup → System User token (generate permanent token, NOT 24h temporary) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Manager → API Setup → Phone numbers → click your number → copy "Phone number ID" |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Manager → API Setup → WhatsApp Business Account ID at the top |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Founder generates: `openssl rand -hex 32` — paste same value to Meta webhook config + Render env |

Engineering then unpins `whatsapp.ts` enabled flag (it auto-flips when `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` both present) and the broadcast service starts sending real messages.

## Free-tier discipline (per `docs/free-tier-budgets.md`)

- 1000 business-initiated conversations / mo free
- Estimated month-1 usage: ~400 (booking confirmations + darshan reminders) — within free tier
- Estimated month-6 usage: ~900 — still within free tier
- Month-12 forecast: ~1500 = ~$2.50 overage (negligible, defer billing setup until then)
- Service-initiated (replies to incoming user messages) = unlimited free

## What flips the KPI

The roadmap KPI `wa_meta_verified` flips from `0` → `1` when **all three** of these are true:

1. Meta returns "Verified" status on the WABA (green tick visible in Business Manager)
2. At least one of the 4 templates returns "Approved" status
3. Engineering confirms `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` set in Render env and a test send returns `{ok:true, messageId:'...'}`

When all three confirmed, update the roadmap item via `node scripts/agents/roadmap/_validate-items.mjs` and flip:

```yaml
status: shipped
shipped_at: 2026-XX-XX
kpi:
  current: 1
```

## Tracker

Log each milestone in `docs/marketing/R-Q1-M-010-verification-tracker.md` with timestamp + Meta ticket ID + screenshot path (in `docs/marketing/assets/R-Q1-M-010/`).

## Closes

R-Q1-M-010 scaffold + handoff shipped; flip to `shipped` blocked on Meta verification round-trip (founder UI submission required).
