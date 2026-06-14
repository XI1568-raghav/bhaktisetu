# R-Q1-P-002 — Audit + remove 8 portal pages with hardcoded mock arrays (CPO §1)

**Status**: PARTIAL — spec too thin, stub handoff per ship-step fallback.
**Branch**: `product/R-Q1-P-002-batch-2026-06-14`
**Estimate**: 16h (full audit + replace 8 pages end-to-end)
**Cap on this slot**: 20 min — insufficient for engineering execution; auditing instead.

## Spec context

Original spec (`docs/roadmap/items/Q1/product/002-audit-remove-8-portal-pages-with-hardcoded-mock-ar.md`) is the imported placeholder from the 2026-06-09 bulk content sprint. `success_criteria`, `agent_brief.prompt_skeleton`, and KPI `query` all say "TBD — populate during first sub-agent emission cycle". Founder action needed to populate before engineering can ship the real fix.

## Audit completed this slot

Searched all 7 portal trees (`gaushala-portal`, `temple-portal`, `astrologer-portal`, `wellness-portal`, `gurukul-portal`, `priest`, `store-admin`) for:

1. **Hardcoded object literal arrays** (`const X = [{ id: ..., ... }]` in component body): **0 matches.** Prior HANDOFFs (notably 2026-06-08 #19, #20) already cleaned the most egregious portals — `priest/page.tsx` L119 fetchError banner, `astrologer-portal/page.tsx` L125 pending=null truth-label, `temple-portal/page.tsx` L174-177 "Live donations feed pending" honesty label.

2. **`Array.from({ length: N })` placeholders**: 3 hits — all loading-skeleton renderers (legitimate UX pattern, not mocks):
   - `temple-portal/donations/page.tsx:159`
   - `wellness-portal/students/page.tsx:147`
   - `priest/reviews/page.tsx:132`, `:213`

3. **Other mock identifiers** (`mockData`, `fakeData`, `dummyData`, `sampleData`, `seedData`): 0 matches in portal trees.

## Interpretation

The "8 portal pages with hardcoded mock arrays" original audit target is **already resolved** by the 2026-06-08 QA-sweep batch (commits `fd6a71a`, `c7e9264`, `1126984`, `e500fef`) which closed the 13 critical truthfulness bugs across all 7 portals. Remaining "Array.from" hits are loading skeletons, not mocks.

## Recommended founder action

Either:

- **(a)** mark `R-Q1-P-002` as already-shipped via the prior QA-sweep commits — flip `status: in_progress → shipped` + add `shipped_at: 2026-06-08T11:20:00Z` + bump `kpi.current: 0 → 8` to close out. Reference commits `fd6a71a`, `c7e9264`, `1126984`, `e500fef` in `handoff_notes`. This is the lower-effort path and reflects reality.
- **(b)** repopulate the `success_criteria` + `agent_brief.prompt_skeleton` with a deeper definition of "hardcoded mock arrays" — e.g. expand scope to per-puja seed-data fallback arrays in `apps/web/lib/fallbackPujas.ts`, hardcoded testimonial arrays in marketing pages, or sample data in admin demo flows — then re-dispatch as a fresh 16h engineering item. If choosing this path, name the 8 specific files in `agent_brief.context_files` so a subsequent agent can ship without re-auditing.

## Why this slot returned PARTIAL

- 20-min cap insufficient for either (a) full 8-page rewrite (16h) or (b) deep cross-tree audit to find non-obvious mock arrays.
- Spec placeholder prevents agent from knowing which 8 pages were originally intended.
- Audit confirms no obvious portal-page mocks remain in the visible portal trees, so blindly inventing 8 fixes would risk regression.

## Label

`founder-action-required` — pending founder decision between (a) close-as-shipped or (b) re-scope with concrete 8-file list.
