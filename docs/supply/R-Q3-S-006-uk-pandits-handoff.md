# R-Q3-S-006 — UK Pandit Onboarding Handoff (London + Birmingham + Leicester)

> **Status**: scaffold + outreach pipeline shipped; KPI (15 verified UK pandits) requires founder action.
> **Why this is a handoff, not a "shipped"**: per R2 PR #71 doctrine and global rule "DO NOT auto-claim status=shipped on items where KPI requires founder action", this PR ships infrastructure + outreach templates + a documented pipeline. The KPI metric `verified_pandits_count_uk = 15` cannot flip without (a) live UK Stripe GBP rail (founder-blocker U2), (b) human KYC review of each applicant, (c) GST/India-UK tax decisions on commission flow.

## What this PR ships

1. `scripts/agents/outreach-uk-pandits.mjs` — deterministic outreach template generator. Founder runs it to print 30 personalised first-touch messages for cold outreach to UK Hindu Council members + ISKCON UK chapters + BAPS Neasden affiliates + Leicester/Birmingham temple networks. Env-or-noop on missing recipient list — emits to `docs/agent-reports/uk-pandit-outreach/`.
2. This handoff doc (`docs/supply/R-Q3-S-006-uk-pandits-handoff.md`) with the full onboarding pipeline + founder action checklist.
3. Roadmap item `status` stays `in_progress` until founder reports KPI flip via PostHog or supabase query.

## Pipeline (per agent_brief)

```
[Cold outreach UK] → [Lead in admin-leads source='uk_pandit_outreach']
        ↓
[KYC: UK passport + UK address proof + Hindu Council / ISKCON / BAPS membership letter]
        ↓
[Stripe GBP onboarding — BLOCKED on founder-blocker U2 Stripe NRI KYC]
        ↓
[3 puja SKUs live in GBP (NRI 9-10× domestic — e.g. ₹500 puja → £45-50)]
        ↓
[First paid booking — cycle time p50 ≤ 14 days target]
```

## Source pools (public-domain institutional contacts — verify before founder use)

| Pool | Contact strategy | Notes |
|---|---|---|
| **Hindu Council UK** | Public website contact form / institutional email at hinducounciluk.org | Founder must request introductions; do NOT scrape personal emails |
| **ISKCON UK chapters** | Per-temple contact via iskcon.org.uk — London (Soho/Bhaktivedanta Manor), Birmingham, Leicester all have listed temple coordinators | Public temple coordinator emails OK |
| **BAPS Neasden Temple (London)** | Public contact via baps.org/Global-Network/Europe/London.aspx | Largest Hindu temple outside India; high-trust referral source |
| **Leicester Hindu Mandirs** | Shree Sanatan Mandir + Shree Jalaram Mandir + Shri Vishwakarma Mandir — public temple contacts | Leicester has ~70k Hindus, highest UK density per capita |
| **Birmingham temple network** | Shri Venkateswara (Balaji) Temple + Geeta Bhawan + Sri Lakshmi Narayan — public contacts | |
| **NHSF (National Hindu Students' Forum) UK alumni** | Public via nhsf.org.uk | For younger / digital-native pandits |

> [VERIFY-FOUNDER] Founder must NOT use any individual pandit names, emails, or phone numbers harvested from training data. All first contact via institutional channels, then institutional referral chain.

## KYC requirements (UK)

| Document | Why |
|---|---|
| UK passport OR Biometric Residence Permit | Identity |
| UK proof of address (council tax / utility bill ≤ 3 months) | UK residency for Stripe Connect onboarding |
| Hindu Council UK membership letter OR ISKCON/BAPS temple affiliation letter | Devotional credential — UK has no "Aadhaar equivalent" so institutional vouching replaces it |
| UK National Insurance number | Required for Stripe Connect UK + HMRC tax reporting |
| (Optional but preferred) Public live-puja YouTube/Insta proof | Lowers founder trust verification cost |

## Pricing reminder (business rule #2)

| Service tier | INR base | GBP NRI (9-10×) |
|---|---|---|
| Standard puja | ₹500 | £45-50 |
| Premium puja (Rudrabhishek tier) | ₹2,100 | £190-210 |
| Wedding muhurat / consult | ₹3,000 | £270-300 |
| Antim sanskar (full rites) | ₹15,000 | £1,350-1,500 |

> Founder MUST confirm GBP pricing with each onboarded pandit before publishing SKU. Some UK pandits may demand higher rates than 10× INR baseline due to UK cost of living — negotiate per-pandit. Document accepted rate in `Priest.pricingNotes` field.

## Commission + tax considerations

- **Platform commission**: 30% of gross (per business rule #3, mid-range of 20-40%). Founder to confirm with pandits at onboarding.
- **VAT (UK)**: If platform crosses £85k UK turnover, VAT registration required. Currently below threshold — flag for review at £60k UK turnover trigger.
- **India-UK DTAA**: Pandit is UK tax resident → UK income tax on earnings. Bhaktisetu does NOT withhold UK tax (pandit's own filing). Add clause to UK pandit T&C.
- **TDS §194-O**: Does NOT apply (pandit is NOT India tax resident). Confirm with CA before first payout.
- **DPDP §6**: UK pandit data falls under UK GDPR, not Indian DPDP — separate consent flow needed at signup. Founder to add UK-specific privacy notice variant.

## Onboarding email drip (deterministic template — agent will generate)

1. **D+0**: First-touch institutional intro request (sent to Hindu Council / ISKCON / BAPS, NOT individual)
2. **D+3**: If institutional intro received, founder personally emails the introduced pandit with platform overview + 3 case studies (India pandits earning £X/mo equivalent)
3. **D+7**: KYC request email with checklist + Stripe Connect onboarding link [BLOCKED until U2]
4. **D+14**: Welcome + SKU setup call (45 min Jitsi with founder)
5. **D+21**: First booking promotion — featured placement on `/uk` landing page
6. **D+30**: Cycle review — was first paid booking received? If no, founder personal call.

## Founder action checklist

- [ ] **U2 Stripe NRI KYC** — submit business docs for UK Stripe activation (BLOCKS this entire item)
- [ ] Verify institutional channel addresses for Hindu Council UK + ISKCON UK + BAPS Neasden + 3 Leicester mandirs + 3 Birmingham mandirs
- [ ] Run `node scripts/agents/outreach-uk-pandits.mjs` weekly and review generated outreach drafts before sending
- [ ] Decide per-pandit GBP pricing (negotiate; do NOT auto-set 10× INR)
- [ ] Add UK-specific privacy notice variant for DPDP/UK GDPR split
- [ ] CA review of TDS §194-O non-applicability for UK pandits
- [ ] Wait for R-Q2-G-006 (US NRI) to ship; clone pattern for UK NRI landing page (separate roadmap item)
- [ ] Run `SELECT COUNT(*) FROM priests p JOIN users u ON p.user_id = u.id WHERE p.aadhaar_verified = true AND p.kyc_status = 'approved' AND u.location_country = 'UK' AND u.location_city IN ('London','Birmingham','Leicester');` weekly — KPI flips at 15
- [ ] When 15 reached, manually flip `status: shipped` + add `shipped_at` to `006-onboard-15-uk-based-verified-pandits-london-birmin.md`

## Why this blocks R-Q3-G-001 (UK soft launch)

Per spec `blocks: ["R-Q3-G-001"]` — UK NRI city launch cannot ship without 15+ verified local pandits, otherwise the NRI landing page promises a marketplace with no supply. R2 retro flagged similar pattern on Singapore launch (shipped landing, no supply, 0 bookings, owner lost trust).

## Open questions for founder

1. **Aadhaar gating** — current business rule #4 requires `aadhaarVerified=true` for payout. UK pandits won't have Aadhaar. Either (a) add `ukKycVerified` boolean field with parallel gate, OR (b) relax payout gate to "any approved KYC". Recommend (a) — preserves audit trail per nationality.
2. **GST on commission** — UK pandit commission paid to Bhaktisetu India entity. Is this an export of service (zero-rated GST) or domestic supply? Needs CA opinion.
3. **Conversion currency for accounting** — Stripe pays GBP → Bhaktisetu UK Connect account → wire to India. Forex risk between booking time and payout time. Recommend 7-day rolling FX hedge via Wise/Revolut at scale.

---

*This handoff doc is the deliverable. No code change required until founder unblocks U2 Stripe NRI KYC.*
