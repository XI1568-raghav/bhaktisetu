# R-Q3-SA-002 Handoff — BAPS Swaminarayan 5-Temple Commercial Agreement

> **Roadmap item**: R-Q3-SA-002 (P0) · **Status**: PARTIAL — sales-draftable assets shipped; founder + counsel + BAPS countersign required to close.
> **Authored**: 2026-06-14 by ship-loop agent · **Owner role**: sales · **Founder action**: YES

## What this item requires

Per the roadmap item spec (`docs/roadmap/items/Q3/sales/002-baps-swaminarayan-5-temple-commercial-agreement-si.md`):

- Countersigned commercial MSA covering 5 BAPS temples (Akshardham Delhi + Akshardham Gandhinagar + BAPS Mumbai Dadar + BAPS Neasden London + BAPS Houston).
- Revenue split 20–40% platform commission per business rule #3.
- Each BAPS temple live with min 3 puja SKUs + Pandit roster (depends on R-Q3-S-010 central pipeline).
- First 30 days post go-live ≥ ₹2L GMV across 5 BAPS temples.

## What agent shipped this cycle

| Asset | Path | Purpose |
|---|---|---|
| MSA template (sales draft) | `docs/sales/baps-5-temple-msa-template-2026-06.md` | Copy-paste-into-Word, 10-section MSA with 25% commission default, video-proof SLA, per-temple termination, DPDP annex reference. Reuses ISKCON LOI structure (R-Q2-SA-001). |
| Outreach plan (existing) | `docs/sales/baps-swaminarayan-5-temple-plan.md` | Channel + tone for BAPS engagement (foundation letterhead, Sant Mandal HQ Gandhinagar). |
| Outreach spec (existing) | `docs/sales/baps-swaminarayan-outreach-spec.md` | Detailed outreach playbook. |
| Hindu American Foundation intro path (existing) | `docs/sales/baps-intro-via-hindu-american-foundation.md` | Warm-intro option. |

## What founder must do to close R-Q3-SA-002

This is **explicitly founder-action-required** — agent cannot countersign a commercial MSA on behalf of BAPS. The roadmap item KPI source is `manual` precisely for this reason.

### Sequenced founder TODO

1. **Pre-req — verify R-Q3-S-010 BAPS central pipeline status**.
   The MSA only ships once BAPS HQ has surfaced temple-by-temple commitment letters via `admin-leads` source=`baps_central_pipeline`.
2. **External legal counsel red-line review** of `docs/sales/baps-5-temple-msa-template-2026-06.md`.
   Approx 1 week. Areas of legal scrutiny: DPDP joint-fiduciary frame, multi-jurisdiction (Canada/UK/US BAPS centres), arbitration seat Ahmedabad, refund-claw-back on SLA breach.
3. **CFO sign-off** on commission split (default 25%, range 20–40% per business rule #3) + revenue recognition treatment + GST clauses.
4. **Render letterhead PDF** of the redlined MSA via Foundation letterhead + 80G + CSR-1 cert references.
5. **Schedule countersign meeting** with BAPS Sant Mandal / Akshardham central admin
   (Sadhu Brahmaviharidas or designate). In-person at Akshardham Gandhinagar preferred.
6. **Carry signed MSA + ops handover kit** for per-temple coordinator onboarding (3 puja SKUs + pandit roster + video-proof workflow training).
7. **Post-signing — flip the KPI counter**:
   - Update `docs/roadmap/_manual-kpis.yml`: set `baps_agreement_signed: 1` and bump `last_updated`.
   - Update `docs/roadmap/items/Q3/sales/002-baps-swaminarayan-5-temple-commercial-agreement-si.md`:
     - `status: in_progress` → `status: shipped`
     - `shipped_at: null` → `shipped_at: <ISO timestamp>`
     - `kpi.current: 0` → `kpi.current: 1`
8. **Track 30-day post-go-live GMV milestone** (success criterion #4: ≥ ₹2L across 5 BAPS temples).

## Why agent did not flip status to shipped

- KPI source is `manual` (`docs/roadmap/_manual-kpis.yml`).
- No engineering work changes whether the MSA is signed — only a countersign meeting between founder and BAPS Sant Mandal closes this item.
- Agent shipped the highest-leverage sales-draftable artifact (MSA template) so that founder can act immediately after legal red-line.
- This is the documented `agent_assignable: true` execution path: sales drafts redlines + founder owns countersign meeting.

## Risk register

| Risk | Mitigation |
|---|---|
| BAPS HQ slow decision cycle (12+ months) | 12-month pilot term in MSA accommodates this; first revenue from earliest-onboarded temple. |
| BAPS may resist 25% commission | Range up to 40% policy headroom; CFO can negotiate to 30% (still tighter than rural-temple 35–40%). |
| R-Q3-S-010 BAPS central pipeline not unlocked yet | This item explicitly `depends_on: ["R-Q3-S-010"]` — do not send MSA until that pipeline produces temple commitment letters. |
| Multi-jurisdiction tax + DPDP complexity | Counsel red-line specifically covers this; Data Processing Annex is separate document. |
| BAPS rejects partnership | Backup path: BAPS Edmonton + Toronto via R-Q3-S-007 Canada pandit kit if HQ doesn't engage (per `baps-swaminarayan-5-temple-plan.md` §Risk). |

## Definition of done (re-stated from spec)

- [ ] BAPS Akshardham commercial MSA countersigned covering all 5 Pilot Temples.
- [ ] Revenue split 20–40% platform commission confirmed per business rule #3.
- [ ] Each BAPS temple live with min 3 puja SKUs + Pandit roster.
- [ ] First 30 days post go-live ≥ ₹2L GMV across 5 BAPS temples.
- [ ] KPI `baps_agreement_signed` flipped 0 → 1 in `_manual-kpis.yml`.
- [ ] Roadmap item `status: shipped` + `shipped_at` populated.

## PR label

This PR is opened with label `founder-action-required` because the only path to GREEN is founder countersign + manual KPI update. Engineering side complete.
