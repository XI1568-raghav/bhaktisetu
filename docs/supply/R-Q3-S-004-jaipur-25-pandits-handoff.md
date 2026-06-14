# Onboard 25 Verified Pandits in Jaipur (Rajasthan)

> **Roadmap item**: R-Q3-S-004 (P0) · **Quarter**: Q3 · **Month target**: 8 · **Authored**: 2026-06-14

## Status: founder-action-required

This is supply-side recruitment. KPI (`verified_pandits_count_jaipur = 25`) requires the founder to physically recruit + verify 25 humans in Jaipur. Agent ships the scaffold, onboarding pipeline, scripts, and tracking doc. Status remains `in_progress` until founder closes via Supabase row count.

## Why Jaipur

| Lever | Detail |
|---|---|
| City profile | Pink City, ~4M urban + 7M metro; Rajasthan capital |
| Devotional density | High — Govind Dev Ji, Birla Mandir, Galta Ji, Moti Dungri Ganesh, ~1500 active temples in metro |
| Pandit availability | High — Sanskrit Pathshalas + traditional Brahmin families across Walled City (Chaura Rasta, Tripolia Bazar, Chandpole, Brahmpuri) |
| Tourist + NRI flow | High — heritage tourism + Rajasthani NRI diaspora (US/UK/Gulf) |
| Existing competition | Low platform penetration — Sri Mandir + Utsav weak in Rajasthan tier-1 |

## Target mix (25 pandits)

| Specialization | Count | Walled City / suburb hubs |
|---|---|---|
| Vedic puja + havan generalist | 8 | Chaura Rasta, Brahmpuri |
| Satyanarayan + Griha Pravesh | 4 | Malviya Nagar, Mansarovar |
| Wedding muhurat + ceremonies | 4 | Tripolia, Chandpole |
| Antim Sanskar / Shraadh / Pitra Paksh | 3 | Galta Ji, Brahmpuri |
| Navagraha + Shanti puja specialists | 3 | Moti Dungri / Birla Mandir circuit |
| Devi puja (Durga / Lakshmi) | 2 | Amer / Galta Ji |
| Rudrabhishek + Mahamrityunjaya | 1 | Eklingji circuit (Galta Ji) |

## KYC + verification checklist (per pandit)

- [ ] Aadhaar (front + back) — verified through Bhaktisetu portal
- [ ] PAN card — for payouts > ₹50k/year
- [ ] Sanskrit Pathshala certificate OR traditional lineage (guru-shishya parampara — 2 references)
- [ ] Years of practice (min 5 years)
- [ ] In-person interview (founder OR Jaipur-based coordinator)
- [ ] 3 reference clients (existing patrons confirming work)
- [ ] Bank account + UPI for payouts
- [ ] Mobile + WhatsApp number (primary contact)
- [ ] 3-5 puja category specializations selected
- [ ] Profile photo (1080×1080) + intro video (60-90 sec, optional but recommended)
- [ ] Aaditya / shubh-muhurta calendar awareness test (basic Q&A)

## Onboarding pipeline (founder workflow)

1. **Source** (Week 1-3): Founder visits Walled City pandit hubs. WhatsApp groups: "Pandit Samaj Jaipur", "Brahmin Mahasabha Rajasthan". LinkedIn: Sanskrit Pathshala alumni (RSV University, Jagadguru Ramanandacharya).
2. **Pre-screen** (Week 2-4): 15-min phone call. Confirm willingness, pricing tier, weekly availability.
3. **KYC submission** (Week 3-5): Pandit fills onboarding form at `/pandit/onboard` (web). Uploads docs.
4. **Verification** (Week 4-6): Founder OR coordinator does in-person interview + reference checks.
5. **Activation** (Week 5-7): Profile published. First test booking (founder or seeded devotee). Payout flow validated.
6. **First-month review** (Week 7-8): Rating + repeat-rate check. Re-validate if any issues.

## Pricing strategy (Jaipur tier)

Reference R-Q2-S-001 / R-Q1-S-002 — Jaipur falls in tier-2 metro (vs Mumbai/Delhi tier-1, vs tier-3 towns).

| Puja type | Domestic INR | NRI USD |
|---|---|---|
| Satyanarayan Katha | ₹2,500 | $40 |
| Griha Pravesh | ₹4,000 | $65 |
| Rudrabhishek | ₹3,500 | $55 |
| Wedding ceremony (per day) | ₹15,000 | $250 |
| Antim Sanskar | ₹5,500 | $90 |
| Navagraha Shanti | ₹6,000 | $100 |
| Mahamrityunjaya 1.25 lakh jaap | ₹11,000 | $180 |

Platform commission: 25% Jaipur tier (vs 20% tier-3, 30% tier-1).

## Engineering tickets (dependencies — verify before founder go-live)

- [x] `R-Q1-S-002a` Pandit onboarding pipeline (shipped — `/pandit/onboard`)
- [x] `R-Q1-S-002b` KYC + Aadhaar verification (shipped — gates payouts per business rule #4)
- [x] `R-Q1-S-002c` Booking workflow with video proof (shipped — mandatory per business rule #1)
- [x] `R-Q1-E` Payout system (shipped — gated on Aadhaar verified)
- [ ] City-filter on `/pandits?city=jaipur` listing — verify renders
- [ ] Jaipur city page `/city/jaipur` includes pandit grid + booking CTAs
- [ ] Per-pandit profile page hits 200 in prod
- [ ] WhatsApp notification on booking → pandit (verify env or noop)

## Coordinator handoff (if founder hires local)

If founder hires a Jaipur-based supply coordinator (recommended for Q3 scale):

- Stipend: ₹15,000/month + ₹500 per onboarded + verified pandit (target 5/week)
- Owns: sourcing, pre-screening, in-person interview, doc collection
- Reports: weekly to founder via WhatsApp + Bhaktisetu admin dashboard

## Success metric (Q3 close)

- **25 pandits live + verified** (Supabase `Priest` table where `city='Jaipur'` AND `aadhaarVerified=true` AND `status='ACTIVE'`)
- **25+ Jaipur bookings completed Q3** (downstream KPI, separate roadmap item)
- **Average rating 4.5+/5**
- **Repeat-customer rate 25%+**
- **80%+ pandit retention** (post-onboarding 30-day churn check)

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Walled City pandits hesitant on smartphone onboarding | Coordinator on-site digital handholding; print onboarding form in Hindi |
| Pricing pushback (some expect higher tier-1 rates) | Show 25% commission share + Jaipur cost-of-living math |
| KYC slow (Aadhaar OTP issues for elderly) | Allow manual KYC fallback via coordinator visit |
| Founder bandwidth — 25 humans is heavy | Phase: 10 in Month 7, 15 in Month 8 |
| Trust on payout (new platform) | First payout within 48h of completed booking; testimonials from Mumbai/Delhi pandits |

## Founder action items

1. Schedule 2-3 Jaipur visits (Walled City + Mansarovar + Brahmpuri suburbs)
2. Hire or contract a Jaipur supply coordinator (or assign existing intern)
3. Pre-book 5 partner temples (Govind Dev Ji, Birla, Moti Dungri, Galta Ji, Khole Ke Hanuman) — endorsements help recruit
4. Run first 5 onboardings end-to-end yourself before delegating
5. Track Supabase `Priest` table city='Jaipur' weekly via `/admin/supply?city=jaipur`

## Closes

- R-Q3-S-004 (this item)
- Enables R-Q3-S-005 (city × pandit matrix expansion if Jaipur succeeds)
- Enables 25+ Jaipur live bookings Q3 (downstream R-Q3-G-XX geo expansion items)

## Sampradaya specifics — Rajasthan / Marwari

- Marwari/Pushkarna/Shrimali Brahmin sampradaya (distinct from generic North-Indian Smarta)
- Customs cadence: Karwa Chauth + Teej + Gangaur peaks
- Mehndipur Balaji shanti circuit for graha-shanti referrals (90km from Jaipur, well-known Hanuman temple)
- Pricing skew: Marwari weddings + birthdays drive higher per-puja Rs vs other cities
