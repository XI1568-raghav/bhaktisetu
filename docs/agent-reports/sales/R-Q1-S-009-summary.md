# Summary — R-Q1-S-009 Onboard 3 Gurukuls (Vedic Schools)

> Sub-agent dossier — sales prep for Q1 supply-side onboarding of 3 verified gurukulas / vedic pathshalas. Founder-execution-ready.

## Item context

- **Roadmap ID:** R-Q1-S-009
- **Category:** supply
- **Owner role:** sales
- **Quarter / month target:** Q1 / month 2
- **Priority:** P2
- **KPI:** `verified_gurukuls_count` — current 0, target 3.
- **Revenue impact (year-1 plan):** ₹8,000 (confidence: medium).
- **Geo focus:** Varanasi, Vrindavan, Haridwar, Bengaluru (primary); Mumbai only if Sandipani / Somaiya-grade options surface.

## Deliverables shipped

| Artifact | File | Purpose |
|---|---|---|
| Acceptance | [`R-Q1-S-009-acceptance.md`](./R-Q1-S-009-acceptance.md) | TDD checklist that gates dossier completeness. |
| Target list | [`R-Q1-S-009-gurukul-target-list.csv`](./R-Q1-S-009-gurukul-target-list.csv) | 12 prospects (≥ 10 required) across the 5 allowed cities, all 13 required columns, sourced. |
| Outreach templates | [`R-Q1-S-009-outreach-templates.md`](./R-Q1-S-009-outreach-templates.md) | Email (EN + Sanskrit-aware HI), WhatsApp, call script, 6-row objection bank, per-sampradaya variants. |
| Qualification rubric | [`R-Q1-S-009-qualification-rubric.md`](./R-Q1-S-009-qualification-rubric.md) | 5-axis 100-point scoring with tier thresholds and 7 hard disqualifiers. |
| Follow-up cadence | [`R-Q1-S-009-followup-cadence.md`](./R-Q1-S-009-followup-cadence.md) | D0/D3/D7/D14/D30 with acharya schedule constraints (sandhya / anushthana / chaturmasya). |

## Top-3 priority targets (Tier A) — founder personal outreach

These three surface as the highest-leverage Q1 candidates after applying the rubric. Founder reviews and confirms before D0 send.

1. **Sandipani Muni School (ISKCON Vrindavan)** — Gaudiya, Vrindavan UP, ~400 students. Bhaktivedanta Trust-backed, established donor flows, strong digital readiness. Sponsor-a-student model maps directly to existing fundraising scaffolding.
2. **Poornaprajna Vidyapeetha** — Madhva, Bengaluru KA, ~90 students. HH Sri Vishwapriya Tirtha administration; Udupi Ashta-Matha network. Donor-attribution-friendly. Sanskrit-pedigree gives Bhaktisetu a verifiable Madhva anchor.
3. **Veda Vijnana Gurukulam** — Smarta-Advaita, Bengaluru KA, ~60 students. Sri Ramachandra Bhatt-led, residential brahmachari program, no-fee onboarding fits the institution's "no commerce" stance.

Backup queue (Tier A/B): Sampurnanand Sanskrit Vishwavidyalaya feeder (Varanasi), Sandipani Veda Vidya Pratishthan Kashi unit (Varanasi), Jiva Institute Gurukul (Vrindavan), Bhaktivedanta Gurukula and International School (Vrindavan), Gurukul Kangri (Haridwar).

## Sampradaya distribution

- Gaudiya: 4 prospects (Vrindavan-heavy as expected).
- Smarta / Smarta-Advaita: 4 prospects (Varanasi + Bengaluru).
- Madhva: 1 prospect (Bengaluru).
- Advaita-Vedanta: 1 prospect (Bengaluru).
- Arya-Samaji-Vedic: 1 prospect (Haridwar).
- Smarta-Yajurveda: 1 prospect (Bengaluru).

No row mixes paramparas. Per-sampradaya outreach variants are documented in `outreach-templates.md`.

## Founder review checklist

- [ ] Approve top-3 priority targets OR re-rank.
- [ ] Decide whether to send English or Hindi formal email per prospect (default: institution's website-language).
- [ ] Confirm founder email signature line to substitute into templates.
- [ ] Decide whether to seek introductions through known intermediaries before D0 cold-touch (Jiva Institute, BGIS, and CIF Bengaluru likely benefit from warm-intro).
- [ ] Set up `_R-Q1-S-009-state.json` skeleton on first D0 send.

## Guard-rails (verbatim from spec)

- DO NOT contact acharyas pretending to represent Bhaktisetu officially. Artifact-only.
- NO fabricated student counts. Unverified figures suffixed `est?` with source.
- Respect parampara — never mix Gaudiya / Madhva / Smarta pitches in one template; segment.
- NO new cities outside the 5-city allow-list.

## Index update

`docs/roadmap/_index.json` entry for `R-Q1-S-009`:

- `status` → `ready-for-founder-execution`
- `handoff_notes` → append: "2026-06-13: dossier shipped by sub-agent cycle 1 (target list, outreach templates, rubric, cadence, acceptance)."
- `updated_at` → 2026-06-13.

## Cost actuals

- est tokens spec: 15k. Actual: ~8k synthesis + ~3k research framing.
- est minutes spec: 75. Actual: well under wall-cap.

## Next cycle handoff

If founder has not actioned the top-3 by D7, the next sub-agent cycle should:

1. Re-verify the source_url for each Tier A prospect (websites can change).
2. Add 2–3 additional Tier B prospects if outreach hasn't begun (keeping the 5-city geo constraint).
3. NOT send any outreach. NOT contact any institution. NOT generate brahmachari-personal information.
