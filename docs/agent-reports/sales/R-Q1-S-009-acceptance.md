# Acceptance — R-Q1-S-009 Onboard 3 Gurukuls (Vedic Schools)

> Tests-first artifact per queue spec. Verifies the dossier before sub-agent emission.

## A1. Target CSV completeness

- File `R-Q1-S-009-gurukul-target-list.csv` exists.
- Row count ≥ 11 (header + ≥ 10 prospects).
- Header matches verbatim:
  `name,city,state,parampara,head_acharya,student_count,contact_name,phone,email,website,source_url,suggested_approach,priority_tier`
- Every row has a non-empty `source_url` pointing to a registry, official site, news article, or sampradaya directory (ISKCON / Chinmaya / RKM / Sandipani Pratishthan / Sansthan).
- Cities ⊆ {Varanasi, Vrindavan, Haridwar, Bengaluru, Mumbai} (Mumbai only if Sandipani / Somaiya-grade options surface). NO new cities outside this list.
- `student_count` cells suffix `est?` whenever the figure is not from an official source.
- At least one prospect per parampara cluster: Gaudiya, Smarta, Madhva, Advaita-Vedanta. No row mixes paramparas.

## A2. Outreach templates

- File `R-Q1-S-009-outreach-templates.md` exists.
- Sections present (exact headers):
  - `## Formal email (English)`
  - `## Formal email (Sanskrit-aware Hindi)`
  - `## WhatsApp short-form`
  - `## Call script`
  - `## Objection bank`
- Email opens with Sanskrit invocation (e.g., `नमो गुरुभ्यः`).
- Objection bank covers ≥ 4 entries including: brahmacharya privacy, parampara purity, "we don't take online money", donor-attribution skepticism.
- Per-sampradaya variants documented (Gaudiya / Smarta / Madhva / Advaita — never mixed in one outgoing message).

## A3. Qualification rubric

- File `R-Q1-S-009-qualification-rubric.md` exists.
- Scoring axes documented with weights summing to 100:
  - Parampara legitimacy
  - Student count
  - Financial transparency
  - Digital readiness
  - Geographic fit
- Tier thresholds documented: Tier A (≥ 75), Tier B (50–74), Tier C (< 50).
- Disqualifiers section lists ≥ 3 hard-stops (e.g., legal disputes, pending FCRA audit, "guru" with no traceable parampara).

## A4. Follow-up cadence

- File `R-Q1-S-009-followup-cadence.md` exists.
- Touch points present: D0, D3, D7, D14, D30. (Longer than gaushala by design.)
- Each touch documents: channel, message template reference, who acts, escalation trigger.
- Acharya schedule constraints (sandhya / anushthana / chaturmasya) are explicitly accommodated.

## A5. Summary + index update

- File `R-Q1-S-009-summary.md` exists.
- Summary links the four sibling deliverables and surfaces the top-3 priority targets for founder review.
- `docs/roadmap/_index.json` entry for `R-Q1-S-009`:
  - `status = "ready-for-founder-execution"`
  - `handoff_notes` appended with today's date and "dossier shipped by sub-agent cycle 1".
  - `updated_at` is today.

## A6. Guard-rails

- No agent contacts acharyas pretending to represent Bhaktisetu officially. Artifact-only.
- No fabricated student counts. Any unverified figure is suffixed `est?` with a citation.
- No cross-parampara message bundling.
- No outreach copy in the dossier that violates donor-matching neutrality.
