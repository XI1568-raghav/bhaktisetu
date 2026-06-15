# Onboard 25 Verified Pandits in Indore + Bhopal + Nagpur (Central India Trio)

> **Roadmap item**: R-Q4-S-001 (P0) · **Quarter**: Q4 · **Month target**: 10 · **Authored**: 2026-06-15

## Status: founder-action-required

This is supply-side recruitment across three central-India tier-2 cities. KPI (`verified_pandits_count_central = 25`) requires the founder (or local coordinator) to physically recruit + verify 25 humans across Indore, Bhopal, and Nagpur. Agent ships the scaffold, onboarding pipeline, target mix, sampradaya brief, and tracking doc. Status remains `in_progress` until founder closes via Supabase row count.

## Why this trio

Bundled because the three cities share geography (central India belt), share Marathi-Hindi bilingual demographic spillover, and let a founder cover the corridor in a single 7-10 day trip via Indore→Bhopal→Nagpur train/road circuit.

| City | State | Urban pop | Devotional anchors | Pandit availability |
|---|---|---|---|---|
| Indore | MP | ~3.5M | Khajrana Ganesh, Annapurna Mandir, Bijasan Mata, Bada Ganpati | High — Maheshwari + Brahmin sampradaya, Sanskrit Pathshalas active |
| Bhopal | MP | ~2.5M | Birla Mandir, Gufa Mandir, Bhojeshwar (Bhojpur, 30km), Lakshminarayan | Medium-high — mix of MP traditional + Marathi influence |
| Nagpur | MH | ~3M | Deekshabhoomi, Tekdi Ganesh, Ramtek (50km), Swaminarayan | High — Vidarbha Marathi Brahmin + Maharashtrian sampradaya |

| Trio-wide lever | Detail |
|---|---|
| Existing competition | Low — Sri Mandir + Utsav weak in MP + Vidarbha tier-2 |
| NRI flow | Medium — Marathi NRI diaspora (US/Gulf) routes Nagpur supply for gift-puja USD demand |
| Wedding density | High — central India wedding-season Nov-Feb peak, big Marwari + Maheshwari weddings in Indore |
| Tourist seasonality | Ujjain Kumbh adjacency (Indore is gateway, 55km from Ujjain Mahakaleshwar) |

## Target mix (25 pandits across trio)

Phased 10 + 8 + 7 across Indore + Bhopal + Nagpur respectively. Tilts heavier on Indore because of NRI gift-puja demand + Ujjain feeder corridor.

### Indore (10 pandits)

| Specialization | Count | Hub neighborhoods |
|---|---|---|
| Vedic puja + havan generalist | 4 | Rajwada, Sarafa, Khajrana |
| Satyanarayan + Griha Pravesh | 2 | Vijay Nagar, Annapurna Road |
| Wedding muhurat + ceremonies | 2 | Geeta Bhawan, Palasia |
| Navagraha + Mahamrityunjaya specialists | 1 | Khajrana / Bijasan circuit |
| Antim Sanskar / Pitra Paksh | 1 | Ranjit Hanuman / Krishnapura |

### Bhopal (8 pandits)

| Specialization | Count | Hub neighborhoods |
|---|---|---|
| Vedic puja + havan generalist | 3 | Old City (Chowk, Itwara), Arera Colony |
| Satyanarayan + Griha Pravesh | 2 | MP Nagar, Shahpura |
| Wedding muhurat + ceremonies | 1 | New Market |
| Devi puja (Durga / Lakshmi) | 1 | Birla Mandir circuit |
| Antim Sanskar | 1 | Hamidia / Lakshminarayan |

### Nagpur (7 pandits)

| Specialization | Count | Hub neighborhoods |
|---|---|---|
| Vedic puja + havan generalist (Marathi sampradaya) | 3 | Mahal, Itwari, Dhantoli |
| Wedding muhurat + ceremonies | 2 | Civil Lines, Ramdaspeth |
| Ganpati festival specialists (Vidarbha tradition) | 1 | Tekdi Ganesh circuit |
| Devi puja (Mahalakshmi / Renuka) | 1 | Mahalaxmi Jagdamba / Ramtek feeder |

## KYC + verification checklist (per pandit)

Reuses canonical Bhaktisetu pandit KYC. No deviation from prior city specs.

- [ ] Aadhaar (front + back) — verified through Bhaktisetu portal
- [ ] PAN card — for payouts > ₹50k/year
- [ ] Sanskrit Pathshala certificate OR traditional lineage (guru-shishya parampara — 2 references)
- [ ] Years of practice (min 5 years)
- [ ] In-person interview (founder OR city-based coordinator)
- [ ] 3 reference clients (existing patrons confirming work)
- [ ] Bank account + UPI for payouts
- [ ] Mobile + WhatsApp number (primary contact)
- [ ] 3-5 puja category specializations selected
- [ ] Profile photo (1080×1080) + intro video (60-90 sec, optional but recommended)
- [ ] Shubh-muhurta calendar awareness test (basic Q&A — Marathi/Hindi acceptable)

## Onboarding pipeline (founder workflow)

1. **Source** (Week 1-3): Founder makes a single corridor trip Indore→Bhopal→Nagpur (7-10 days). Local pandit-association contacts; WhatsApp groups: "Pandit Samaj Indore", "Bhopal Brahmin Samaj", "Vidarbha Brahmin Sangh Nagpur". LinkedIn: Sanskrit Pathshala alumni (RSV Bhopal, Kavi Kulguru Kalidas Sanskrit University Ramtek).
2. **Pre-screen** (Week 2-4): 15-min phone call. Confirm willingness, pricing tier, weekly availability.
3. **KYC submission** (Week 3-5): Pandit fills onboarding form at `/pandit/onboard` (web). Uploads docs.
4. **Verification** (Week 4-6): Founder OR per-city coordinator does in-person interview + reference checks.
5. **Activation** (Week 5-7): Profile published. First test booking (founder or seeded devotee). Payout flow validated.
6. **First-month review** (Week 7-8): Rating + repeat-rate check. Re-validate if any issues.

## Pricing strategy (central India tier-2)

Indore, Bhopal, Nagpur all sit in tier-2 metro band. Slightly below Jaipur (which has higher heritage-tourism uplift) and well below Mumbai/Delhi tier-1.

| Puja type | Domestic INR | NRI USD |
|---|---|---|
| Satyanarayan Katha | ₹2,200 | $36 |
| Griha Pravesh | ₹3,500 | $60 |
| Rudrabhishek | ₹3,200 | $52 |
| Wedding ceremony (per day) | ₹12,000 | $200 |
| Antim Sanskar | ₹5,000 | $85 |
| Navagraha Shanti | ₹5,500 | $95 |
| Mahamrityunjaya 1.25 lakh jaap | ₹10,000 | $170 |
| Ganpati Sthapana (Nagpur specialty, 1.5 day) | ₹7,500 | $125 |

Platform commission: 25% trio-wide. Same rate as Jaipur tier-2.

> All prices are **target / projection** — verify against founder's first-cohort negotiations before publishing on prod.

## Engineering tickets (dependencies — verify before founder go-live)

- [x] `R-Q1-S-002a` Pandit onboarding pipeline (shipped — `/pandit/onboard`)
- [x] `R-Q1-S-002b` KYC + Aadhaar verification (shipped — gates payouts per business rule #4)
- [x] `R-Q1-S-002c` Booking workflow with video proof (shipped — mandatory per business rule #1)
- [x] `R-Q1-E` Payout system (shipped — gated on Aadhaar verified)
- [ ] City-filter on `/pandits?city=indore|bhopal|nagpur` listing — verify renders
- [ ] City pages `/city/indore`, `/city/bhopal`, `/city/nagpur` include pandit grid + booking CTAs
- [ ] Per-pandit profile pages hit 200 in prod
- [ ] WhatsApp notification on booking → pandit (verify env or noop)
- [ ] Marathi optional language hint on Nagpur pandit profiles (DRAFT-tier — never auto-publish without native review)

## Coordinator strategy (recommended for trio scale)

A single founder trip can source candidates, but verification + retention requires per-city presence. Recommended pattern:

| City | Coordinator model | Stipend |
|---|---|---|
| Indore | Local hire (full-time contract) | ₹15,000/mo + ₹500/onboarded |
| Bhopal | Shared with Indore (alternating week visits, 2hr drive on NH46) | Same as Indore (split) |
| Nagpur | Local hire (full-time contract) | ₹15,000/mo + ₹500/onboarded |

Estimated coordinator monthly cost: **₹30,000/mo** (2 coordinators) + ₹12,500 milestone bonuses (25 × ₹500) = **₹42,500 one-time + 30k/mo recurring**.

Coordinator scope:
- Owns: sourcing, pre-screening, in-person interview, doc collection
- Reports: weekly to founder via WhatsApp + Bhaktisetu admin dashboard
- Required: own conveyance, Hindi + local-language fluency (Marathi for Nagpur, Malwi/Hindi for Indore-Bhopal)

## Sampradaya specifics

### Indore + Bhopal (MP)

- Maheshwari + Smarta + Gaud Brahmin sampradaya dominant
- Customs: Ahilya Bai Holkar legacy in Indore (annual Mahesh Navami big), Bhopal more pluralistic (Hindu-Muslim shared festival sensitivities)
- Wedding cadence: Nov-Feb peak with Marwari + Maheshwari big-spend weddings — high-margin opportunity
- Ujjain Mahakaleshwar feeder (55km Indore, 190km Bhopal) — Rudrabhishek + Mahamrityunjaya jaap referrals common
- Cooking-puja overlap: Indore is foodie city, Annakut + Govardhan rituals popular

### Nagpur (MH, Vidarbha)

- Vidarbha Marathi Brahmin + Deshastha + Konkanastha sampradaya
- Customs: Ganesh Chaturthi 10-day festival is the supply-demand peak (Aug-Sep) — recruit before then or miss the wave
- Wedding cadence: Marathi wedding rituals differ from MP (Antarpat, Lajahoma, Saptapadi sequence has variant chants)
- Deekshabhoomi (Ambedkar Buddhist site) — sensitivity around non-Hindu rituals; do not pitch Vedic-only narrative in central Nagpur outreach
- Ramtek (50km) is the Kalidas / Ram circuit, plus Mahalakshmi Jagdamba is a major Devi peeth — graha-shanti referrals route through these

## Success metric (Q4 close)

- **25 pandits live + verified across trio** (Supabase `Priest` table where `city IN ('Indore','Bhopal','Nagpur')` AND `aadhaarVerified=true` AND `status='ACTIVE'`)
  - Indore: 10 · Bhopal: 8 · Nagpur: 7
- **20+ trio bookings completed Q4** (downstream KPI, separate roadmap item — projection only)
- **Average rating 4.5+/5**
- **Repeat-customer rate 25%+** (target / projection)
- **80%+ pandit retention** (post-onboarding 30-day churn check)

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Founder trip-cost burden (3 cities, 7-10 days) | Bundle with Ujjain pilgrimage (founder personal trip dual-purpose); rail corridor cheap |
| Coordinator hiring lag — Nagpur Marathi-speaking is the harder hire | Start Nagpur coordinator search 2 weeks ahead of trip |
| Ganesh Chaturthi blackout (Aug-Sep Nagpur) | Schedule Nagpur recruitment Oct-Nov, post-festival lull |
| Bhopal pandits hesitant on smartphone onboarding (older demographic) | Coordinator on-site digital handholding; print onboarding form in Hindi |
| Pricing pushback — Nagpur pandits compare against Pune/Mumbai rates | Show 25% commission share + central-India cost-of-living math |
| KYC slow (Aadhaar OTP issues for elderly) | Allow manual KYC fallback via coordinator visit |
| Marathi-language content for Nagpur pandits | Ship Marathi pandit-profile copy as **DRAFT-tier only**; require native Marathi review before publish (per multilingual content rule) |
| Trust on payout (new platform) | First payout within 48h of completed booking; testimonials from Mumbai/Delhi/Jaipur pandits |

## Founder action items

1. Block 7-10 day corridor trip (Indore→Bhopal→Nagpur). Best window: late October post-Ganesh + post-Pitra Paksh quiet.
2. Hire 1 Indore-based coordinator (covers Bhopal alternating weeks) + 1 Nagpur-based coordinator. Total recurring: ~₹30k/mo.
3. Pre-book 2-3 partner temples per city — endorsements help recruit:
   - **Indore**: Khajrana Ganesh, Annapurna Mandir, Bada Ganpati
   - **Bhopal**: Birla Mandir, Bhojpur (Bhojeshwar)
   - **Nagpur**: Tekdi Ganesh, Mahalakshmi Jagdamba, Ramtek (50km)
4. Run first 3 onboardings per city end-to-end yourself before delegating to coordinators
5. Track Supabase `Priest` table city IN ('Indore','Bhopal','Nagpur') weekly via `/admin/supply?city=indore` (and bhopal/nagpur)
6. Phase the 25-target: **Month 10**: 8 (3 Indore + 3 Bhopal + 2 Nagpur). **Month 11**: 10 (4 Indore + 3 Bhopal + 3 Nagpur). **Month 12**: 7 (3 Indore + 2 Bhopal + 2 Nagpur)

## Closes

- R-Q4-S-001 (this item) — flips to `shipped` only when Supabase confirms 25 verified pandits across trio
- Enables city × pandit matrix for central India belt
- Enables Q4 + Q1-2027 central-India geo expansion (Ujjain, Gwalior, Jabalpur as follow-on tier-3 spokes from Indore/Bhopal hub)
- Strengthens Ujjain Mahakaleshwar Rudrabhishek supply pipe (cross-city booking from devotees nationwide)

## Verification path

```bash
# Once founder claims 25 onboarded, agent verifies via:
psql $SUPABASE_DIRECT_URL -c "
  SELECT city, COUNT(*) AS verified_pandits
  FROM \"Priest\"
  WHERE city IN ('Indore', 'Bhopal', 'Nagpur')
    AND \"aadhaarVerified\" = true
    AND status = 'ACTIVE'
  GROUP BY city;
"
# Expected:
#   Indore | 10
#   Bhopal |  8
#   Nagpur |  7
```

When the sum hits 25, flip roadmap item `shipped_at` to the confirmation date and update KPI `current: 25` in `001-onboard-25-verified-pandits-in-indore-bhopal-nagpu.md` frontmatter.
