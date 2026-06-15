# R-Q2-S-009 — Astrologer onboarding handoff (Q2 +10)

> **Roadmap item**: R-Q2-S-009 (P1) · **Status**: in_progress · **Founder action required**
> **Authored**: 2026-06-15 (R5 batch ship cycle)

## Goal

Q2 onboarding target: **+10 verified astrologers** (cumulative 20 across the
Bhaktisetu network). Q1 target of 10 covered by R-Q1-S-007.

KPI source query (Supabase):

```sql
SELECT COUNT(*) FROM "UserRoleAssignment"
WHERE role='astrologer' AND verified=true AND created_at >= '2026-04-01';
```

## Why this is founder action, not agent action

Astrologer verification requires a human in the loop:

1. **Credential review** — institute / lineage / years of practice. No public
   registry equivalent to BMC or temple-trust databases. Founder must read each
   submitted CV manually.
2. **Sample reading review** — 3 anonymised historical cases. Quality signal is
   subjective; a sales sub-agent cannot decide pass/fail.
3. **Bank account + Aadhaar** for payouts post Aadhaar gate (business rule #4).
4. **Pricing tier negotiation** — ₹1500 / ₹3000 / ₹5000 basic / premium / deep.
   Premium pricing is per astrologer; founder negotiates.

Per CLAUDE.md "Pitfalls" — `status` MUST stay `in_progress` until founder
flips it (KPI requires founder action).

## Pipeline tracking workflow

Existing flow (P18 HANDOFF 2026-05-27) — re-use:

```
sourcing → applied → KYC submitted → sample reading review
        → admin Approve (welcome email) | Reject (decline note)
        → verified=true row in UserRoleAssignment
```

Admin UI: `/admin/leads` page → PATCH `/api/v1/admin-leads/:id/status` with
zod-validated enum (`PENDING` / `CONVERTED` / `UNSUBSCRIBED` / `BOUNCED`).
Sends Resend welcome HTML on `CONVERTED`, polite decline on `UNSUBSCRIBED`.

## Candidate sourcing checklist for founder

> Treat counts below as **target / projection** — actual yield depends on
> founder outreach response rates. Names left as `{{token}}` for founder to
> fill before initiating outreach.

### Bucket A — Vedic kundli + transit (target 4)

- **Pune** — Pune Vidyapeeth Jyotish Mahavidyalaya alumni network. Founder to
  reach out via `[VERIFY-FOUNDER]` contact at the institute.
- **Bengaluru** — ISKCON Bangalore has affiliated jyotish consultations;
  cross-link with R-Q2-S-011 (ISKCON partnership LOI).
- **Varanasi** — Sampurnanand Sanskrit University publishes a directory.
- **Mumbai** — Bharatiya Vidya Bhavan jyotish course alumni; founder LinkedIn
  outreach to `{{founder_to_fill}}`.

### Bucket B — Lal Kitab + remedies (target 2)

- **Punjab (Jalandhar / Ludhiana)** — Lal Kitab is regional speciality.
  Founder to contact `[VERIFY-FOUNDER]` astrologer associations.
- **Delhi** — Pahar Ganj / Karol Bagh markets historically host Lal Kitab
  practitioners; needs in-person validation.

### Bucket C — Numerology (target 2)

- **Bengaluru** — overlap with NRI tech audience; numerology high-LTV in
  startup founder demographic per existing R-Q1 customer interviews.
- **Hyderabad** — Telugu-language numerology service gap noted in R-Q2-G-003
  geo expansion brief.

### Bucket D — Tantra (Devi tradition) (target 1)

- **Varanasi / Kolkata** — Kamakhya / Tarapith lineage. **Highly sensitive
  domain** — founder must verify lineage authenticity in person; do NOT take
  online claims at face value.

### Bucket E — Western + Vedic fusion (NRI) (target 1)

- **Bay Area / NJ / London** — diaspora practitioners with Indian classical
  training. Channel: NRI WhatsApp circles, alumni groups. Founder direct intro.

## Pricing tiers (per existing spec, do not invent new tiers)

| Tier | Duration | INR | NRI USD |
|---|---|---|---|
| Basic | 30 min | ₹1,500 | $18 |
| Premium | 60 min | ₹3,000 | $36 |
| Deep kundli analysis | 90 min | ₹5,000 | $60 |

Platform commission: **30-40%** (vs 20-30% pandit; higher because Q&A premium +
chat-back support). Confirm per astrologer during onboarding negotiation.

## Cross-link to consultation lifecycle

Each onboarded astrologer should light up in:

- `/astrology/[id]/view` — public profile page (existing route)
- `/astrology/[id]/book` — Razorpay booking form (existing route)
- `AstrologerConsultation` table via `POST /api/v1/consultation/book`
- Admin lifecycle: `/admin/consultations` page (P18 follow-up, HANDOFF
  2026-05-31 #2)

Success criterion from spec: **≥5 of the 10 must show ≥1 row in
`AstrologerConsultation`** by end of Q2 — proves they're actually consulting,
not just listed.

## Daily drip agent already wired

`scripts/agents/onboarding-v2/astrologer.mjs` runs daily 09:23 UTC via
`.github/workflows/onboarding-fleet-v2.yml`. Drafts day-0 welcome WhatsApp
copy from `TEMPLATES.astrologer.day0_welcome`. **Founder reviews + sends
manually** (per HANDOFF P-Phase G note on staying within WhatsApp Cloud free
tier and avoiding marketing-copy fabrication).

To enqueue a candidate for the drip: append a row to the contacts source the
drip reads (see `_onboard-lib.mjs` `loadState()` for path). Each row needs
`{ id, name, phone, city, role: 'astrologer', joinedAt }`.

## Tracking artifacts

- Founder weekly pipeline notes → `docs/agent-reports/YYYY-MM-DD-astrologer-pipeline.md`
- KPI snapshot in `_budget-snapshot.json` updated by orchestrator post-cycle.
- This handoff stays as `in_progress` until verified count hits 20 cumulative.

## Open questions for founder

1. Bucket-D Tantra astrologer — does founder want to ship one this quarter or
   defer? Reputational risk if vetting fails.
2. NRI fusion astrologer — does founder want to gate behind R-Q2-G-002 NRI
   geo-IP banner (likely yes) so they only appear to non-IN traffic initially?
3. Comp split — should `verified=true` flag also require ≥1 completed
   consultation, or is KYC-only acceptable for the KPI? Spec says verified
   flag requires KYC + sample reading review — implies KYC-only is fine,
   live consultation is a separate KPI in success_criteria bullet 4.

---

_This is a handoff doc, not a complete ship. R5 ship-log row status = `in_progress`._
