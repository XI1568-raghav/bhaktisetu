# Varanasi temple onboarding artifact bundle (R-Q1-S-004)

Artifact-only deliverable. Founder runs actual outreach. Agent ships scripts + target list + verification checklist + intake spec + acceptance harness.

## Files

| File | Purpose |
|---|---|
| `README.md` | this — index + end-to-end workflow founder follows |
| `target-list.csv` | 25 candidate temples (2.5× funnel for 10 closes) |
| `target-list-research.md` | per-temple notes + contact discovery method |
| `outreach-script-hindi.md` | phone + in-person Hindi script |
| `outreach-script-english.md` | email template fallback |
| `whatsapp-templates.md` | 3 WhatsApp variants (cold, follow-up, recap) |
| `verification-checklist.md` | 8 mandatory gates before `live` status |
| `intake-form-spec.md` | Supabase `temple_partners` schema spec |
| `crm-tracking.csv` | status pipeline lead→contacted→verified→live |
| `acceptance-harness.md` | how to prove 10 verified at month-end |

## End-to-end workflow (founder runs)

### Week 1: outreach launch
1. Open `crm-tracking.csv`. All 25 rows start at `status=lead, owner=founder, next_action=initial_outreach`.
2. Prioritize Tier 1 (VNS-001 through VNS-008) — start with VNS-002 Sankat Mochan (highest probability of fast yes — see research notes).
3. For each Tier 1 row:
   - Discover phone via `target-list-research.md` method (field visit / phone directory / org website).
   - Update `target-list.csv` row with verified phone/email — never invent.
   - First touch: phone call using `outreach-script-hindi.md`. Goal: 15-min in-person meeting.
   - If no answer: send `whatsapp-templates.md` cold first-touch.
   - Update `crm-tracking.csv`: `status=contacted, last_touch_date=YYYY-MM-DD, next_action=followup_in_3d`.

### Week 2: meetings + doc collection
4. For each `meeting_set` row, attend physical meeting at temple. Take 4 things:
   - 1-page printed brief (revenue model + 80G compliance + zero upfront).
   - 2-page MOU draft (legal template — separate file, not in this batch).
   - 8-gate `verification-checklist.md` printout.
   - Founder ID + business card.
5. Post-meeting: send `whatsapp-templates.md` post-meeting recap.
6. Begin document collection per Gate 1–4. Update `crm-tracking.csv` to `docs_received` when 12A/PAN/cancelled-cheque/signatory-ID landed.

### Week 3: verification gates 5–8
7. For each `docs_received`: schedule field visit OR get video walk-through (Gate 5).
8. Tech ops runs live-stream check (Gate 6) — `temple-partners/{temple_id}/livestream-test.mp4` to Supabase storage.
9. Collect pandit roster (Gate 7) — minimum 3 named pujaris.
10. Counter-sign MOU (Gate 8) — both founder + temple authorized signatory.
11. Update `crm-tracking.csv`: `status=verified, verified_at=YYYY-MM-DD`.

### Week 4: surface launch
12. Engineering enables temple surface in `temple_partners` table (status flip lead-to-`live`). Founder confirms via `acceptance-harness.md` query.
13. Test booking flow end-to-end on each `live` temple — 1 darshan slot + 1 bookable pooja must work before declaring `live`.
14. Update `crm-tracking.csv`: `status=live, live_at=YYYY-MM-DD`.

### Cutoff: day-30 sign-off
15. Run `acceptance-harness.md` SQL. Confirm ≥10 rows with `status=live AND mou_signed_at IS NOT NULL AND city='Varanasi'`.
16. Founder appends sign-off row in `docs/roadmap/_ship-log-YYYY-MM-DD.md` for R-Q1-S-004.
17. If <10: file `R-Q1-S-004-RETRY` per acceptance harness contingency rules.

## Out of scope (do NOT do as part of this batch)

- Live phone/email outreach (founder runs after batch lands).
- Supabase migrations (spec only — engineering ships migration in follow-up item).
- UI components (booking surface uses existing `/pujas`, `/temples` routes).
- Payment integration (Razorpay flow already shipped).
- Non-Varanasi cities (separate roadmap items per city).

## Test

Schema test at `tests/sales/varanasi-temples-artifacts.test.ts` validates:
- All 10 artifact files exist
- `target-list.csv` has ≥25 rows + 12 required columns + non-empty `research_source`
- `crm-tracking.csv` has 9 required columns + valid status enum
- `verification-checklist.md` contains all 8 mandatory gates verbatim
- `intake-form-spec.md` has ≥12 fields with type/required headers
- Outreach scripts have correct registers + booking-link placeholder

Run: `npx vitest run tests/sales/varanasi-temples-artifacts.test.ts`

## KPI alignment

- Roadmap target: 10 verified Varanasi temples by month-1.
- Funnel ratio: 25 targets → 10 verified = 40% conversion (industry-typical for B2B religious-trust sales is 20-40%).
- Revenue-impact tag: each `live` temple is expected to generate ₹50k–5L GMV/month based on tier (Kashi top-end, Tier-3 family-trusts at low-end).
