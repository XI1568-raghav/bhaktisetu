# Onboard 25 Verified Pandits in Delhi NCR (new city)

> **Roadmap item**: R-Q2-S-003 (P0) · **Quarter**: Q2 · **Month target**: 5 · **Authored**: 2026-06-15

## Status: founder-action-required

This is supply-side recruitment. KPI (`verified_pandits_count_delhi = 25`) requires the founder to physically recruit + verify 25 humans in Delhi NCR. Agent ships the scaffold, onboarding pipeline, scripts, and tracking doc. Status remains `in_progress` until founder closes via Supabase row count.

Delhi is the second-city north-India expansion after the Hindi-belt foothold. Together with Jaipur (R-Q3-S-004) and Hyderabad (prior spec), Delhi NCR forms the tier-1 north supply triangle. Win Delhi → unlock Gurgaon + Noida + Ghaziabad + Faridabad spillover demand without further sourcing cost.

## Why Delhi NCR

| Lever | Detail |
|---|---|
| City profile | National capital; ~20M urban + 32M NCR metro (Delhi+Gurgaon+Noida+Ghaziabad+Faridabad) |
| Devotional density | Very high — Akshardham, Birla Mandir / Lakshmi Narayan, Chhatarpur, Kalkaji, Jhandewalan, Sankat Mochan, Hanuman Mandir Connaught Place, Gauri Shankar Chandni Chowk |
| Pandit availability | Very high — Sanskrit Pathshalas (Sri Lal Bahadur Shastri Rashtriya Sanskrit Vidyapeetha, Delhi Sanskrit Academy), traditional Pandit families across Chandni Chowk, Karol Bagh, Lajpat Nagar, Mayur Vihar, Dwarka |
| Tourist + NRI flow | Very high — capital diplomatic+heritage + largest NRI return-flight gateway (IGI) |
| Existing competition | Medium — Sri Mandir + Utsav present but supply-thin; weak Hindi-belt verified pandit coverage |
| Founder lever | Hindi-native pandit availability + NRI booking gateway (US+UK+Gulf NRIs frequently book Delhi-origin pujas for parents in NCR) |

## Target mix (25 pandits)

| Specialization | Count | NCR hub clusters |
|---|---|---|
| Vedic puja + havan generalist | 7 | Chandni Chowk, Karol Bagh, Mayur Vihar |
| Satyanarayan + Griha Pravesh | 5 | Dwarka, Rohini, Indirapuram, Noida sectors |
| Wedding muhurat + ceremonies | 4 | South Ex, Greater Kailash, Vasant Kunj |
| Antim Sanskar / Shraadh / Pitra Paksh | 3 | Nigambodh Ghat, Punjabi Bagh, Yamuna ghat circuit |
| Navagraha + Shanti puja specialists | 3 | Chhatarpur / Kalkaji circuit |
| Devi puja (Durga / Lakshmi / Mahakali) | 2 | Jhandewalan, Kalkaji |
| Rudrabhishek + Mahamrityunjaya | 1 | Gauri Shankar Mandir circuit |

## KYC + verification checklist (per pandit)

- [ ] Aadhaar (front + back) — verified through Bhaktisetu portal
- [ ] PAN card — for payouts > ₹50k/year (TDS §194-O applicability)
- [ ] Sanskrit Pathshala certificate OR traditional lineage (guru-shishya parampara — 2 references) OR Pandit-Vyas family lineage proof
- [ ] Years of practice (min 5 years)
- [ ] In-person interview (founder OR Delhi-based coordinator)
- [ ] 3 reference clients (existing patrons confirming work)
- [ ] Bank account + UPI for payouts
- [ ] Mobile + WhatsApp number (primary contact)
- [ ] 3-5 puja category specializations selected
- [ ] Profile photo (1080×1080) + intro video (60-90 sec, optional but recommended)
- [ ] Hindi + Sanskrit proficiency confirmed (north-India market lingua franca)
- [ ] Aaditya / shubh-muhurta calendar awareness test (basic Q&A)
- [ ] DPDP §6 consent recorded (data processing for matching + payouts + reviews)

## Onboarding pipeline (founder workflow)

1. **Source** (Week 1-3): Founder visits NCR pandit hubs. WhatsApp groups: "Delhi Pandit Samaj", "Brahmin Mahasabha Delhi", "Sanskrit Acharya Group Delhi NCR". LinkedIn: Sanskrit Pathshala alumni (Sri Lal Bahadur Shastri Rashtriya Sanskrit Vidyapeetha, Delhi Sanskrit Academy, Lal Bahadur Shastri Kendriya Sanskrit Vidyapeetha). Temple-trust referrals at top 8 NCR temples.
2. **Pre-screen** (Week 2-4): 15-min phone call. Confirm Hindi+Sanskrit fluency, willingness, pricing tier, weekly availability.
3. **KYC submission** (Week 3-5): Pandit fills onboarding form at `/priest-onboarding` (web). Uploads docs.
4. **Verification** (Week 4-6): Founder OR coordinator does in-person interview + reference checks + Sanskrit-recitation gate.
5. **Activation** (Week 5-7): Profile published. First test booking (founder or seeded devotee). Payout flow validated.
6. **First-month review** (Week 7-8): Rating + repeat-rate check. Re-validate if any issues.

## Pricing strategy (Delhi NCR tier-1)

Reference R-Q1-S-002 / R-Q3-S-004. Delhi falls in tier-1 metro (alongside Mumbai/Bangalore, vs Jaipur/Hyderabad tier-2, vs tier-3 towns).

| Puja type | Domestic INR | NRI USD |
|---|---|---|
| Satyanarayan Katha | ₹3,500 | $55 |
| Griha Pravesh | ₹5,500 | $90 |
| Rudrabhishek | ₹4,500 | $75 |
| Wedding ceremony (per day) | ₹25,000 | $400 |
| Antim Sanskar | ₹8,000 | $130 |
| Navagraha Shanti | ₹8,500 | $140 |
| Mahamrityunjaya 1.25 lakh jaap | ₹15,000 | $250 |

Platform commission: 30% Delhi tier-1 (vs 25% tier-2 Jaipur/Hyderabad, 20% tier-3 small towns).

NRI USD rates honour business rule #2 (9-10× domestic floor); cross-check current INR↔USD rate during onboarding price-sheet sign-off.

## Engineering tickets (dependencies — verify before founder go-live)

- [x] `R-Q1-S-002a` Pandit onboarding pipeline (shipped — `/priest-onboarding`)
- [x] `R-Q1-S-002b` KYC + Aadhaar verification (shipped — gates payouts per business rule #4)
- [x] `R-Q1-S-002c` Booking workflow with video proof (shipped — mandatory per business rule #1)
- [x] `R-Q1-E` Payout system (shipped — gated on Aadhaar verified)
- [ ] City-filter on `/pandits?city=delhi` listing — verify renders ≥5 pandits before public marketing
- [ ] Delhi city page `/city/delhi` includes pandit grid + booking CTAs
- [ ] Per-pandit profile page hits 200 in prod for Delhi sample
- [ ] WhatsApp notification on booking → pandit (verify env or noop)
- [ ] DPDP §8(10) grievance officer surfaced for Delhi pandit grievances (state-list expansion)

## Coordinator handoff (if founder hires local)

If founder hires a Delhi-based supply coordinator (recommended given NCR size + Hindi-belt scale):

- Stipend: ₹18,000/month + ₹500 per onboarded + verified pandit (target 6/week)
- Owns: sourcing, pre-screening, in-person interview, doc collection, follow-up on 30-day retention
- Reports: weekly to founder via WhatsApp + Bhaktisetu admin dashboard
- Recommended profile: ex-pujari aide, temple-trust admin, OR Sanskrit pathshala recent graduate w/ ops chops

## Success metric (Q2 close)

- **25 pandits live + verified** (Supabase `Priest` table where `User.city ILIKE '%delhi%' OR ILIKE '%new delhi%'` AND `aadhaarVerified=true` AND `status='ACTIVE'`)
- **5+ active in `/priest/bookings` dashboard** (cross-link success criterion #5)
- **25+ Delhi bookings completed Q2** (downstream KPI, separate roadmap item R-Q2-G-003)
- **Average rating 4.5+/5**
- **Repeat-customer rate 25%+**
- **80%+ pandit retention** (post-onboarding 30-day churn check)

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Walled-City Chandni Chowk pandits hesitant on smartphone onboarding | Coordinator on-site digital handholding; print onboarding form in Hindi |
| Pricing pushback (top NCR pandits expect premium tier-1+) | Show 30% commission share, NRI USD pricing math, and live-booking inflow projection |
| KYC slow (Aadhaar OTP issues for elderly Acharyas) | Allow manual KYC fallback via coordinator visit + paper attestation; ALL fallbacks still flow through aadhaarVerified gate before payout |
| Founder bandwidth — 25 humans is heavy | Phase: 8 in Month 4, 10 in Month 5, 7 in Month 6 catch-up |
| Trust on payout (new platform, no Delhi peer reviews yet) | First payout within 48h of completed booking; loop in Mumbai/Bangalore pandit testimonials in onboarding deck |
| NCR sprawl (Noida + Gurgaon + Faridabad cover huge geography) | Cluster pandits by hub (Delhi proper + Noida + Gurgaon × 2 each) so coordinator visits fit a single-day route |
| Sampradaya mix (North-Indian Smarta + Punjabi + Marwari diaspora in Delhi all coexist) | Mix in onboarding: 18 Smarta + 4 Punjabi sampradaya + 3 Marwari — covers ≥85% NCR demand |

## Founder action items

1. Schedule 3-4 NCR visits across hubs (Chandni Chowk + Karol Bagh + Dwarka + Noida + Gurgaon)
2. Hire or contract a Delhi NCR supply coordinator (recommended — NCR sprawl is too big for solo)
3. Pre-book 5 partner temples (Akshardham trust outreach, Birla Mandir, Chhatarpur, Kalkaji, Jhandewalan) — endorsements drastically accelerate recruit
4. Run first 5 onboardings end-to-end yourself before delegating to coordinator
5. Track Supabase `Priest` × `User.city` weekly via `/admin/supply?city=delhi`
6. Confirm DPDP grievance officer + Delhi-state grievance redress is surfaced before first paid booking
7. Validate Hindi + Sanskrit recitation gate on all 25 (north-India market won't tolerate accent or pronunciation slips)
8. Coordinate with `R-Q2-G-003` (Delhi geo soft launch) — pandits required precondition for city activation

## Closes

- R-Q2-S-003 (this item) — moves from in_progress → shipped when Supabase count(Priest where city ILIKE '%delhi%' AND aadhaarVerified=true) ≥ 25
- Enables R-Q2-G-003 Delhi geo soft launch
- Enables north-India NCR-anchored NRI demand funnel (US+UK+Gulf parents-in-Delhi pattern)
- Together with R-Q3-S-004 (Jaipur) + Hyderabad prior spec, completes north-India supply triangle

## Sampradaya specifics — Delhi NCR

- North-Indian Smarta dominant; Punjabi sampradaya pockets in West Delhi (Rajouri Garden, Janakpuri); Marwari diaspora in Karol Bagh + Lajpat Nagar
- Custom cadence: Navratri (peak), Karva Chauth (Marwari + Punjabi peak), Holi, Diwali, Chhath (Bihari/Eastern UP migrants), Govardhan Puja, Bhai Dooj
- Yamuna ghat (Nigambodh) for Antim Sanskar + Shraadh circuit — premium specialist pandits live nearby
- Connaught Place Hanuman Mandir + Akshardham + Chhatarpur Mata = pilgrimage anchors for NRI returning-to-NCR demand
- NRI pricing skew: high — Delhi NCR is the #1 return-flight gateway, NRI parents-in-NCR demand drives 40%+ of US-INR bookings nationally

## Coordination with adjacent roadmap items

- **R-Q2-G-003** Delhi geo soft launch — blocked until ≥10 Delhi pandits live (otherwise launch lacks supply)
- **R-Q3-S-004** Jaipur — sequential, not parallel; use Delhi coordinator + learnings first
- **R-Q2-S-001 / R-Q1-S-002** Mumbai + Bangalore pandit base — copy testimonials + price card structure
- **R-Q2-CS-XXX** Hindi-language customer-support — required before scale (Hindi-belt expects Hindi support, NOT English-only)

---

## Verification at Q2 close

Run this Supabase query at Q2 close:

```sql
SELECT COUNT(*)
FROM "Priest" p
JOIN "User" u ON p.user_id = u.id
WHERE p.verified = true
  AND p.aadhaar_verified = true
  AND (u.city ILIKE '%delhi%' OR u.city ILIKE '%new delhi%' OR u.city ILIKE '%noida%' OR u.city ILIKE '%gurgaon%' OR u.city ILIKE '%gurugram%' OR u.city ILIKE '%ghaziabad%' OR u.city ILIKE '%faridabad%');
```

(Roadmap item's stricter KPI query uses Delhi/New Delhi only; this expanded version captures all of NCR for internal supply-tracking. Flip roadmap status to `shipped` only when the strict query ≥ 25.)
