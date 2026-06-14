# R-Q2-SA-002 Handoff — BAPS Swaminarayan First Meeting + Scoping Note

> **Roadmap item**: R-Q2-SA-002 (P1) · **Status**: PARTIAL — outreach scaffolding shipped; founder action required to hold first meeting.
> **Authored**: 2026-06-15 by ship-loop agent · **Owner role**: sales · **Founder action**: YES

## What this item requires

Per the roadmap item spec (`docs/roadmap/items/Q2/sales/002-baps-swaminarayan-outreach-first-meeting-scoping-n.md`):

- KPI: `baps_meeting_held` 0 → 1 (target: one scoping meeting held with BAPS Swaminarayan administration in Q2).
- KPI source is `manual` — agent cannot register the meeting; founder logs it after it occurs.
- Scoping note documenting BAPS feedback + fit assessment for Q3 partnership pipeline (feeds R-Q3-SA-002 BAPS 5-temple commercial agreement).

## What agent shipped this cycle

| Asset | Path | Purpose |
|---|---|---|
| Outreach spec (existing) | `docs/sales/baps-swaminarayan-outreach-spec.md` | 3-tier outreach plan (BAPS Charities US → Akshardham UK → BAPS Mumbai HQ). |
| 5-temple plan (existing) | `docs/sales/baps-swaminarayan-5-temple-plan.md` | Q3 follow-on commercial scope (Akshardham Delhi/Gandhinagar/Mumbai/London/Houston). |
| MSA template (existing) | `docs/sales/baps-5-temple-msa-template-2026-06.md` | Q3 commercial agreement template, blocked until Q2 meeting completes. |
| HAF warm-intro path (existing) | `docs/sales/baps-intro-via-hindu-american-foundation.md` | Hindu American Foundation warm-intro option as alternative to cold outreach. |
| This handoff | `docs/sales/R-Q2-SA-002-handoff.md` | Founder-action checklist + scoping note template. |

## What founder must do to close R-Q2-SA-002

This is **explicitly founder-action-required** — agent cannot conduct a discovery meeting on the founder's behalf. The roadmap item KPI source is `manual` precisely for this reason. BAPS organisational protocol requires founder-to-Sant interaction; agent-driven email blasts will be ignored or rejected.

### Sequenced founder TODO

1. **Tier 1 send — BAPS Charities US (cold email)**
   - Compose using outreach-spec.md tone (foundation letterhead, NRI super-app angle).
   - Send from `founder@bhaktisetu.com` (or current verified domain) to `hello@bapscharities.org`.
   - CC: any HAF intro contact if path #4 active.
   - Expected: 7-14 day response window. ~25% reply rate based on cold-outbound benchmarks.

2. **Tier 2 send — Akshardham UK / Foundation operations**
   - LinkedIn outreach to operations head (search "Akshardham UK operations" + filter London).
   - Personalized 3-sentence connection request → if accepted, send 80-word scoping ask.

3. **Tier 3 fallback — BAPS Mumbai HQ letter-mail**
   - Only if Tier 1 + 2 both silent past 21 days.
   - Physical letter on Bhaktisetu letterhead via Speed Post AD, signed by founder.
   - Addressed to: BAPS Swaminarayan Sanstha, Shahibaug, Ahmedabad 380004.

4. **Optional warm-intro — Hindu American Foundation**
   - Reference `docs/sales/baps-intro-via-hindu-american-foundation.md`.
   - HAF has cross-org relationships with BAPS Charities US board.

5. **Schedule + hold first meeting (30 min video call preferred)**
   - Once any tier returns interest, propose 3 time slots IST-friendly + their TZ.
   - Format: 5-min Bhaktisetu intro deck → 15-min BAPS questions → 10-min collaboration scoping.
   - Carry: pitch deck (`docs/sales/temple-onboarding-pitch-deck.md`), trust-stack one-pager, NRI-MRR proof points.

6. **Write scoping note immediately post-meeting (within 24h)**
   - Append to this file at `## Scoping note — [DATE]` section below.
   - Capture: BAPS rep name + role, willingness scale 1-5 (commerce / live-darshan / cross-promote), objections raised, agreed next step + date, founder gut feel on probability.
   - Tag with `[VERIFY-FOUNDER]` any factual claims BAPS made that need source-checking before Q3 partnership commitment.

7. **Post-meeting — flip the KPI counter**:
   - Update `docs/roadmap/_manual-kpis.yml`: set `baps_meeting_held: 1` and bump `last_updated`.
   - Then run `node scripts/agents/roadmap/_validate-items.mjs` locally to confirm validator passes.
   - Update this item's frontmatter via PR: status `in_progress` → `done`, set `shipped_at`, set `verified_at` once orchestrator picks up the KPI flip on next cycle.

8. **Feed forward into R-Q3-SA-002**
   - If meeting result is positive (willingness ≥3), advance R-Q3-SA-002 status to `in_progress` and queue legal review of `docs/sales/baps-5-temple-msa-template-2026-06.md`.
   - If meeting result is negative (willingness ≤2), park R-Q3-SA-002, log realistic Q3 ask (live-darshan partnership only per outreach-spec.md long-term-play section).

## Realistic expectations (per outreach-spec.md analysis)

- BAPS unlikely to be full commerce partner (internal philosophy of self-service via own app).
- Realistic Q2 ask: scoping call only, no commitment.
- Realistic Q3+ ask: live-darshan partnership for non-BAPS users + cross-promote BAPS mobile app on Bhaktisetu.
- Risk mitigation: budget zero ₹ from BAPS in 2026 revenue model, treat any close as upside.

## Scoping note — [TBD post-meeting]

> Founder fills this section after first meeting concludes. Template:
>
> **Date**:
> **Attendees (BAPS)**: [name, role]
> **Attendees (Bhaktisetu)**: [founder + any]
> **Channel**: [video / in-person / phone]
> **Duration**:
>
> **Willingness scale (1-5)**:
> - Commerce partnership:
> - Live-darshan collab:
> - Cross-promote / co-marketing:
>
> **Objections raised**:
> 1.
> 2.
>
> **Agreed next step**:
> **Next step date**:
> **Founder gut feel on Q3 partnership probability**: [low / medium / high]
> **Items to verify before Q3 commit**: [tag with `[VERIFY-FOUNDER]`]

## Closes

R-Q2-SA-002 — outreach kit + founder-action checklist + scoping-note template shipped. KPI flip pending founder meeting.

<!-- Closes: Q-C-2026-06-15-R-Q2-SA-002 -->
