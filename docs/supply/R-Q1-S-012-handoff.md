# R-Q1-S-012 — Phone outreach: 10 ISKCON Bengaluru temples

> **Roadmap item**: R-Q1-S-012 (P0) · **Authored**: 2026-06-13 · **Status**: founder-action-required

## Goal

Actually call (phone, not email) 10 ISKCON Bengaluru temples that were previously emailed but did not reply. Convert silent-email leads to live conversations.

## Why phone now

Email outreach to ISKCON Bengaluru chain has produced 0 replies (per founder warm-network reach prior). Religious institutions in India respond faster to voice + Kannada/Hindi than to cold email. Phone unblocks the temple-onboarding funnel that R-Q1-S-005 depends on.

## Target list (10 ISKCON Bengaluru temples)

To be confirmed by founder before calling. Suggested seed from public ISKCON Bengaluru chapter directory:

1. **ISKCON Bengaluru — Hare Krishna Hill, Rajajinagar** (flagship, ~30k visitors/day)
2. **ISKCON Bengaluru — Vasanthapura**
3. **ISKCON Bengaluru — Bommasandra**
4. **ISKCON Bengaluru — Whitefield**
5. **ISKCON Bengaluru — Yelahanka**
6. **ISKCON Bengaluru — Kanakapura Road**
7. **ISKCON Bengaluru — Mysore Road**
8. **ISKCON Bengaluru — Sarjapur**
9. **ISKCON Bengaluru — Banashankari**
10. **ISKCON Bengaluru — Electronic City**

> **Founder action**: validate list + add direct phone numbers + named contact (temple president / PR head) per row before agent can pre-draft script.

## Call script skeleton (Kannada-first, Hindi/English fallback)

**Opening** (15s):
> "Namaste, I am [name] from Darshya — a devotional super-app helping NRI devotees book pujas and watch live darshan from verified temples. I sent an email last week regarding partnership but wanted to speak directly. Do you have 5 minutes?"

**Value props** (60s):
- Free for temple — we handle tech, payments, video streaming.
- 20-40% platform commission on puja bookings (negotiable).
- NRI devotees pay 9-10× domestic (USD). Temple gets ₹ payout next-day.
- 80G receipts auto-issued (we are a registered donee).
- Live darshan via IVS stream (we set up camera + bandwidth, temple just gives wifi).

**Ask** (30s):
> "Would you be open to a 30-min in-person visit next week to walk through the platform and discuss partnership?"

**Objection handling**:
- "We already have a website" → "We're not a website, we're a platform. NRI traffic flows to us, not to your site. You keep your site for local devotees."
- "Need approval from headquarters" → "Of course. Could you connect me to the relevant person at ISKCON Bureau?"
- "Not interested right now" → "Understood. May I send you a 1-page summary and reconnect in 3 months?"

**Close**:
- If yes → schedule visit, log in CRM, send WhatsApp confirmation w/ visit slot.
- If no → ask referral ("Do you know any other temple in Bengaluru that would benefit from this?").
- If gatekeeper → ask for direct line to temple president.

## Logging schema (per call)

After each call, founder logs to a shared sheet (Google Sheets or CRM):

```
| temple_name | phone | contact_name | call_date | call_outcome | next_action | notes |
| ----------- | ----- | ------------ | --------- | ------------ | ----------- | ----- |
```

`call_outcome` enum: `voicemail | no-answer | declined | interested-needs-visit | committed | wrong-number | gatekeeper-blocked`

## Success criteria

- 10/10 phone numbers dialed (no skipped rows).
- ≥3/10 converted to "interested-needs-visit" or "committed".
- ≥1/10 in-person visit scheduled within 14 days.
- 100% of calls logged with outcome.
- KPI `temple_calls_made` incremented to 10 in `_manual-kpis.yml` after batch complete.

## Founder-action checklist

- [ ] Validate target list of 10 temples (direct phone + contact name per row).
- [ ] Block 3 hours on calendar (single batched session, morning IST preferred).
- [ ] Print call script + logging sheet.
- [ ] Dial 10 numbers.
- [ ] Log outcomes per row.
- [ ] Update `docs/roadmap/_manual-kpis.yml` `temple_calls_made: 10` (+ `last_updated`).
- [ ] Mark this item `status: shipped` + add `shipped_at` in frontmatter once complete.

## Why no code

This is a sales / outreach task, not a build task. Agent cannot dial phones. Best agent contribution: this script + logging schema + objection drills. Execution is founder-only.

## Related

- R-Q1-S-005 — Onboard 10 verified Bengaluru temples (this item unblocks).
- R-Q2-S-001 — ISKCON partnership (multi-city chain commit).
- R-Q1-S-013 — Google Maps scrape for verified phone+email (data source).
- R-Q1-S-014 — Founder warm-network reachout (parallel channel).
