# R-Q3-F-001 — Pre-Seed Round Close $250K-$500K (handoff)

> Status: PARTIAL — scaffold + workflow + tracker + close-checklist shipped. Founder action REQUIRED to actually raise the capital, sign SAFEs, and receive bank wires. This item ships in_progress and flips to `shipped` only when ≥$250K cleared the founder's business bank account.

## Why this item ships PARTIAL not GREEN

This is a fundraising KPI (`preseed_raised_usd`, target $400K). The capital itself comes from investor conversations, term-sheet negotiation, SAFE signature, and bank wire receipt — none of which an agent can execute. What an agent CAN ship is:

1. The mechanical scaffolding (close-checklist, SAFE template reference, tracker schema, sequence playbook).
2. The decision framework (when to accept lead vs syndicate, valuation cap defense, anti-dilution stance).
3. The hand-off so the founder can drive the close without re-inventing process.

Per global rule in `bhaktisetu-dev` skill ("DO NOT auto-claim shipped status on items where the KPI requires founder action"), status stays `in_progress` until founder updates the manual KPI source.

## KPI

- Metric: `preseed_raised_usd` (manual count, target $400K — band $250K–$500K)
- Source: `docs/roadmap/_manual-kpis.yml` — founder updates `preseed_raised_usd: <amount>` after each wire clears
- Trip: shipped when value ≥ 250000

## Capital strategy (locked Q3)

| Slot | Investor type | Target ticket | Cumulative |
|---|---|---|---|
| Lead | 1× institutional / strong angel | $150K | $150K |
| Follow-on angels | 4-6 × $25K-$50K | $100K-$300K | $250K-$450K |
| Accelerator (optional) | Antler / Surge / Sequoia Spark / Lightspeed Scout | $100K-$125K | $350K-$575K |
| Strategic (NRI devotee operators) | 2-4 × $10K-$25K | $20K-$100K | $370K-$675K |

Floor commit: $250K (the lead alone if all else falls). Ceiling: $500K (close round there even if oversubscribed, to keep dilution sub-15%).

## SAFE template (Y Combinator post-money)

| Term | Value | Rationale |
|---|---|---|
| Instrument | YC Post-Money SAFE | Industry standard; no negotiation drag |
| Valuation cap | ₹15-25 Cr post-money | Defensible at Q3 traction (see floor below) |
| Discount to next round | 20% | Standard pre-seed |
| Pro-rata rights | 1× lead, 0.5× angels | Lead keeps follow-on ammo; angels don't crowd Series Seed cap table |
| MFN | NONE | Avoid retroactive cap reset complexity |
| Side letter | Information rights for lead only (quarterly + audited annual) | Standard |
| Governing law | Delaware (if US LLC parent) OR India Companies Act (if pure India) | TBD by incorporation choice (see `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`) |

Counsel: ₹50K total Q3 legal spend (one Indian firm + one US firm if Delaware). DO NOT use unreviewed SAFE templates from the internet — every change ripples through cap table and SHA.

## Valuation cap defense (talking points for founder)

| Metric (Q3) | Target floor for ₹15 Cr cap | Stretch for ₹25 Cr cap |
|---|---|---|
| MRR | ₹1.5L | ₹4L |
| Cumulative GMV | ₹5L | ₹15L |
| Paying users | 100 | 400 |
| NRI mix | 10% | 25% |
| Top-of-funnel (org SEO + WA + referrals) | 5K visits/mo | 25K visits/mo |
| Geographies | India + 2 NRI | India + 5 NRI |
| Team | Solo founder | Solo + 1 first hire (signed offer letter ok) |

Below ₹15 Cr floor: take the round anyway at lower cap — runway > optics.
Above ₹25 Cr stretch: refuse — saves dilution headroom for Series Seed at credible ₹100-200 Cr.

## Close sequence (12-week W1-W12 Q3 playbook)

| Week | Action | Founder owner | Agent assist |
|---|---|---|---|
| W1 | Lead investor SAFE redlines back to counsel | Founder | None |
| W2 | Lead SAFE signed + $150K wire initiated | Founder | None |
| W2 | Update `_manual-kpis.yml` `preseed_raised_usd: 150000` on wire-cleared day | Founder | Validator catches |
| W3 | Reopen angel pipeline (10-15 warm intros) | Founder | `cxo/cfo.mjs` weekly advisory references pipeline file |
| W3-W6 | Angel conversations + soft commits | Founder | None |
| W6 | First angel SAFE batch closes ($50K-$100K) | Founder | None |
| W6-W9 | Accelerator interviews (if applying) | Founder | None |
| W9 | Accelerator decision (accept / decline) | Founder | None |
| W9-W11 | Second angel batch close to round target | Founder | None |
| W11 | All SAFEs counter-signed + countersignatures filed | Founder + counsel | None |
| W12 | Final wire reconciliation + close memo to all investors | Founder | `weekly-investor-update.mjs` agent extends to monthly until next round |

Each wire-clear triggers a founder action: update `preseed_raised_usd` in `_manual-kpis.yml` and commit `[skip ci]`. The ARE Decision Agent reads this every cycle and auto-flips the roadmap item to `shipped` when the threshold trips.

## Investor pipeline tracker

Source of truth: `docs/finance/investor-pipeline-2026-06.md` (shipped 2026-06-13). Schema per row:

| Investor | Type | Ticket target | Status | Last touch | Next action | Owner |

States: `cold` → `warm intro made` → `pitched` → `soft commit` → `term sheet redlined` → `SAFE signed` → `wire cleared` → `closed`.

Founder updates this file weekly during the round. Agent `cxo/cfo.mjs` reads it for weekly advisory; does NOT modify (founder-owned source).

## Close-checklist (founder runs at each wire-clear)

1. Receive wire confirmation from bank (Razorpay / ICICI / HDFC / Mercury depending on incorporation).
2. Update `docs/finance/investor-pipeline-2026-06.md` — flip investor row to `wire cleared`.
3. Update `docs/roadmap/_manual-kpis.yml`:
   - `preseed_raised_usd: <new cumulative>`
   - `last_updated: <YYYY-MM-DD>`
4. Commit `[skip ci]` with message `chore(finance): preseed wire cleared <investor> $<amount> cumulative $<total>`.
5. Send personal thank-you note from founder (not templated) within 24h.
6. Counter-sign SAFE if not yet done, file with counsel.
7. Add investor to Q1 closed-list mailing for monthly investor update agent.
8. On reaching $250K floor, this roadmap item flips to `shipped` automatically (Decision Agent reads KPI on next cycle).

## Founder-action items remaining (blocking)

- **F1:** Confirm SAFE valuation cap (₹15 vs ₹20 vs ₹25 Cr) — needs lead investor consent.
- **F2:** Confirm incorporation entity used for SAFE issuance — see `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`. Cannot sign SAFEs to a sole-prop.
- **F3:** Open business bank account capable of receiving foreign wires — see `docs/finance/business-bank-account-setup-runbook.md`.
- **F4:** Engage counsel (Indian firm; US firm only if Delaware) — ₹50K total budget.
- **F5:** Lock investor pipeline list (10-15 angels minimum on top of lead). Track in `investor-pipeline-2026-06.md`.
- **F6:** Schedule pitch sessions (calendar — 5-10 first calls per week during W1-W6).
- **F7:** Decide accelerator participation (Antler / Surge / Sequoia Spark / Lightspeed Scout) — independent of round close.
- **F8:** Set up cap-table tracking tool — Carta (~$80/mo, US) or Tartan / EquityList (India, free tier). Pick before second wire clears.

None of F1-F8 are agent-executable. All require founder secrets, counsel relationships, investor relationships, or pure judgment.

## Tripwires (escalation triggers)

| Trigger | Action |
|---|---|
| 6 weeks in, $0 SAFE signed | Renegotiate lead terms OR pivot to bridge convertible note from existing supporters |
| 9 weeks in, < $150K cumulative | Drop valuation cap by ₹5 Cr to accelerate close |
| 12 weeks in, < $250K cumulative | Take what's closed, push remainder to Q4 R-Q4-F-001 follow-on |
| Lead investor backs out mid-round | Pause angel close; reset terms with new lead before continuing (avoids no-lead syndicate problem) |
| Term sheet asks for board seat at pre-seed valuation | Refuse — board seats start at Series Seed minimum |
| Term sheet asks for super-voting shares / liquidation > 1× | Refuse — non-standard for pre-seed SAFE |

## Cross-references

- `docs/finance/pre-seed-round-close-q3-spec.md` — short-form spec authored 2026-06-13 (this handoff supersedes for execution detail)
- `docs/finance/investor-pipeline-2026-06.md` — live pipeline tracker (founder source of truth)
- `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md` — blocks F2
- `docs/finance/business-bank-account-setup-runbook.md` — blocks F3
- `docs/finance/accelerator-applications-checklist.md` — F7 reference
- `docs/finance/pitch-deck-v2-outline.md` + `pitch-deck-v2-financial-model.csv` — pitch artifacts
- `docs/finance/pitch-deck-q1-actuals-addendum.md` — Q1 traction addendum (founder appends Q3 actuals before W1)
- `docs/finance/R-Q3-F-002-handoff.md` — Unit econ M9 audit (depends on this round closing for runway calc)
- `docs/finance/R-Q4-F-003-handoff.md` — Q4 follow-on close (kicks in if Q3 falls short of $250K)
- `docs/roadmap/_manual-kpis.yml` — `preseed_raised_usd` KPI source
- `scripts/agents/roadmap/cxo/cfo.mjs` — weekly CFO advisory references this handoff + pipeline file
