# Micro-Influencer Outreach Kit — June 2026 cycle

> Roadmap: R-Q2-M-005 · Category: marketing · Owner: cmo · Priority: P1
> Status: in_progress (scaffold shipped; founder closes loop by sending DMs + tracking conversions)

## Purpose

Prep artifacts so the founder can run a 10-confirmed-partnership outreach push against NRI-devotional micro-influencers (5K-50K followers) without burning agent or paid-tool credits.

**Agent scope (shipped):** candidate vetting framework, 3 outreach copy variants, partnership tier matrix, tracker schema, ASCI+FTC disclosure guidance.

**Founder scope (BLOCKING ship):** approve candidates, approve tier budgets, send DMs from personal handle, update tracker, mark item `shipped` when 10 partnerships signed.

## KPI tracker

| Metric | Current | Target | Source |
|---|---|---|---|
| Confirmed partnerships | 0 | 10 | Manual (founder updates tracker spreadsheet) |
| Candidates vetted | 15 (scaffold w/ founder-verify tokens) | 15 | `candidates.md` |
| DMs sent | 0 | 15 | `tracker-schema.csv` columns |
| Response rate | TBD | ≥40% (typical micro-influencer warm-DM benchmark) | tracker |
| First-puja conversions | 0 | ≥5 (50% of partnerships convert ≥1 booking in first 30d) | Stripe coupon code attribution |

## File index

| File | What | Used by |
|---|---|---|
| `README.md` | This file. Index + KPI tracker. | Founder |
| `candidates.md` | 15 candidate slots with vetting framework. **Names are `[VERIFY-FOUNDER]` tokens** — founder fills + screens per criteria. | Founder vets, agent does not fabricate. |
| `outreach-copy.md` | 3 DM variants (warm / cold-value-first / collab-pitch) + 5-day follow-up. Each ≤120 words. | Founder pastes into IG/Twitter DM. |
| `partnership-tiers.md` | Barter / paid-flat / rev-share matrix. ₹50K max budget per cycle. | Founder approves tier per candidate. |
| `tracker-schema.csv` | 16-column CSV header for Google Sheet. | Founder copies header into Sheet, fills rows as DMs go out. |
| `disclosure-compliance.md` | ASCI India + FTC US disclosure rules + 1-liner to paste in outreach. | Founder includes in every paid/barter agreement. |

## Free-tier discipline

- Zero paid tools (no Modash, Heepsy, Upfluence). Manual IG/YouTube/Twitter/Reddit search per `candidates.md` sourcing notes.
- Zero agent spend on this cycle beyond prompt cost (~28K tokens emit).
- Founder DMs cost ₹0 until tier approval (then ₹0-50K depending on barter vs paid mix).

## Next actions (founder, in order)

1. **Vet candidates.** Open `candidates.md`. For each `[VERIFY-FOUNDER]` slot, search Instagram/YouTube using hashtags listed there. Confirm follower count (5K-50K), engagement rate ≥3%, ≥3 devotional posts in last 30 days, NRI audience signal, public DM or business email. Reject candidate if any fail; document rejection in tracker.
2. **Approve tier budgets.** Open `partnership-tiers.md`. Confirm ₹50K cap is acceptable for cycle. Assign tier per vetted candidate.
3. **Send DMs.** Open `outreach-copy.md`. Pick variant per candidate context. Send from founder personal handle (NOT brand account — warmer per spec).
4. **Update tracker.** Copy `tracker-schema.csv` header into a Google Sheet. Log every DM, response, partnership, booking.
5. **Close loop.** When 10 partnerships are signed (signed = creator confirmed offer + tier accepted), flip `R-Q2-M-005` roadmap status to `shipped` and append `shipped_at`.

## Compliance note

All paid/barter partnerships must carry `#ad` or `#partnership` disclosure per ASCI India guideline. NRI-facing creators (US audience) additionally need `#ad` in first 3 lines per FTC. See `disclosure-compliance.md` for exact clauses.

## Cost summary

- Agent token spend (this emit): ~28K
- Founder time (vetting + DMs + follow-ups): est. 3-4 hours over 2-week window
- Cash spend (max if all paid-flat tier): ₹50,000
- Cash spend (if all barter): ₹0 + free puja redemptions
