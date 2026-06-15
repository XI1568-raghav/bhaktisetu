# Onboard 5 Verified Temples in Delhi

> **Roadmap item**: R-Q2-S-006 (P1) · **Quarter**: Q2 · **Month target**: 4 · **Authored**: 2026-06-15

## Status: founder-action-required

This is supply-side temple onboarding. KPI (`verified_temples_count_delhi = 5`)
requires the founder (or a Delhi-based partnerships coordinator) to make physical /
phone contact with each temple administration, sign the partnership MoU, complete
temple KYC, and publish each temple live on the platform. Agent ships the scaffold,
outreach pipeline, public-domain institutional contacts, Hindi-first communication
templates, KYC checklist, and tracking doc. Status remains `in_progress` until
founder closes via Supabase row count on `verified_temples` filtered by
`city = 'Delhi'`.

## Why Delhi

| Lever | Detail |
|---|---|
| City profile | National capital; ~32M metro NCR, India's largest urban devotional base |
| Devotional density | High — Akshardham, Birla, Chhatarpur, ISKCON East, Kalkaji all premier-tier |
| Hindi devotional base | Native — primary language of NCR devotee + UP/Bihar migrant population |
| Tourist + NRI flow | Very high — international airport (IGI), NRI return-visit anchor city |
| Existing competition | Moderate — Sri Mandir + AppsForBharat have Delhi inventory but limited live-darshan |
| Navratri 2026 | Sep-Oct 2026 = peak natural moment for Chhatarpur + Kalkaji live darshan launch |

## Target 5 temples (priority order)

| # | Temple | Trust / Admin body | Distinct angle | Priority |
|---|---|---|---|---|
| 1 | **Swaminarayan Akshardham (BAPS)** | BAPS Swaminarayan Sanstha | Per R-Q2-S-002 BAPS scoping; flagship Delhi temple; international NRI darshan demand | P0 |
| 2 | **Birla Mandir (Laxminarayan Temple)** | Birla Family Trust / Mandir Trust | Connaught Place heritage (1939); NRI emotional anchor; daily ~5K visitors | P0 |
| 3 | **ISKCON Delhi East (Sant Nagar)** | ISKCON Delhi (per R-Q2-S-001 ISKCON MoU pipeline) | Krishna lane; international devotee base; uses existing ISKCON partnership track | P0 |
| 4 | **Chhatarpur Mandir (Shri Adya Katyayani Shakti Peeth)** | Shree Adhya Katyayani Shakti Peetha Mandir Trust | Largest Delhi temple by area; Navratri peak; NRI-friendly layout | P1 |
| 5 | **Kalkaji Mandir** | Kalkaji Mandir Prabandhak Committee | Devi shakti peeth; daily ~10K visitors; located adjacent to Lotus Temple metro | P1 |

> Note: Original spec listed "Lotus Temple" as #5. Lotus Temple is a Bahá'í House of
> Worship (not a Hindu temple), administered by the National Spiritual Assembly of
> the Bahá'ís of India. It does not offer puja / darshan in the Vedic sense
> and is not a fit for the Bhaktisetu inventory model. Replaced with Kalkaji Mandir —
> a verified Devi shakti peeth adjacent to the Lotus Temple metro stop, often confused
> with Lotus in tourist itineraries. Founder may swap back to a different temple if a
> Bahá'í cultural-tour angle becomes a deliberate product expansion.

## Public-domain institutional contacts (founder uses for first outreach)

> All contacts are **publicly listed institutional addresses / phone / website** from
> the trust's own published material. Use these for first contact only; do NOT publish
> them in any consumer-facing surface. Per repo rules: no fabricated personal contacts.
> Replace with verified contact-person names + direct mobile only after the trust
> introduces them in writing.

### 1. BAPS Swaminarayan Akshardham

- Trust name: Bochasanwasi Akshar Purushottam Swaminarayan Sanstha (BAPS)
- Address (public): Noida Mor, Pandav Nagar, New Delhi 110092
- Public phone: +91-11-4344-2344 [VERIFY-FOUNDER from akshardham.com]
- Website: https://akshardham.com
- **Pipeline already exists** — leverage R-Q2-S-002 BAPS scoping outcome. Use the
  existing BAPS Bureau channel (do not start fresh outreach).

### 2. Birla Mandir (Laxminarayan Temple) Trust

- Trust name: Shree Laxminarayan Mandir Trust (Birla family)
- Address (public): Mandir Marg, Connaught Place, New Delhi 110001
- Public phone: [VERIFY-FOUNDER from on-site mandir office board]
- Best angle: 1939 heritage angle (inaugurated by Mahatma Gandhi); NRI nostalgia;
  Janmashtami + Diwali peak.

### 3. ISKCON Delhi (East of Kailash)

- Trust name: International Society for Krishna Consciousness — Delhi (Sant Nagar)
- Address (public): Hare Krishna Hill, Sant Nagar, East of Kailash, New Delhi 110065
- Public phone: +91-11-2623-5133 [VERIFY-FOUNDER from iskcondelhi.com]
- Website: https://iskcondelhi.com
- **Pipeline already exists** — leverage R-Q2-S-001 ISKCON GBC partnership MoU. Use
  ISKCON pipeline lead, not fresh outreach.

### 4. Chhatarpur Mandir Trust

- Trust name: Shree Adhya Katyayani Shakti Peetha Mandir Trust
- Address (public): Chhatarpur Road, near Chhatarpur metro, New Delhi 110074
- Public phone: [VERIFY-FOUNDER from trust office board]
- Best angle: Navratri (Sep-Oct 2026) live darshan + per-day Devi mantra schedule;
  largest temple complex in Delhi by area.

### 5. Kalkaji Mandir Prabandhak Committee

- Trust name: Kalkaji Mandir Prabandhak Committee
- Address (public): Kalkaji, near Nehru Place, New Delhi 110019
- Public phone: [VERIFY-FOUNDER from temple office]
- Best angle: Shakti peeth; mid-tier price-point puja seva; adjacency to Lotus Temple
  metro creates natural tourist-pilgrim funnel.

## Hindi-first communication templates

> Founder customises {{token}} fields. Templates are starter material, NOT auto-sent
> by the platform. All copy reviewed against R-Q1-CS Hindi macros style guide
> (devotional register, address temple admin as `आदरणीय`).

### Template 1 — First-touch WhatsApp message (Hindi)

```
नमस्कार {{trust_secretary_name}} जी 🙏

मैं {{founder_name}}, भक्तिसेतू (Bhaktisetu) का संस्थापक. भक्तिसेतू
भारत का एक भक्तिप्रधान सुपर-ऐप है — सीधा दर्शन, पूजा बुकिंग,
वीडियो-प्रूफ सहित, और NRI भक्तों के लिए 80G रसीद की सुविधा सहित.

{{temple_name}} दिल्ली का एक अत्यंत पवित्र स्थान है और हम आपके
ट्रस्ट को हमारे प्लेटफ़ॉर्म पर सम्मिलित होने के लिए आमंत्रित करना
चाहते हैं. इससे विश्वभर के भक्तों को सीधा दर्शन व पूजा सेवा मिल
सकेगी और ट्रस्ट को अधिक दान व सेवा-बुकिंग प्राप्त होंगी.

कृपया हमें 15 मिनट का फोन / प्रत्यक्ष भेंट का समय दें.

धन्यवाद.
{{founder_name}}
भक्तिसेतू • {{founder_phone}}
www.darshya.online (हिंदी / English / NRI USD समर्थन)
```

### Template 2 — Email follow-up (Hindi + English bilingual)

[See `docs/supply/templates/delhi-temple-email-hindi-en.md` — to be drafted by
founder before first send. Should include: trust 80G commission split (typical 20%
of Bhaktisetu revenue, 80% to temple), video-proof guarantee, NRI USD payout in INR
via Razorpay route, sample dashboard screenshots.]

### Template 3 — Post-meeting MoU brief (English)

[See `docs/legal/temple-partnership-mou-template.md` — existing R-Q1-L-* legal
deliverable. Reuse without modification.]

## KYC + verification checklist (per temple)

- [ ] Trust registration certificate (Societies Registration Act 1860 OR Public
  Trust Act applicable to Delhi) — verified copy
- [ ] 80G + 12A certificate (current FY) — for donation receipts
- [ ] PAN of trust
- [ ] Bank account in trust name (for payouts via Razorpay Route)
- [ ] Trust secretary / treasurer designated point-of-contact w/ written authorisation
- [ ] Live darshan setup readiness — IVS stream URL, camera position, fallback YouTube
- [ ] Puja menu w/ Hindi + English descriptions + prices (₹ INR + $ USD)
- [ ] Temple admin onboarding to `/temple-portal` (Hindi UI default)
- [ ] Sample booking dry-run (1 puja, 1 darshan slot, full video-proof cycle)
- [ ] Signed MoU + GST consideration (commission invoice flow)
- [ ] DPDP §6 consent flow for any temple-side data shared

## Onboarding pipeline (founder workflow, 10 weeks)

| Week | Action |
|---|---|
| 1 | Founder calls Trust offices (use public-domain phones above). Records contact-person name + direct mobile. Books 5 in-person meetings. |
| 2 | First meeting Birla Mandir + Chhatarpur (in-Delhi-core priority). Brings printed Hindi pitch deck + sample 80G receipt + sample temple dashboard. |
| 3 | First meeting Akshardham (via R-Q2-S-002 BAPS Bureau channel — different protocol). |
| 4 | First meeting ISKCON Delhi East (via R-Q2-S-001 ISKCON channel) + Kalkaji. |
| 5-6 | KYC document collection. Trust legal reviews MoU. Iterate on commission %, video-proof SLA, payout schedule. |
| 7 | Sign MoU temple 1 + 2. Temple admin onboarded to portal. IVS stream tech setup. |
| 8 | Sign MoU temple 3 + 4. Dry-run dummy puja booking + darshan stream. |
| 9 | Sign MoU temple 5. Polish puja menu Hindi descriptions. |
| 10 | Go-live all 5. Begin marketing push (Hindi YouTube + NCR-FM ad + Delhi devotee WhatsApp groups). |

## Engineering scaffold (already in repo / queued)

- `/temple-portal` Hindi UI — partially shipped (per TASKS.md history). Confirm
  Hindi hi-IN locale strings present.
- `/city/delhi` SEO page — per R-Q1-SEO catalogue (city × deity programmatic pages).
  Verify present + Hindi sub-section.
- Temple profile page template `/temples/[slug]` — existing, used for prior cities.
- Per-temple IVS setup — uses Cloudflare Stream OR AWS IVS env-or-noop scaffold per
  prior temple onboardings.
- `verified_temples` Supabase table — existing schema. Founder marks `verified_at`
  + `city = 'Delhi'` on go-live per temple.

## Sub-tasks (suggested ticket split, not yet created in roadmap)

- R-Q2-S-006a — 5 temple `/temples/[slug]` profile pages w/ Hindi + English content
- R-Q2-S-006b — Per-temple IVS / Cloudflare Stream setup
- R-Q2-S-006c — Hindi `/temple-portal` doc translation review
- R-Q2-S-006d — Delhi-local marketing push (Hindi YouTube + NCR FM + devotee WA groups)
- R-Q2-S-006e — Chhatarpur Navratri 2026 (Sep-Oct) launch readiness

## Marketing-ready angles (do NOT publish until temple signs MoU)

> Per repo rules: NO fabricated social proof, NO invented "X signed yesterday", NO
> scarcity claims without live inventory gate. Every claim below is contingent on the
> trust signing — published only after go-live.

- **Akshardham**: "Now live on Bhaktisetu — darshan from Delhi's BAPS flagship.
  NRI USD payment supported." (only after BAPS Bureau sign-off via R-Q2-S-002).
- **Birla Mandir**: "Connaught Place heritage darshan — direct from Birla Mandir
  Delhi" (1939 heritage angle).
- **ISKCON Delhi**: "Krishna darshan + Govinda meal seva — direct from ISKCON Delhi
  East" (after ISKCON GBC + Delhi ISKCON dual sign-off).
- **Chhatarpur**: "Navratri 2026 — 9-day live darshan from Delhi's largest temple".
- **Kalkaji**: "Shakti peeth darshan — direct from Kalkaji Delhi".

## Q2 success metric (founder closes)

- 5/5 temples MoU signed + KYC complete + live on platform
- First booking flow tested per temple (≥1 dummy booking + 1 darshan stream per
  temple)
- Verified-temples Supabase row count for `city = 'Delhi'` reaches 5
- Chhatarpur Navratri 2026 (Sep-Oct) live stream booked + tested by week of
  Sep 15, 2026
- 30+ first real-paid bookings per temple in first 60 days post go-live (projection
  basis: R-Q2-S-001 ISKCON onboarding benchmark; revise after first live cycle)

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Akshardham (BAPS) Bureau protocol slow (multi-month) | Start week 1 via R-Q2-S-002 pipeline; do not block other 4 temples on it |
| Birla Trust declines due to closed-network policy | Lead with NRI / international reach angle; offer 90:10 split first 6 months |
| Hindi-first messaging required (don't lead w/ English) | Founder uses Hindi templates above; hires Hindi-native onboarding ops if needed |
| Trust legal review takes 4-6 weeks | Build buffer; start Week 1 not Week 5 |
| IVS stream tech complexity for 5 temples | Reuse existing setup from R-Q2-S-001 ISKCON pipeline; standardise camera + RTMP push |
| Chhatarpur Navratri Sep-Oct 2026 launch missed if MoU not by Aug | Lock Chhatarpur as P1 priority; plan B = Kalkaji as Navratri anchor |
| KPI inflation pressure to mark-live before real readiness | Strict: do NOT flip `verified_at` until full dry-run booking + darshan stream pass |

## Carries to next roadmap cycle

- If Q2 closes 3/5 (not 5/5), carry remaining 2 into Q3 with reset target date
- If Akshardham (BAPS) signs by week 6, fast-track Akshardham-anchored NRI marketing
- Q3 candidate: Delhi temples 6-10 (Gauri Shankar Mandir Chandni Chowk, Hanuman
  Mandir Connaught Place, Yogmaya Mandir Mehrauli, Jhandewalan Mandir, Bangla Sahib
  Gurudwara if cross-faith expansion approved)

## Status flip rules

| Trigger | Action |
|---|---|
| 1 temple MoU signed | Note in `handoff_notes` of item .md; status stays `in_progress` |
| 3 temples live | Update `kpi.current = 3`; status stays `in_progress` |
| 5 temples live + 30 real-paid bookings each | Flip `status: shipped` + `shipped_at: <ts>` + `kpi.current = 5` |
| Q2 ends with < 5 live | Carry to Q3 — create R-Q3-S-NEW item, mark this `status: in_progress` w/ carry note |

## Closes

R-Q2-S-006 — handoff doc shipped. Status stays `in_progress`. Founder action required
to close. PR scaffolds engineering tickets only; KPI close gated on real-world
temple MoUs.
