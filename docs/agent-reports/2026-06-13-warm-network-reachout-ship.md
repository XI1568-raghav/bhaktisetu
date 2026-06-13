# Warm-network reachout prep — ship report (R-Q1-S-014, 2026-06-13)

> Re-ships R-Q1-S-014 to current queue spec. Replaces 2026-06-12 prep doc artifacts with schema-compliant versions (12-col tracker, 50-row seed, 5 scripts + README, Hindi+English bodies < 350 chars, `{first_name}` placeholder, full test coverage).

## Deliverables (all under `scripts/sales/warm-network/` + `data/sales/`)

| File | Purpose |
|---|---|
| `data/sales/warm-network-tracker.csv` | Live tracker, 12 cols: `contact_name, relationship, channel, city, ask_type, script_variant, language, sent_at, replied_at, referral_received, supply_lead_id, notes` |
| `data/sales/warm-network-contacts-seed.csv` | 50-row template, ask_type pre-segmented (15 temple / 15 pandit / 10 gaushala / 5 donor / 5 diaspora) |
| `scripts/sales/warm-network/wa-script-temple.md` | Temple introducer ask, Hindi + English bodies, WA-length compliant |
| `scripts/sales/warm-network/wa-script-pandit.md` | Pandit introducer ask, Hindi + English, WA-length compliant |
| `scripts/sales/warm-network/wa-script-gaushala.md` | Gaushala introducer ask, Hindi + English, WA-length compliant |
| `scripts/sales/warm-network/email-script-formal.md` | Email for older / formal contacts (full bilingual body) |
| `scripts/sales/warm-network/followup-script-day7.md` | Single day-7 nudge for silent contacts |
| `scripts/sales/warm-network/README.md` | Founder runbook — file index, 5-day send schedule, reply playbook, outcomes math, hard rules |
| `scripts/sales/warm-network/__tests__/tracker-schema.test.mjs` | Node schema tests — 10 cases, all green |

## TDD record

- RED commit: tests added before any artifact rewrite — 1/10 passing (only header-already-correct case)
- GREEN commit: 10/10 passing after writing 12-col tracker + 50-row seed + 5 scripts + README

## Revenue thesis (unchanged from cycle 1)

50 asks × 20% reply × 30% positive = ~3 referrals × 70% qualify × ₹1L pipeline avg = ~₹2L pipeline value.

## Founder action (out-of-cycle, ≤6h over 5 days)

1. Open `data/sales/warm-network-contacts-seed.csv`, fill 50 real names from phone + LinkedIn over 1-2 evenings.
2. Send 10 WA/day for 5 days using temple/pandit/gaushala scripts. Pick Hindi or English per contact comfort.
3. Log each send in `data/sales/warm-network-tracker.csv` (copy filled seed row + add `sent_at` ISO date).
4. Day-7 silent nudge once via `followup-script-day7.md`. No third message.
5. Aggregate at Day-14: reply rate / referrals / qualified leads → update item handoff_notes.

KPI `wa_warm_referrals_sent` only ticks when founder logs sends to tracker.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Founder fills only 20 names → ask volume drops | README lists exact relationship buckets per ask_type — fill from contacts app filtered by group |
| 0 replies after 20 sends | README escalation rule — pause, re-read scripts, A/B test variants before continuing |
| Positive reply, slow founder follow-through | Day-0 reply within 48h is mandatory; warm referrals decay fast |
| Hindi script reads stilted to urban diaspora | English variant ships in same file — pick per contact, log `language` |

## Cycle closure

This item stays `in_progress` in roadmap. Status flips `shipped` only when founder reports back with reply-rate + conversion numbers + qualified-supply-leads count. Agent's job ends at preparation.
