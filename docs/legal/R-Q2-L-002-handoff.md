# R-Q2-L-002 — Priest Contracts (100 Pandits w/ Revenue Share) Handoff

> Status: **founder-action-required**. Template + Schedule A + onboarding tracker spec shipped. KPI flip (100 signed) requires founder recruiting + DocuSign sends.

## Scope

Q2 target: 100 verified pandits onboarded with signed standard revenue-share contract. Covers KYC, video proof, payout, no-show penalties, termination.

## Existing artifacts

| Doc | Purpose |
|---|---|
| `docs/legal/priest-contract-template-100-pandits.md` | Standard agreement v1 — 8-section template |
| `docs/legal/priest-contract-template-q1-spec.md` | Earlier Q1 spec (pre-revenue-share lock) |
| `docs/legal/R-Q2-L-002-schedule-a-revenue-share.md` | NEW: Per-puja-type commission matrix (Schedule A referenced by template §2.4) |
| `docs/legal/R-Q2-L-002-onboarding-tracker-spec.md` | NEW: Admin panel + DB schema for tracking signed/pending pandits |
| `docs/specs/marketplace-v2-dispute-resolution-spec.md` | Cited in template §5.2 |

## Founder-required actions (cannot be agent-completed)

1. **Lawyer review of contract template v1** — `docs/legal/priest-contract-template-100-pandits.md`. Counsel must sign off before mass-distribution. Recommend Indian counsel familiar with Section 8 Foundation contracting + IT Act 2000 e-signature validity.
2. **DocuSign / NotaryLive account setup** — paid tier required for bulk sends (≥100 envelopes/mo). Approx ₹3,000–₹5,000/mo for India region.
3. **Recruit 100 pandits** — outreach via temple networks, WhatsApp pandit groups, existing Bhaktisetu temple partners. No agent can identify or call real pandits; founder must vet trust signals.
4. **Send contracts via DocuSign** — bulk envelope send with prefilled name/PAN/address fields. Track via tracker spec below.
5. **Verify KYC artifacts** — Aadhaar (masked), PAN, bank account, 2 reference video proofs per template §5.1. Manual review by founder until volume justifies a KYC reviewer hire.
6. **Bengaluru jurisdiction stamping** — physical/digital stamp paper per Karnataka Stamp Act (₹500 typical for service agreements). Counsel to confirm exact value.

## Engineering-implementable items (already in place or carryable)

- [x] Standard contract template (already shipped)
- [x] Schedule A revenue-share matrix (this batch)
- [x] Onboarding tracker spec (this batch)
- [ ] Admin panel for contract status tracking (build out from spec — see `R-Q2-L-002-onboarding-tracker-spec.md`)
- [ ] `pandit_contracts` DB table per spec (defer to first Render deploy w/ schema)
- [ ] Webhook from DocuSign → `/api/v1/admin/contracts/webhook` to flip status on envelope completion
- [ ] Pandit-side `/priest/contract-status` page showing signed/pending state

## KPI tracking

`priest_contracts_signed` flips by counting `pandit_contracts` rows where `status='signed'` AND `void_at IS NULL`.

Until tracker DB ships, founder maintains CSV in `docs/legal/_internal-pandit-contracts-tracker.csv` (gitignored, NEVER commit — PII).

## Targets

- Month 4 (Apr 2026): 25 signed (Bengaluru + Tirupati anchor temples)
- Month 5 (May 2026): 60 signed (add Varanasi + Mathura cohorts)
- Month 6 (Jun 2026): **100 signed** = KPI flip

## Risk register

| Risk | Mitigation |
|---|---|
| Lawyer turnaround slow (>3 wk) | Pre-brief counsel w/ template + 3 specific concerns: revenue split tax treatment, no-show penalty enforceability, video-proof IP ownership. |
| Pandits refuse e-signature, demand wet ink | Offer hybrid — wet ink scan acceptable for first 25, then push DocuSign. |
| 70-30 split rejected by senior pandits | Schedule A has tiered split — senior pandits (>10y tenure) may earn 80%. |
| Pandit data leak risk via tracker spreadsheet | Tracker CSV gitignored; final tracker DB has row-level security. |

## References

- Indian Contract Act 1872 (foundational)
- IT Act 2000 §10A (e-signature validity in India)
- Karnataka Stamp Act 1957 (Schedule, Article 5 — agreements)
- Section 8 Companies Act 2013 (Foundation contracting limitations)

## Closes

R-Q2-L-002 — template + Schedule A + tracker spec shipped. **Status remains `in_progress`** until 100 signed contracts logged. Founder owns recruiting + sending + counter-signing.
