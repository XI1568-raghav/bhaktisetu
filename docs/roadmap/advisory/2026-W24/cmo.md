# CMO Advisory — 2026-W24

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 55
- Planned: 55
- In progress: 0
- Shipped: 0
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
- **R-Q4-M-007** CSR donation match campaign — corporate partners 2x match for adopt-a-temple — ₹4,00,000 / 32h (P0)
- **R-Q2-M-011** Referral program — formal launch w/ ₹100 credit per converted referee — ₹40,000 / 8h (P2)
- **R-Q2-M-005** Influencer outreach — 10 micro-influencers (5K-50K) in devotional niche — ₹30,000 / 16h (P1)
- **R-Q3-M-014** SEO push — 100 city+puja landing pages + Hindi content + backlinks — ₹60,000 / 40h (P2)
- **R-Q3-M-008** YouTube channel launch — 10 devotional shorts/week + 1 long-form podcast — ₹40,000 / 32h (P1)

## Founder-blocked
- R-Q1-M-003 blocked by U8: PostHog cloud wired into web layout (Provider)
- R-Q1-M-010 blocked by U7: WhatsApp Cloud API business verification submitted
- R-Q2-G-007 blocked by U7: WhatsApp diaspora groups — seed 10 NRI WA groups (Bay Area + NJ + LDN)
- R-Q2-M-006 blocked by U2: NRI Google Ads scale — $200/mo budget across US+UK+CA+AU
- R-Q2-M-008 blocked by U7: WhatsApp daily devotional broadcast — 1000 opt-in users (under free tier)
- R-Q3-M-001 blocked by U3: Founder narrative weekly thread — 12 Twitter threads on building Bhaktisetu
- R-Q3-M-002 blocked by U3: First AMA on r/india — pre-seed announcement + community Q&A 500+ upvotes
- R-Q3-M-003 blocked by U4: 14-day pre-seed campaign — PR + investor outreach + landing page conversion
- R-Q3-M-004 blocked by U3: Twitter Spaces live series — 4 weekly Spaces on devotional tech with guests
- R-Q3-M-006 blocked by U5: Diwali festival mega-campaign — 7-day push + paid + influencer (target 30K bookings)
- R-Q3-M-012 blocked by U3: Founder podcast tour — guest on 5 Indian startup podcasts + 2 NRI podcasts
- R-Q4-G-001 blocked by U3: Australia launch full — Sydney + Melbourne + Brisbane diaspora + AUD checkout

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 02-cmo.md)
```
# 02 — CMO: Free GTM Plan (First 100 Users in 30 Days)

> Owner: solo founder. Budget: $0. Today: 2026-04-27. Domain live: https://darshya.online.
> Hero copy as shipped: "Your bridge to sacred traditions — Watch live temple darshan. Book authentic pujas with verified priests. Get AI-powered spiritual guidance rooted in ancient wisdom." Trust gates: video proof on every puja, Aadhaar-verified priests, 24h cancellation, 80G donation receipts when `HAS_80G_VERIFIED` is on (currently off).
> Marketing must NOT claim "Darshya Technologies Pvt Ltd" until `IS_INCORPORATED_VERIFIED` flips. Sign all outreach as "Founder, Darshya".

---

## 1. ICP — three segments, ranked

### ICP-1: NRI Hindu households in US/UK/Canada/Gulf, age 30–55 (HIGHEST LTV)
- **Who**: First/second-gen Indian-origin families who keep a home mandir, send money back for parents' shraddha/pujas, can't fly home for every festival. Pay in USD/GBP/AED. Willing to spend $50–500 per puja.
- **Pain**: Currently pay an uncle's friend in India via UPI with no proof; unsure if puja actually happened. Darshya's video proof is the wedge.
- **Where they hang out**: Facebook groups "Indians in [City]" (Houston/Dallas/NJ/London/Toronto/Dubai), Telegram NRI groups, BAPS Swaminarayan satsangs, ISKCON local temple WhatsApp lists, r/ABCDesis, r/IndiansAbroad.
- **Verified evidence**: BAPS Shri Swaminarayan Mandir Robbinsville, NJ — largest Hindu mandir in the Western hemisphere, draws 10K+ weekly satsang attendance. Source: https://www.baps.org/Global-Network/North-America.aspx `[verified-by-WebFetch]` (page accessibility intermittent — `[ASSUMPTION]` on the 10K weekly figure; the mandir's existence and scale are widely documented).

### ICP-2: India-resident Hindu women, age 35–60, smartphone-first
- **Who**: Tier-1/Tier-2 mothers/grandmothers who already do Tuesdays for Hanuman, Mondays for Shiva, fast on Ekadashi. Decision-maker for household pujas. WhatsApp-native.
- **Pain**: Local pandit unavailable on auspicious tithi; can't travel to ancestral kuldevta temple; wants live darshan during morning chai.
- **Where they hang out**: WhatsApp family/society groups, YouTube devotional channels (Aastha, Sanskar TV cuts), Facebook bhajan groups, ShareChat/Moj Hindi devotional feeds.
- **Verified evidence**: India had 806M internet users (TRAI Q1 2024) and 462M+ active YouTube users — devotional is a top-3 vertical on YouTube India per Google's own creator reports `[ASSUMPTION on top-3]`. Source: https://www.trai.gov.in/sites/default/files/PR_No.34of2024.pdf

### ICP-3: Spiritually-curious Indian millennials/Gen-Z, age 22–35, English+Hindi bilingual
- **Who**: Urban professionals rediscovering tradition post-COVID; into Sadhguru clips, Acharya Prashant, "I'm spiritual not religious" types. Will buy a ₹500 rudraksha + book a one-off astro consult.
- **Pain**: Don't know which puja for which problem; want vetted spirituality without WhatsApp-uncle astrology scams.
- **Where they hang out**: r/hinduism, r/IndiaSpeaks (devotional threads), X/Twitter "right-Twitter" trad accounts, Instagram reels (#sanatandharma), Sadhguru/Isha YouTube comment sections.
- **Verified evidence**: r/hinduism subscriber count `[ASSUMPTION ~220k]` — Reddit's about endpoint blocked from this environment; verify manually before launch. Sadhguru YouTube — 12M+ subscribers, verifiable: https://www.youtube.com/@sadhguru.

---

```

## Recommended next-cycle prompts for Decision Agent
1. Spawn cmo-agent on R-Q4-M-007 (CSR donation match campaign — corporate partners 2x match for adopt-a-temple) — csr_match_partners 0/5 count
1. Spawn cmo-agent on R-Q2-M-011 (Referral program — formal launch w/ ₹100 credit per converted referee) — referral_conversions 0/200 count
1. Spawn cmo-agent on R-Q2-M-005 (Influencer outreach — 10 micro-influencers (5K-50K) in devotional niche) — influencer_partnerships 0/10 count
