# Onboard 25 Verified Pandits in Lucknow (Uttar Pradesh)

> **Roadmap item**: R-Q3-S-005 (P0) · **Quarter**: Q3 · **Month target**: 9 · **Authored**: 2026-06-14

## Status: founder-action-required

This is supply-side recruitment. KPI (`verified_pandits_count_lucknow = 25`) requires the founder (or a Lucknow-based supply coordinator) to physically recruit + verify 25 humans in Lucknow. Agent ships the scaffold, onboarding pipeline, pricing matrix, and tracking doc. Status remains `in_progress` until founder closes via Supabase row count.

## Why Lucknow

| Lever | Detail |
|---|---|
| City profile | Capital of Uttar Pradesh; ~3.8M urban, ~5.2M metro |
| Devotional density | High — Hanuman Setu, Chandrika Devi, Mankameshwar, Aliganj Hanuman, ChhotaImambara catchment; ~1200 active Hindu temples in metro |
| Pandit availability | High — Sanskrit Sansthan Lucknow + traditional Brahmin households across Chowk, Aminabad, Hazratganj, Aliganj |
| Tourist + NRI flow | Medium — Awadhi diaspora in Gulf + US; growing inland tourism (heritage + Ramayana circuit gateway) |
| Strategic geo | Anchor for UP Ramayana circuit expansion (Ayodhya 130km, Naimisharanya 95km, Varanasi 320km, Allahabad 200km) |
| Existing competition | Low — Sri Mandir + Utsav weak in UP tier-1 outside Varanasi |

## Target mix (25 pandits)

| Specialization | Count | Lucknow hubs |
|---|---|---|
| Vedic puja + havan generalist | 7 | Chowk, Aliganj, Aminabad |
| Satyanarayan + Griha Pravesh | 4 | Gomti Nagar, Indira Nagar, Mahanagar |
| Wedding muhurat + ceremonies | 4 | Hazratganj, Mahanagar, Aliganj |
| Antim Sanskar / Shraadh / Pitra Paksh | 3 | Bhainsakund cremation ghat, Gulala Ghat |
| Navagraha + Shanti puja specialists | 3 | Hanuman Setu / Mankameshwar circuit |
| Devi puja (Durga / Lakshmi / Chandrika) | 2 | Chandrika Devi (Bakshi-ka-Talab), Aliganj |
| Rudrabhishek + Mahamrityunjaya | 2 | Mankameshwar (Daulatganj), Buddheshwar |

## KYC + verification checklist (per pandit)

- [ ] Aadhaar (front + back) — verified through Bhaktisetu portal (UIDAI OTP flow)
- [ ] PAN card — required for payouts > ₹50k/year (TDS §194-O compliance)
- [ ] Sanskrit Pathshala / Sansthan certificate OR traditional lineage (guru-shishya parampara — 2 references from senior pandits)
- [ ] Years of practice (min 5 years)
- [ ] In-person interview (founder OR Lucknow-based supply coordinator)
- [ ] 3 reference clients (existing patrons confirming work)
- [ ] Bank account + UPI for payouts
- [ ] Mobile + WhatsApp number (primary contact)
- [ ] 3-5 puja category specializations selected
- [ ] Profile photo (1080×1080) + intro video (60-90 sec, optional but strongly recommended for NRI bookings)
- [ ] Panchang / muhurta calendar awareness test (basic Q&A — tithi, vaar, nakshatra, lagna identification)

## Onboarding pipeline (founder workflow)

1. **Source** (Week 1-3): Founder visits Chowk, Aliganj, Aminabad pandit hubs. WhatsApp groups: target "Pandit Samaj Lucknow", "Brahmin Mahasabha UP", "Sanskrit Sansthan alumni". LinkedIn: Sanskrit Sansthan Lucknow + Sampurnanand Sanskrit University (Varanasi) alumni. Temple board endorsements: Hanuman Setu, Mankameshwar, Chandrika Devi.
2. **Pre-screen** (Week 2-4): 15-min phone call. Confirm willingness, pricing tier, weekly availability, language (Hindi + Awadhi + optional English).
3. **KYC submission** (Week 3-5): Pandit fills onboarding form at `/pandit/onboard` (web) or coordinator-assisted offline form. Uploads docs.
4. **Verification** (Week 4-6): Founder OR coordinator does in-person interview + reference checks at home/temple.
5. **Activation** (Week 5-7): Profile published on `/pandits?city=lucknow`. First test booking (founder-seeded or staff-seeded devotee). Payout flow validated end-to-end (UPI + bank).
6. **First-month review** (Week 7-8): Rating + repeat-rate check. Re-validate if any issues (refund, no-show, complaint).

## Pricing strategy (Lucknow tier)

Reference R-Q3-S-004 Jaipur (also tier-2 metro). Lucknow falls in tier-2 metro (vs Mumbai/Delhi tier-1, vs Ayodhya/Naimisharanya tier-3).

| Puja type | Domestic INR | NRI USD |
|---|---|---|
| Satyanarayan Katha | ₹2,500 | $40 |
| Griha Pravesh | ₹4,000 | $65 |
| Rudrabhishek | ₹3,500 | $55 |
| Wedding ceremony (per day) | ₹15,000 | $250 |
| Antim Sanskar | ₹5,500 | $90 |
| Shraadh / Pitra Paksh | ₹4,500 | $75 |
| Navagraha Shanti | ₹6,000 | $100 |
| Mahamrityunjaya 1.25 lakh jaap | ₹11,000 | $180 |
| Chandi Path (Durga Saptashati) | ₹7,500 | $125 |

Platform commission: 25% Lucknow tier (vs 20% tier-3, 30% tier-1). Pandit take-home = price × 0.75 after deduction.

## Engineering tickets (dependencies — verify before founder go-live)

- [x] `R-Q1-S-002a` Pandit onboarding pipeline (shipped — `/pandit/onboard`)
- [x] `R-Q1-S-002b` KYC + Aadhaar verification (shipped — gates payouts per business rule #4)
- [x] `R-Q1-S-002c` Booking workflow with video proof (shipped — mandatory per business rule #1)
- [x] `R-Q1-E` Payout system (shipped — gated on Aadhaar verified)
- [ ] City-filter on `/pandits?city=lucknow` listing — verify renders + returns ACTIVE rows
- [ ] Lucknow city page `/city/lucknow` includes pandit grid + booking CTAs (verify exists or scaffold)
- [ ] Per-pandit profile page hits 200 in prod
- [ ] WhatsApp notification on booking → pandit (verify env-or-noop, rate-limit by userId-or-IP, daily caps)

## Coordinator handoff (if founder hires local)

If founder hires a Lucknow-based supply coordinator (recommended for Q3 scale + Ramayana-circuit expansion synergy):

- Stipend: ₹15,000/month + ₹500 per onboarded + verified pandit (target 5/week)
- Owns: sourcing, pre-screening, in-person interview, doc collection
- Reports: weekly to founder via WhatsApp + Bhaktisetu admin dashboard
- Bonus opportunity: doubles as Ayodhya + Naimisharanya scout (next Q3/Q4 expansion items)

## Success metric (Q3 close — month 9)

- **25 pandits live + verified** (Supabase `Priest` table where `city='Lucknow'` AND `aadhaarVerified=true` AND `status='ACTIVE'`)
- **25+ Lucknow bookings completed Q3** (downstream KPI, separate roadmap item)
- **Average rating 4.5+/5**
- **Repeat-customer rate 25%+**
- **80%+ pandit retention** (post-onboarding 30-day churn check)
- **At least 3 NRI bookings via Lucknow pandits** (Awadhi diaspora signal)

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Chowk/Aliganj pandits hesitant on smartphone onboarding | Coordinator on-site digital handholding; print onboarding form in Hindi/Devanagari |
| Pricing pushback (some expect tier-1 Mumbai/Delhi rates) | Show 25% commission share + Lucknow cost-of-living math + transparent invoice |
| KYC slow (Aadhaar OTP issues for elderly) | Allow manual KYC fallback via coordinator visit; biometric reader (optional) |
| Founder bandwidth — 25 humans is heavy | Phase: 10 in Month 8, 15 in Month 9 |
| Trust on payout (new platform) | First payout within 48h of completed booking; testimonials from Mumbai/Delhi/Jaipur pandits already onboarded |
| Awadhi-language preference | Recruit at least 5 pandits fluent in Awadhi for local-devotee comfort; English skills useful for NRI segment |
| Ramayana / Ayodhya circuit gravity pull | Some pandits may prefer Ayodhya-only assignments — let them; cross-sell as Lucknow + Ayodhya bundle |

## Founder action items

1. Schedule 2-3 Lucknow visits (Chowk + Aliganj + Gomti Nagar + Hazratganj — cover walled-city + suburb mix)
2. Hire or contract a Lucknow supply coordinator (or assign existing intern; consider dual-mandate: Lucknow + Ayodhya scout)
3. Pre-book 5 partner temples (Hanuman Setu, Mankameshwar, Chandrika Devi, Aliganj Hanuman, Buddheshwar) — temple-board endorsements help recruit
4. Run first 5 onboardings end-to-end yourself before delegating
5. Track Supabase `Priest` table city='Lucknow' weekly via `/admin/supply?city=lucknow`
6. Cross-link with R-Q3-S-004 Jaipur learnings — copy what worked, fix what didn't

## Closes

- R-Q3-S-005 (this item)
- Enables R-Q3-G-XX geo expansion items for UP-tier (Ayodhya, Naimisharanya, Varanasi top-up)
- Enables 25+ Lucknow live bookings Q3 (downstream geo expansion)
- Supports NRI Awadhi diaspora segment (UK + Gulf + US)

## Sampradaya specifics — Awadh / North-Indian Smarta

- Predominantly Smarta + Vaishnava (Ramanandi) sampradaya; Saraswat Brahmin pockets
- Customs cadence: Karva Chauth + Ahoi Ashtami + Chhath (overlap with Bihar) + Devuthani Ekadashi peaks
- Ramayana literacy is exceptionally high (Tulsidas Awadhi Ramcharitmanas) — pandits often quote dohas in conversation; can be a selling point for diaspora bookings
- Hanuman bhakti density unusually high — Tuesday/Saturday booking spikes expected
- Antim sanskar at Bhainsakund + Gulala Ghat — established pandit network already exists; partnership angle more than recruitment
- Pitra Paksh window (Sep-Oct) drives spike in shraadh bookings — coordinate hiring before Aug to capture
