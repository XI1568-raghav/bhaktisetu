# Incorporate vs Sole-Prop Decision — Bhaktisetu

> **Roadmap item**: R-Q1-F-001 (P0, founder decision #1) · **Authored**: 2026-06-12 · **Reviewer**: founder + CA + counsel · **Status of decision**: Section 8 Foundation appears chosen per existing artifacts (80G + CSR-1 references throughout); this doc EXISTS to formalize the decision rationale + surface conversion-trigger points.

## Quick answer

**Recommend: KEEP current Section 8 Foundation structure.** It already exists, holds 80G + CSR-1, anchors all customer-facing trust copy. Conversion to any other structure now would unwind: (a) all 80G receipts already issued, (b) CSR partnerships in pipeline (R-Q4-M-007), (c) donor trust built since launch.

The decision now is NOT "which structure" but "**under what conditions would we add a second commercial entity alongside the Foundation**".

## Why this doc still matters

Even though Foundation seems chosen, several legal-tax mechanics need explicit founder-side answer:

1. Some Bhaktisetu revenue is NOT donation (e.g. wedding-planner-v1 commercial bookings, B2B SaaS via R-Q4-P-006). Section 8 Foundation can earn limited commercial income (per Section 11(4A) IT Act) but >20% commercial of total income triggers tax-exemption-loss risk.
2. CSR-1 + 80G both have annual renewal/compliance requirements that demand discipline.
3. Founder-personal liability vs Foundation-liability shielding — different for different revenue lines.
4. Conversion option exists later (Foundation parent + Pvt Ltd subsidiary for commercial lines).

## Decision matrix — 4 entity options

| Structure | Tax treatment | 80G eligible | CSR-1 eligible | Donor confidence | Commercial revenue limit | Personal liability | Conversion path |
|---|---|---|---|---|---|---|---|
| **Section 8 Foundation (current)** | Tax-exempt under Section 11 (if income deployed for charitable purpose) | YES (current cert) | YES (current reg) | HIGHEST — board-governed, audited, donor-visible | Limited (>20% commercial of total = exemption risk) | Founder shielded as Director (corporate veil) | Stays. Add subsidiary Pvt Ltd for purely commercial lines if scale demands |
| **Sole Proprietorship (no entity)** | Personal income tax (5-30% slab) | NO | NO | LOWEST (founder = entity, no trust separation) | Unlimited | Personal — full unlimited liability for everything | Migrate to Pvt Ltd later (paperwork-heavy) |
| **LLP (Limited Liability Partnership)** | 30% flat on profits | NO | NO | LOW (commercial entity) | Unlimited (commercial) | Limited to LLP capital | Migrate to Pvt Ltd OR maintain alongside |
| **Pvt Ltd (Private Limited Company)** | 22% corporate tax (post Section 115BAA) | NO | NO | LOW (commercial entity) | Unlimited (commercial) | Limited to share capital | Bhaktisetu Pvt Ltd as commercial subsidiary OF Foundation (preferred future state) |

## Why Foundation already exists + why it's right

Bhaktisetu sells primarily devotional / spiritual / charitable services. Donors expect:
- **80G receipt** for tax deduction
- **Foundation auditor signoff** on impact PDFs
- **CSR-1 eligibility** for corporate partnerships (R-Q4-M-007)
- **Non-profit framing** for community + temple trust

Any commercial entity (Pvt Ltd / LLP) loses ALL of those. Even if Pvt Ltd has lower nominal tax (22% vs Foundation's 0% if all income deployed), the donor-trust LOSS far exceeds the tax-rate gain.

Cross-references in existing repo confirming Foundation as ground truth:
- `docs/marketing/csr-match-campaign.md` §7 cites "Bhaktisetu Foundation 80G certificate valid through 2028"
- `docs/marketing/csr-match-campaign-v1.md` §A cites "Bhaktisetu Foundation holds active 80G + CSR-1"
- `docs/specs/adopt-a-temple-v1.md` references Foundation's 80G monthly receipt issuance
- `docs/specs/b2b-whitelabel-v1.md` §1.2 names "Bhaktisetu Foundation" as Section 8 entity

## Commercial-income limit — concrete math

Section 11(4A) IT Act: charitable trust/Foundation income from business is exempt only if the business is **incidental to the attainment of objects of the trust** AND separate books are maintained.

CBDT guidance: "incidental" ~= <20% of total income from commercial sources. Above 20% = scrutiny + potential exemption loss.

Bhaktisetu revenue lanes split (per `docs/finance/mrr-tracking-cadence-v1.md`):

| Lane | Q2 target | Charitable / commercial? |
|---|---|---|
| L1 Puja bookings | ₹1.5L MRR | CHARITABLE (donations + service for devotional purpose; 80G eligible per puja booking) |
| L2 Adopt-a-Temple sub | ₹1.2L MRR | CHARITABLE (recurring donation w/ 80G) |
| L3 CSR donation match | ₹1L MRR | CHARITABLE (CSR is explicitly charitable) |
| L4 B2B white-label SaaS | ₹80K MRR | **COMMERCIAL** (B2B SaaS fee = service revenue, not donation) |
| L5 Affiliate | ₹50K MRR | **COMMERCIAL** (referral commission) |

Commercial: ₹1.3L. Charitable: ₹3.7L. **Commercial = 26% of total**. **EXCEEDS the 20% incidental threshold.**

Decision implication: when L4 + L5 ramp past ₹1L MRR combined, Foundation needs to either (a) restructure commercial lines into a subsidiary Pvt Ltd, OR (b) document those lines as "incidental + supporting Foundation mission" rigorously w/ counsel signoff.

## Recommended decision (founder rubber-stamp)

```
DECISION (founder, dated YYYY-MM-DD):

1. KEEP Section 8 Foundation as primary entity. All current revenue flows
   through Foundation. 80G + CSR-1 maintained.

2. CONVERSION TRIGGER: when commercial revenue (L4 B2B SaaS + L5 Affiliate
   + any future non-donation lines) exceeds 20% of total MRR for 2
   consecutive months, founder + CA + counsel meet within 30 days to scope
   a subsidiary Pvt Ltd ("Bhaktisetu Tech Pvt Ltd" or similar).

3. THE SUBSIDIARY (if created) will:
   - Have Foundation as majority shareholder (51%+) so dividends flow back
     to Foundation = re-deployed for charitable purpose
   - Hold ONLY commercial revenue lines (L4 + L5)
   - File separate accounts + GST + corporate tax (22%)
   - Royalty agreement w/ Foundation for use of "Bhaktisetu" mark
     (transfer pricing per CBDT arm's length)
   - Founder remains Director of both entities

4. CURRENT FOUNDER COMPENSATION: structured as Foundation stipend (subject
   to Foundation board approval) + reasonable expense reimbursement. No
   profit distribution from Foundation (charitable rule).

5. CONVERSION COST estimate: ₹50K-1L one-time legal + accounting + MCA
   filing fees. Founder reviews actuals when triggered.
```

## Compliance calendar (Foundation — already-in-effect)

| When | What | Effort |
|---|---|---|
| Quarterly | GST filing (if turnover crosses ₹20L FY threshold) | 2h CA, ₹5K |
| Annually (by Sep 30) | Income tax filing (ITR-7 for Section 8) | 8h CA, ₹15K |
| Annually | Foundation board AGM + audited financials | 6h founder + 8h CA, ₹25K audit fee |
| Annually | 80G renewal verification (current cert valid through 2028) | 1h founder check |
| Annually | CSR-1 renewal (5-year cert) | 1h founder check |
| Per CSR donation received | CSR-2 filing within 30 days | 30min CA per filing |
| Per donation > ₹2L from single donor | Form 10BD reporting | 30min CA per filing |
| Continuously | Maintain books of accounts, donor receipts, donor list | Ongoing CA support |

**Total annual CA + audit cost estimate**: ₹50K-80K. Confirm w/ Foundation's existing CA.

## Open questions for founder

1. **Foundation CIN + 80G cert # + CSR-1 reg # documentation**: are these centrally listed somewhere? Need single source of truth at `docs/legal/foundation-registration-numbers.md` so every outreach doc (CSR campaign, LOI templates) references SAME numbers.
2. **Foundation board composition**: how many directors? Are minimum-2 directors required for Section 8 maintained? Independent director needed for governance?
3. **FCRA registration**: if NRI USD donations are intended as tax-deductible-in-India donations, FCRA registration required for >₹1L/year foreign donations. Worth applying now (lead time ~6-12 months).
4. **Founder personal income from Foundation**: stipend rate? Documented? Board-approved minutes?
5. **Asset ownership**: who owns "darshya.online" domain + Bhaktisetu trademark? Foundation should own both. Verify domain registration is in Foundation name, not founder personal.
6. **Bank account**: Foundation operates Indian bank account; what bank? Foreign donation account separate per FCRA rules if FCRA approved?

## Founder action

```markdown
- [ ] Sign off recommended decision text above (write date + initial inline)
- [ ] Create docs/legal/foundation-registration-numbers.md w/ CIN + 80G # + CSR-1 # + audit firm name + bank details (founder-only repo OR private repo if security concern)
- [ ] Confirm w/ existing Foundation CA: annual compliance cost estimate accuracy + add to docs/finance/opex-budget-v1.md
- [ ] Set quarterly calendar reminder: track L4 + L5 commercial revenue %; trigger conversion-discussion when 2 consecutive months >20%
- [ ] Apply FCRA if NRI USD donations strategy depends on India-tax-deductibility for US donors (separate workstream — 6-12 month lead)
- [ ] Update R-Q1-F-001 roadmap item handoff w/ decision date + Open Qs progress
```

## Out of scope (this doc)

- GST registration / threshold tracking (separate ticket if turnover approaches ₹20L)
- FCRA application detail (separate ticket once strategic NRI deduction need confirmed)
- Trademark registration ("Bhaktisetu" mark protection — separate ticket)
- Domain ownership transfer paperwork (founder confirms via registrar)
- Board minutes templates (separate ticket once board structure formalized)
- Foreign subsidiary structure (US/UK Foundation arm for diaspora donor tax-deductibility — far-future v2+)

## Closes

R-Q1-F-001 — decision doc + recommendation. Status flips to `shipped` when founder signs decision text + creates registration-numbers doc.
