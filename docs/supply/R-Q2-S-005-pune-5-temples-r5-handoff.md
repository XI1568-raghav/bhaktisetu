# R-Q2-S-005 — Onboard 5 Verified Temples in Pune (R5 batch)

> **Roadmap item**: R-Q2-S-005 (P1, supply) · **Quarter**: Q2 · **Authored**: 2026-06-15

## Spec ID reconciliation note

The R5 batch ticket addresses item **R-Q2-S-005** ("onboard 5 verified temples Pune").
The active Pune-5-temples roadmap file in `docs/roadmap/items/Q2/supply/` is currently
filed under **R-Q2-S-007** (`007-onboard-5-verified-temples-pune-dagdusheth-chaturs.md`)
because the source 005 slot was reassigned to Hyderabad pandits during the Q2 bulk
import. There is exactly one canonical "5 verified temples Pune" deliverable in the
backlog — this handoff treats R-Q2-S-005 and R-Q2-S-007 as the same logical item
until the roadmap maintainer reconciles the IDs.

The full operational handoff (target trusts, public-domain institutional contacts,
Marathi-first WhatsApp + email templates, KYC + verification checklist, 10-week
onboarding pipeline, Ganesh Chaturthi Sep 2026 launch readiness, sub-ticket split)
lives at:

→ **`docs/supply/R-Q2-S-007-pune-5-temples-handoff.md`** (shipped 2026-06-15 in R4 batch)

This R5 handoff exists only to acknowledge the ticket against R-Q2-S-005 and route
the founder to the canonical doc. No new operational deliverable is in scope for
this batch — re-shipping the same content under a second filename would muddy the
audit trail.

## Status: founder-action-required (no change vs R4)

Per repo rules: KPI `verified_temples_count_pune = 5` requires founder physical
engagement with each Pune temple administration. Status stays `in_progress` until
Supabase `verified_temples` row count for `city = 'Pune'` reaches 5 with real-paid
bookings completed end-to-end.

## What's already shipped (R4, commit-traceable)

- `docs/supply/R-Q2-S-007-pune-5-temples-handoff.md` — full ops handoff
- 5 target trusts identified w/ public-domain institutional addresses
- 3 Marathi-first WhatsApp templates (first-touch / follow-up / MoU brief)
- KYC checklist (10 items: trust reg, 80G/12A, PAN, trust bank acct, MoU, etc.)
- 10-week onboarding pipeline
- Sub-ticket split outlined (007a-e per temple)
- Ganesh Chaturthi 2026 launch readiness checklist
- All institutional contact phone numbers marked `[VERIFY-FOUNDER]` per repo rule
  (no fabricated personal contacts)

## What's pending (founder action, blocks shipped status)

1. Physically engage 5 temple trust administrations (in-person / phone / WhatsApp)
2. Sign partnership MoUs (template at `docs/legal/temple-partnership-mou-template.md`)
3. Complete temple KYC (10 checklist items per temple)
4. Onboard temple admin to `/temple-portal` (Marathi UI per R-Q1-CS-003)
5. Dry-run booking cycle (1 puja, 1 darshan slot, full video-proof) per temple
6. Verify 5 Supabase rows for `city='Pune'` w/ real-paid completed bookings

## Reference + dependencies

- ISKCON Pune NVCC leverages **R-Q2-S-001** ISKCON GBC partnership MoU pipeline
- Marathi communication style guide: **R-Q1-CS-003**
- Legal MoU template: `docs/legal/temple-partnership-mou-template.md` (R-Q1-L-*)
- Pune sub-tickets (per-temple): 007a Dagdusheth · 007b Chaturshringi · 007c ISKCON
  Pune · 007d Khandoba Jejuri · 007e Bhausaheb Rangari

## Out of scope for R5

- Re-listing the 5 trusts (already in R4 handoff)
- Re-drafting the Marathi templates (already shipped)
- Re-publishing the KYC checklist (already shipped)
- Any auto-send of WhatsApp messages — all founder-initiated per R4 spec

## Ship verdict

**PARTIAL** — agent-shippable artifacts (handoff doc, templates, KYC checklist,
pipeline plan) are complete and live in the R4 doc. Status of the underlying
roadmap KPI stays `in_progress` because verified-temple count is founder-gated
and not unblockable by code.
