# Onboard 5 Verified Temples in Pune

> **Roadmap item**: R-Q2-S-007 (P1) · **Quarter**: Q2 · **Month target**: 5 · **Authored**: 2026-06-15

## Status: founder-action-required

This is supply-side temple onboarding. KPI (`verified_temples_count_pune = 5`) requires
the founder (or a Pune-based partnerships coordinator) to make physical / phone contact
with each temple administration, sign the partnership MoU, complete temple KYC, and
publish each temple live on the platform. Agent ships the scaffold, outreach pipeline,
public-domain institutional contacts, Marathi-first communication templates, KYC
checklist, and tracking doc. Status remains `in_progress` until founder closes via
Supabase row count on `verified_temples` filtered by `city = 'Pune'`.

## Why Pune

| Lever | Detail |
|---|---|
| City profile | Cultural capital of Maharashtra; ~7.5M metro, 2nd-largest after Mumbai |
| Devotional density | Very high — Ashtavinayak circuit anchor, Dagdusheth Ganpati Mahotsav epicentre |
| Marathi devotional base | Strong — Vaarkari tradition, Tukaram / Dnyaneshwar palki yatra culture |
| Tourist + NRI flow | High — Pune NRI diaspora (US tech corridor + Gulf), strong UPI penetration |
| Existing competition | Moderate — Sri Mandir present but weak Pune-specific darshan inventory |
| Ganesh Chaturthi 2026 | September 2026 = peak natural moment for Dagdusheth live darshan launch |

## Target 5 temples (priority order)

| # | Temple | Trust / Admin body | Distinct angle | Priority |
|---|---|---|---|---|
| 1 | **Shrimant Dagdusheth Halwai Ganpati Mandir** | Shrimant Dagdusheth Halwai Sarvajanik Ganpati Trust | Pune #1 by foot traffic; Ganesh Chaturthi peak; international NRI darshan demand | P0 |
| 2 | **Shri Chaturshringi Devi Mandir** | Chaturshringi Devasthan Trust | Devi shakti; monsoon yatra; Navratri 9-day live darshan opportunity | P0 |
| 3 | **ISKCON NVCC Pune (Kondhwa)** | ISKCON Pune (per R-Q2-S-001 ISKCON MoU pipeline) | Krishna lane; international devotee base; uses existing ISKCON partnership track | P0 |
| 4 | **Shri Khandoba Mandir, Jejuri** | Shri Khandoba Sansthan Trust, Jejuri | Khandoba devotional (Bhandara/turmeric); ~50km from Pune; Maharashtra kuldevta tradition | P1 |
| 5 | **Shrimant Bhausaheb Rangari Ganpati Mandir** | Bhausaheb Rangari Ganpati Trust | Oldest sarvajanik Ganpati of Pune (1892); historic Tilak-era founder lineage; alternate to Dagdusheth | P1 |

> Note: Original spec listed "Saraswati Mandir (Shaniwar Wada)" as #5. Shaniwar Wada is
> a heritage fort (ASI-protected), not an active temple administration. Replaced with
> Bhausaheb Rangari Ganpati — verified active sarvajanik trust + historically
> significant (founded 1892, 6 years before Dagdusheth's current trust form). Founder
> may swap back to a different Saraswati / scholarship-angle temple if preferred.

## Public-domain institutional contacts (founder uses for first outreach)

> All contacts are **publicly listed institutional addresses / phone / website** from
> the trust's own published material. Use these for first contact only; do NOT publish
> them in any consumer-facing surface. Per repo rules: no fabricated personal contacts.
> Replace with verified contact-person names + direct mobile only after the trust
> introduces them in writing.

### 1. Dagdusheth Halwai Ganpati Trust

- Trust name: Shrimant Dagdusheth Halwai Sarvajanik Ganpati Trust
- Address (public): 250, Budhwar Peth, Pune 411002, Maharashtra
- Public phone (trust office): +91-20-2447-XXXX [VERIFY-FOUNDER from dagdushethganpati.com]
- Website: https://www.dagdushethganpati.com
- Online seva: Trust already runs online darshan + abhishek booking — Bhaktisetu pitch
  is national distribution + Marathi-first NRI UX + 80G receipt automation.

### 2. Chaturshringi Devasthan Trust

- Trust name: Shree Chaturshringi Mata Devasthan Trust
- Address (public): Chaturshringi Hill, Senapati Bapat Road, Pune 411016
- Public phone: [VERIFY-FOUNDER — published on official temple board]
- Website: https://www.chaturshringi.com [VERIFY-FOUNDER for current URL]
- Best angle: Navratri (Sep-Oct 2026) live darshan + per-day Devi mantra schedule.

### 3. ISKCON NVCC Pune (Kondhwa)

- Trust name: International Society for Krishna Consciousness — Pune NVCC
- Address (public): Sr. No. 4, Tara Hills, Kondhwa Khurd, Pune 411048
- Public phone: +91-20-XXXX-XXXX [VERIFY-FOUNDER — published on iskconpune.com]
- Website: https://www.iskconpune.com
- **Pipeline already exists** — leverage R-Q2-S-001 ISKCON GBC partnership MoU. Pune
  NVCC opted in conditional on ISKCON Bureau approval. Use ISKCON pipeline lead.

### 4. Shri Khandoba Sansthan Trust, Jejuri

- Trust name: Shri Khandoba Sansthan, Jejuri (PCMC-listed trust)
- Address (public): Khandoba Mandir, Jejuri, Tal. Purandar, Dist. Pune 412303
- Public phone: [VERIFY-FOUNDER from Jejuri Devasthan office board]
- Best angle: Somavati Amavasya + Champa Shashthi (Dec 2026) live darshan + Bhandara
  abhishek seva. Outside Pune city core but heavily searched by Maharashtra devotees.

### 5. Shrimant Bhausaheb Rangari Ganpati Trust

- Trust name: Shrimant Bhausaheb Rangari Ganpati Trust (since 1892)
- Address (public): Budhwar Peth, near Lakdi Pul, Pune 411002
- Public phone: [VERIFY-FOUNDER from trust office]
- Best angle: Heritage angle (1892 founding, Tilak-era), differentiates from Dagdusheth.

## Marathi-first communication templates

> Founder customises {{token}} fields. Templates are starter material, NOT auto-sent
> by the platform. All copy reviewed against R-Q1-CS-003 Marathi macros style guide
> (devotional register, address temple admin as `आदरणीय`).

### Template 1 — First-touch WhatsApp message (Marathi)

```
नमस्कार {{trust_secretary_name}} जी 🙏

मी {{founder_name}}, भक्तिसेतू (Bhaktisetu) चा संस्थापक. भक्तिसेतू ही
भारतातील एक भक्तिप्रधान सुपर-अॅप आहे — थेट दर्शन, पूजा बुकिंग,
व्हिडिओ-प्रूफ सहित, आणि NRI भक्तांसाठी 80G पावती सोयीसकट.

{{temple_name}} हे पुण्यातील एक अत्यंत पवित्र स्थान आहे आणि आम्ही आपल्या
ट्रस्टला आमच्या प्लॅटफॉर्मवर सहभागी होण्यासाठी आमंत्रित करू इच्छितो.
यामुळे जगभरातील भक्तांना थेट दर्शन व पूजा सेवा देता येईल आणि ट्रस्टला
अधिक देणग्या व सेवा-बुकिंग्स मिळतील.

कृपया आम्हाला 15 मिनिटांचा फोन / प्रत्यक्ष भेटीचा वेळ द्यावा.

धन्यवाद.
{{founder_name}}
भक्तिसेतू • {{founder_phone}}
www.darshya.online (हिंदी / मराठी / English / NRI USD समर्थन)
```

### Template 2 — Email follow-up (Marathi + English bilingual)

[See `docs/supply/templates/pune-temple-email-marathi-en.md` — to be drafted by
founder before first send. Should include: trust 80G commission split (typical 20%
of Bhaktisetu revenue, 80% to temple), video-proof guarantee, NRI USD payout in INR
via Razorpay route, sample dashboard screenshots.]

### Template 3 — Post-meeting MoU brief (English)

[See `docs/legal/temple-partnership-mou-template.md` — existing R-Q1-L-* legal
deliverable. Reuse without modification.]

## KYC + verification checklist (per temple)

- [ ] Trust registration certificate (Maharashtra Public Charitable Trusts Act 1950 OR
  Society Registration Act 1860) — verified copy
- [ ] 80G + 12A certificate (current FY) — for donation receipts
- [ ] PAN of trust
- [ ] Bank account in trust name (for payouts via Razorpay Route)
- [ ] Trust secretary / treasurer designated point-of-contact w/ written authorisation
- [ ] Live darshan setup readiness — IVS stream URL, camera position, fallback YouTube
- [ ] Puja menu w/ Marathi + Hindi + English descriptions + prices (₹ INR + $ USD)
- [ ] Temple admin onboarding to `/temple-portal` (Marathi UI per R-Q1-CS-003)
- [ ] Sample booking dry-run (1 puja, 1 darshan slot, full video-proof cycle)
- [ ] Signed MoU + GST consideration (commission invoice flow)
- [ ] DPDP §6 consent flow for any temple-side data shared

## Onboarding pipeline (founder workflow, 10 weeks)

| Week | Action |
|---|---|
| 1 | Founder calls Trust offices (use public-domain phones above). Records contact-person name + direct mobile. Books 5 in-person meetings. |
| 2 | First meeting Dagdusheth + Chaturshringi (priority). Brings printed Marathi pitch deck + sample 80G receipt + sample temple dashboard. |
| 3 | First meeting ISKCON Pune (via R-Q2-S-001 ISKCON GBC channel — different protocol). |
| 4 | First meeting Khandoba Jejuri + Bhausaheb Rangari. |
| 5-6 | KYC document collection. Trust legal reviews MoU. Iterate on commission %, video-proof SLA, payout schedule. |
| 7 | Sign MoU temple 1 + 2. Temple admin onboarded to portal. IVS stream tech setup. |
| 8 | Sign MoU temple 3 + 4. Dry-run dummy puja booking + darshan stream. |
| 9 | Sign MoU temple 5. Polish puja menu Marathi descriptions. |
| 10 | Go-live all 5. Begin marketing push (Marathi YouTube + Pune local FM ad + Pune Vaarkari WhatsApp groups). |

## Engineering scaffold (already in repo / queued)

- `/temple-portal` Marathi UI — R-Q1-CS-003 deliverable, partially shipped (per
  TASKS.md history). Confirm Marathi mr-IN locale strings present.
- `/city/pune` SEO page — per R-Q1-SEO catalogue (city × deity programmatic pages).
  Verify present + Marathi sub-section.
- Temple profile page template `/temples/[slug]` — existing, used for prior cities.
- Per-temple IVS setup — uses Cloudflare Stream OR AWS IVS env-or-noop scaffold per
  prior temple onboardings.
- `verified_temples` Supabase table — existing schema. Founder marks `verified_at`
  + `city = 'Pune'` on go-live per temple.

## Sub-tasks (suggested ticket split, not yet created in roadmap)

- R-Q2-S-007a — 5 temple `/temples/[slug]` profile pages w/ Marathi + Hindi + English content
- R-Q2-S-007b — Per-temple IVS / Cloudflare Stream setup
- R-Q2-S-007c — Marathi `/temple-portal` doc translation review
- R-Q2-S-007d — Pune-local marketing push (Marathi YouTube + Pune FM + Vaarkari WA groups)
- R-Q2-S-007e — Dagdusheth Ganesh Chaturthi 2026 (Sep) launch readiness

## Marketing-ready angles (do NOT publish until temple signs MoU)

> Per repo rules: NO fabricated social proof, NO invented "X signed yesterday", NO
> scarcity claims without live inventory gate. Every claim below is contingent on the
> trust signing — published only after go-live.

- **Dagdusheth**: "Now live on Bhaktisetu — darshan + abhishek seva direct from
  Pune's Ganpati. NRI USD payment supported."
- **Chaturshringi**: "Navratri 2026 — 9-day live darshan from Pune's Devi peeth"
  (after Navratri MoU annex signed for live streaming rights).
- **ISKCON Pune**: "Krishna darshan + Govinda meal seva — direct from ISKCON Pune"
  (after ISKCON GBC + Pune NVCC dual sign-off).
- **Khandoba Jejuri**: "Live Bhandara darshan + Champa Shashthi seva from Jejuri".
- **Bhausaheb Rangari**: "Pune's original sarvajanik Ganpati (1892) — now on Bhaktisetu".

## Q2 success metric (founder closes)

- 5/5 temples MoU signed + KYC complete + live on platform
- First booking flow tested per temple (≥1 dummy booking + 1 darshan stream per
  temple)
- Verified-temples Supabase row count for `city = 'Pune'` reaches 5
- Dagdusheth Ganesh Chaturthi 2026 (Sep) live stream booked + tested by week of
  Aug 25, 2026
- 30+ first real-paid bookings per temple in first 60 days post go-live (projection
  basis: R-Q2-S-001 ISKCON onboarding benchmark; revise after first live cycle)

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Dagdusheth declines due to existing in-house online seva | Position as additive channel (national + NRI reach), not replacement; offer 90:10 split first 6 months |
| Marathi-first messaging required (don't lead w/ English) | Founder uses Marathi templates above; hires Marathi-native onboarding ops if needed |
| Trust legal review takes 4-6 weeks | Build buffer; start Week 1 not Week 5 |
| IVS stream tech complexity for 5 temples | Reuse existing setup from R-Q2-S-001 ISKCON pipeline; standardise camera + RTMP push |
| Ganesh Chaturthi Sep 2026 launch missed if MoU not by Aug | Lock Dagdusheth as #1 priority; plan B = Bhausaheb Rangari as Ganpati anchor |
| KPI inflation pressure to mark-live before real readiness | Strict: do NOT flip `verified_at` until full dry-run booking + darshan stream pass |

## Carries to next roadmap cycle

- If Q2 closes 3/5 (not 5/5), carry remaining 2 into Q3 with reset target date
- If Dagdusheth signs by week 6, fast-track Ganesh Chaturthi marketing push start
- Q3 candidate: Pune temples 6-10 (Tulshibaug Ganpati, Mandai Ganpati, Vishnu Ji
  Mandir Pune, Parvati Hill temple complex, Pataleshwar) — already partially
  identified in legacy spec

## Status flip rules

| Trigger | Action |
|---|---|
| 1 temple MoU signed | Note in `handoff_notes` of item .md; status stays `in_progress` |
| 3 temples live | Update `kpi.current = 3`; status stays `in_progress` |
| 5 temples live + 30 real-paid bookings each | Flip `status: shipped` + `shipped_at: <ts>` + `kpi.current = 5` |
| Q2 ends with < 5 live | Carry to Q3 — create R-Q3-S-NEW item, mark this `status: in_progress` w/ carry note |

## Closes

R-Q2-S-007 — handoff doc shipped. Status stays `in_progress`. Founder action required
to close. PR scaffolds engineering tickets only; KPI close gated on real-world
temple MoUs.
