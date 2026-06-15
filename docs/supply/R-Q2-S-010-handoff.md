# R-Q2-S-010 — Onboard +3 gaushalas (cumulative 8) — Handoff

> **Status**: PARTIAL — spec ready, KPI gated on founder verification + onboarding
> **Roadmap item**: `docs/roadmap/items/Q2/supply/010-onboard-3-gaushalas-cumulative-8-up-mp-rajasthan-a.md`
> **Parent spec**: `docs/supply/3-more-gaushalas-q2-spec.md` (authored 2026-06-13)
> **Depends on**: R-Q1-S-008 (first 5 gaushalas)
> **Batch**: R5 ship-log 2026-06-15

## Why this exists as a handoff

The roadmap item ships with a TBD `agent_brief.prompt_skeleton` and a TBD KPI query (`verified_gaushalas_count` source `supabase`, query `TBD-populate-before-orchestrator-go-live`). The spec in `docs/supply/3-more-gaushalas-q2-spec.md` names the 3 target gaushalas but the verification + onboarding work is founder-only — it is not a code change an agent can ship end-to-end.

Per the R5 ship rules: **do not auto-claim `status=shipped` on items where KPI requires founder action.** Status stays `in_progress`.

## What's already in place

- Per-cow data model + adoption flow shipped under R-Q1-S-008 (referenced by Q2 spec as the reusable substrate).
- Adopt-a-cow subscription product `R-Q2-P-004` exists at `docs/roadmap/items/Q2/product/004-gaushala-adopt-a-cow-subscription-501-mo-per-cow-w.md` (501 INR/mo per cow) and is the demand-side lever for the 80+ cow target.
- Q1 onboarding playbook (R-Q1-S-008) supplies the verification + tech + commission model the Q2 batch reuses verbatim — no new engineering required to onboard gaushalas #6-#8.

## What the founder needs to do (verification gate)

The 3 target gaushalas named in the Q2 spec are placeholders. Before claiming the KPI:

1. **Identify real gaushalas** (3) — one each in UP, MP, Rajasthan. Spec suggests Govardhan Gaushala (Mathura), Pandit Madhukar Gaushala (Indore), Bharatpur Gaushala — these are illustrative targets, not confirmed onboardings. **[VERIFY-FOUNDER]** the actual names, registration numbers, and contact details before publishing.
2. **Run R-Q1-S-008 verification checklist** per gaushala: 80G/12A registration check, site visit or video walkthrough, manager KYC, bank account verification for commission payouts.
3. **Per-cow census** — capture ≥ 25 cows per gaushala (target floor for 80+ cumulative). Photos, names, age, health status, adoption-ready flag.
4. **Tech onboarding** — manager account, gaushala-manager role assignment, dashboard walkthrough, first cow listing through `POST /cows` endpoint (shipped under HANDOFF #20 2026-06-08 commit 2573d34).
5. **Populate KPI query** — once 3 gaushalas live in `Gaushala` table with `verified_at IS NOT NULL`, write the supabase query (target: `select count(*) from gaushalas where verified_at is not null and quarter_onboarded in ('Q1-2026', 'Q2-2026')`) and paste into the roadmap item frontmatter `kpi.query` field, replacing `TBD-populate-before-orchestrator-go-live`.

## Why this is not status=shipped

- KPI `current: 0`, `target: 8` — and target is `verified_gaushalas_count`, not `gaushalas_invited`. Cannot self-attest to verification.
- No fabricated founder/manager names, no invented phone numbers, no invented onboarding dates — per R1-R4 lessons absorbed into R5.
- Real verification is founder-touch work spanning days/weeks of relationship building. Marketing copy projection: "target 8 by end Q2 2026"; not a shipped fact.

## What this PR ships

- This handoff doc only. No code, no fabricated data, no marketing claims.
- Status in the roadmap item file stays `in_progress`. No edit to the frontmatter.
- Ship-log row appended noting PARTIAL + founderAction=true.

## Next-action prompt for founder

When ≥1 gaushala onboards end-to-end:

1. Update `docs/roadmap/items/Q2/supply/010-onboard-3-gaushalas-cumulative-8-up-mp-rajasthan-a.md` `kpi.current` to actual count.
2. Add `success_criteria` row per onboarded gaushala with date + verified_at field.
3. When count hits 8, flip `status: shipped` + set `shipped_at: <ISO>` + `verified_at: <ISO>`.
4. Backfill `handoff_notes` with the real gaushala names + locations + cow counts.

## References

- Q1 onboarding spec (reused): `docs/supply/5-gaushalas-onboarding-spec.md` (if extant) or R-Q1-S-008 item file.
- Adopt-a-cow demand side: `docs/roadmap/items/Q2/product/004-gaushala-adopt-a-cow-subscription-501-mo-per-cow-w.md`.
- Cow listing endpoint: `apps/api/src/routes/gaushala-portal.ts` `POST /cows` (TASKS.md HANDOFF 2026-06-08 #20).

— R5 ship batch, 2026-06-15
