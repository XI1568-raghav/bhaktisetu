# R-Q1-S-014 Warm-network reachout prep — 2026-06-12

> **Mission**: founder asks 50 personal-network contacts for warm referrals to temples / pandits / gaushalas / first donors. Agent prepared the kit; founder fires.
>
> **Why this matters**: supply pipeline is the bottleneck. 0 temples, 3 pandits (target 100), 0 gaushalas. CAC-zero channel that compounds. 50 asks × 20% reply × 30% convert → 3 supply leads → ~₹2L pipeline value.

## Deliverables shipped (agent side)

| File | Purpose |
|---|---|
| `data/sales/warm-network-tracker.csv` | LIVE tracker — header-only, founder fills row per contact (status, replied_at, supply_lead_id, notes) |
| `data/sales/warm-network-contacts-seed.csv` | 50-row template — pre-populated w/ relationship + channel + ask_type segmentation, founder fills `contact_name` + sends |
| `scripts/sales/warm-network/wa-script-temple.md` | 3 variants (close-friend / distant / community-devotee) + post-reply follow-ups |
| `scripts/sales/warm-network/wa-script-pandit.md` | 3 variants (family / professional / devotee-leverage) |
| `scripts/sales/warm-network/wa-script-gaushala.md` | 3 variants + special note on elder-manager phone-call follow-up |
| `scripts/sales/warm-network/wa-script-donor.md` | 3 variants (close-friend / NRI / current-donor migrating) + founder pep talk on this being the hardest ask |

## Segmentation logic (already in seed CSV)

50 contacts split by `relationship` × `ask_type`:

| relationship | count | ask_type focus |
|---|---|---|
| family | 10 | balanced (temple / pandit / gaushala / donor) |
| college-batch | 10 | balanced |
| ex-coworker | 10 | balanced |
| linkedin-1st | 10 | balanced |
| community-temple | 5 | temple + pandit + gaushala (skip donor) |
| influencer-1 | 3 | temple + pandit + donor |
| nri-friend | 2 | donor only |
| **TOTAL** | **50** | |

Channel split:
- `wa` (WhatsApp personal): 30 contacts (family, college-batch, nri-friend, some influencer)
- `email`: 10 contacts (ex-coworker professional context)
- `linkedin` (LinkedIn DM): 10 contacts (linkedin-1st-degree)
- `call`: ~5 contacts (community-temple, gaushala follow-ups)
- `dm` (Instagram/Twitter DM): 3 contacts (influencer)

## Founder execution checklist (this week)

```markdown
- [ ] Fill 50 contact_name values in data/sales/warm-network-contacts-seed.csv (personal phone book + LinkedIn 1st-degree review)
- [ ] Re-segment if needed: move contacts between ask_type rows based on personal knowledge of who's likely best fit for each
- [ ] Day 1: send 10 messages (family + close college batch — script variant A)
- [ ] Day 2: send 15 messages (ex-coworker + community-temple)
- [ ] Day 3: send 15 messages (LinkedIn 1st-degree + influencer)
- [ ] Day 4-5: send 10 messages (NRI + remaining backlog)
- [ ] Each send: copy script verbatim, replace {Name}/{city/village}/{founder name} tokens, paste to WA/email/LinkedIn
- [ ] Log every send in data/sales/warm-network-tracker.csv with sent_at timestamp
- [ ] After 7 days: anyone silent → mark `replied_at: silent`, DO NOT re-ping
- [ ] After 14 days: aggregate → reply rate, qualified-lead count, conversion rate
- [ ] Update R-Q1-S-014 handoff_notes w/ outcome
```

## Hard rules (no exceptions)

1. **Manual WhatsApp send** — NOT WA Business broadcast. Personal touch is the entire moat of warm-net.
2. **One ask per message** — don't bundle "temple + pandit + gaushala + donor" into one message. Pick the most-likely ask for that specific contact, ask one thing.
3. **No re-ping after 7-day silence** — protects the relationship. Warm-net is finite.
4. **Skip the donor-script if uncomfortable** — but understand the cost: NO social proof for the next 50 asks. The pep talk in `wa-script-donor.md` is worth re-reading.
5. **All replies logged in tracker CSV** — even negatives. Reply patterns are signal for future asks.
6. **No Resend / Mailchimp / bulk tool** — manual only. Founder's own inbox + WhatsApp.

## Expected outcomes (math)

```
50 asks
  × 60% read rate (warm-network ceiling)
  = 30 reads
  × 40% reply rate (when warm + personal)
  = 12 replies
  × 30% "yes, here's a referral" rate
  = ~3-4 qualified supply leads
```

3-4 supply leads = unlock at scale could translate to:
- 1-2 verified temples added (₹5-10K MRR each via puja bookings)
- 1-2 pandits onboarded (10-20 bookings/month each × ₹500 = ₹10K MRR aggregate)
- 0-1 gaushala (longer cycle, but ₹50K-1L recurring CSR potential per gaushala)

Aggregate: **₹1-3L pipeline value** from a 50-ask, week-long founder push. CAC-zero (only founder time = ~6-8 hours total).

## Risk mitigations

| Risk | Mitigation |
|---|---|
| Founder uncomfortable asking personal network | Provide scripts so it's "pasting a templated msg" not "writing personal pitch every time" |
| Same contact gets asked multiple times this year | Tracker CSV flags any contact already-asked; check before adding new asks |
| Asks come across as spam | Variant scripts are calibrated for relationship depth (A/B/C). Use right one. |
| LinkedIn DM marked as spam → account flag | Cap LinkedIn at 5/day spread over 3 days, vary messaging slightly |
| Family WA group escalation ("why didn't you ask me?") | Send to family in personal 1-1 WA, NOT family group |

## Linkage

- This kit ties to **R-Q1-S-014** in the roadmap. Status flip planned/in_progress.
- Outputs feed into **R-Q4-S-005** (gaushala scale to 25) as direct lead source.
- Reply-rate KPI → `wa_warm_referrals_sent` metric on dashboard.
- Conversion → adds to `supply_temple_count` + `supply_pandit_count` KPIs.

## Closes

Q-C-20260612T0001-R-Q1-S-014 — kit shipped. Founder execution pending (≤6h spread over 5 days).
