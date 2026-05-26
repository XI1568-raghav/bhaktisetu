# CEO Roadmap — Darshya, 2026-05-27

> Source-of-truth view as head of product, eng, design, GTM. Pre-revenue → seed in 90 days.
> Live agents producing real artifacts daily: `docs/agent-reports/`.
> Admin view: `/admin/agents`.

## 1. State of the union (today)

**Ship status**: production-ready. 8 roles, video-proof pujas, NRI USD billing, knowledge hub (Sanskrit/Ved/Sanatan), gurukul marketplace + admissions, gaushala donations + 80G, store, astrology, wellness, yatra. 11/11 prod tables verified. 89/89 smoke green.

**Distribution status**: 0 paying users. 0 organic traffic of consequence. Domain live. No press. No app store launch yet. No social presence.

**Capital status**: pre-revenue. Solo founder. $0 budget. Free tooling only.

**Implication**: product complete, distribution empty. Every hour for the next 90 days goes to distribution + supply onboarding + investor pipeline. Product changes only when distribution data forces them.

---

## 2. The 90-day plan

### Days 1-30 — "Make something real happen"

**North star this month**: 500 real signups · 25 verified supply partners (any category) · 10 real bookings · 1 press hit.

**Week 1 (now)**: Distribution skeleton
- [ ] Domain DNS + SSL live ✓
- [ ] Sitemap + robots.txt + GSC submit (SEO agent flags issues daily)
- [ ] Google Search Console verified
- [ ] PostHog cloud free wired into web + mobile
- [ ] Twitter/LinkedIn/Instagram accounts created — bio + pinned post
- [ ] First 21-post social queue scheduled (Buffer free)
- [ ] Resend DNS records verified (U13)
- [ ] WhatsApp Cloud API app created (U7)
- [ ] Razorpay live keys (U2) — only when first real booking comes
- [ ] App store listings drafted (iOS TestFlight + Android internal track)

**Week 2**: Supply onboarding sprint
- [ ] 5 temples in Varanasi, 5 in Tirupati, 5 in Bengaluru (manual + WhatsApp)
- [ ] 20 pandits (start with our personal network — 4 cities)
- [ ] 5 gaushalas (call the well-known ones in Pathmeda, Vrindavan, Haryana)
- [ ] 3 gurukuls (already 1 seeded — push for 2 more)
- [ ] 10 astrologers (lowest friction supply — they want clients)

**Week 3**: Demand priming
- [ ] First press pitch — YourStory + Inc42 (one each, tailored)
- [ ] Tribal post: Telegram (NRI Hindu groups), Reddit r/hinduism + r/india + r/IndianStreetBets
- [ ] Founder posts daily on Twitter — "shipping in public", numbers transparent
- [ ] 7-day Instagram series — one shloka card/day
- [ ] First WhatsApp broadcast to imported leads (3000/month free via Resend backup)

**Week 4**: Convert + measure
- [ ] Run NRI-targeted Facebook ads — $50 budget — 3 creatives × 2 audiences (USA + UK Indian diaspora 35-65)
- [ ] Measure CAC, retention, conversion
- [ ] First investor email batch (5 angels)
- [ ] Month-1 retrospective post + tweet

**Tripwire**: If <100 signups by day 30 → distribution channel mix is wrong. Pivot from social → SEO + targeted Reddit/Telegram.

### Days 31-60 — "Find one channel that works"

**North star**: 5,000 signups · 100 verified supply · 50 paid bookings · ₹50K GMV · NRI mix > 20%.

- Double down on whichever channel showed best CAC in week 4 (likely organic Twitter + WhatsApp warm intros or Reddit)
- Ship one viral feature: shareable shloka card generator
- Launch referral: ₹100 credit each side (after first paid booking)
- Apply to 3 accelerators: Y Combinator winter (deferred fallback), Antler India, Stellaris's Founders Forge
- Submit to ProductHunt with a clean launch page (Wed 9am IST → 3pm IST = US east morning)
- Reach out to Hindu American Foundation, Sewa International, BAPS — diaspora amplifiers

### Days 61-90 — "Show enough to raise"

**North star**: 25,000 MAU · ₹2L MRR · D30 retention > 20% · 1 anchor temple-chain partnership LOI · seed deck v2 done.

- Sign 1 anchor temple chain (ISKCON, BAPS, Sringeri Math, Sri Mandir's gap)
- Build founder narrative: 12 weekly tweets with consistent metrics + arc
- Submit deck to 10 seed VCs (use AngelList intro warm path)
- Run first AMA on r/india or live on Spaces
- Target $250K-$500K pre-seed close by day 120

**Tripwire decision tree**:
| Signal | Pivot |
|---|---|
| NRI Day-30 < 25% by W8 | Drop India tier marketing, NRI-only SKU |
| Blended NRI CAC > $40 by W8 | Stop paid social, double on partnerships |
| NRI annual:per-puja ratio < 1:3 by W12 | Annual pricing wrong — A/B at $299, $499, $799 |
| Sri Mandir launches USD tier | Race ahead — ship 80G + gurukul + Sanskrit lessons as moat differentiators |

---

## 3. Roadmap themes for product (Q3 + Q4)

**Q3 priorities** (only if distribution proves):
- AI Pandit (Groq + Cohere free) — answer puja/dharma questions, paywall after 5/day
- Live darshan recording on demand (replay last 24h aartis)
- Yatra package booking — multi-day trips, partner with travel agents
- Wedding muhurat finder with pandit booking attached
- iOS + Android push notification deep-linking for aarti times
- "Adopt a temple" — sustaining monthly donation, same model as gaushala adopt-a-cow

**Q4 priorities** (post-seed):
- Antim sanskar coordination (digital-first, hyper-difficult demographic)
- Sanskrit voice tutor (Groq Whisper + GPT4-mini) — premium tier
- Gurukul payment escrow + recurring tuition
- Marketplace v2 — UGC reviews, ratings, dispute resolution
- B2B temple SaaS — donation page + booking calendar as standalone product
- Affiliates — bloggers + travel agents get 10% commission

**Defer indefinitely until proven**: AR puja experience, NFT diyas, blockchain anything, generative deity art.

---

## 4. Revenue lines + math

8 lines, all live in product:

| Line | Take rate | Avg ticket | Frequency | MRR @ 5K MAU (est) |
|---|---|---|---|---|
| Puja commission | 20-40% | ₹1,500 | 0.4/MAU/mo | ₹1.5L |
| NRI annual sub | 100% | $399/yr | 5% MAU | ₹2.5L |
| AI Pandit premium | 100% | ₹199/mo | 8% MAU | ₹80K |
| Store commission | 8-15% | ₹999 GMV | 0.3/MAU/mo | ₹15K |
| 80G certificate fees | ₹49/cert | ₹49 | 0.15/MAU/mo | ₹3.5K |
| Affiliates outbound | 5-15% | varies | tail | ₹10K |
| Astrology consult | 25% | ₹599 | 0.1/MAU/mo | ₹75K |
| Yatra commission | 8-15% | ₹15K | 0.02/MAU/mo | ₹37K |

**Total at 5K MAU**: ~₹5L MRR (~$60K). At 25K MAU → ~₹25L MRR. Comparable to Sri Mandir's path.

---

## 5. Investor path

| Stage | Bar | Cheque | Targets |
|---|---|---|---|
| Friends/family | 100 signups + 5 bookings | $50K-$150K | Personal network |
| Pre-seed | 5K MAU + $5K MRR + D30 retention curve flat at 25%+ | $250K-$500K | Kunal Shah, Naval, AngelList syndicate, IPV |
| Seed | $25K MRR + 30%+ NRI ARPU + 1 temple chain LOI | $1.5M-$3M | Blume, Stellaris, 3one4, India Quotient, Rainmatter |
| Series A | $200K+ MRR + 60% YoY growth + 50K paying users | $5M-$10M | PeakXV, Lightspeed, Z47, Matrix |

Weekly cadence (run by Investor Agent): 5 new targets/week, 5 personalized emails Mon-Wed.

---

## 6. The agent fleet (already shipped)

Each agent runs on free GitHub Actions cron, writes report to `docs/agent-reports/`, committed back. View live at `/admin/agents`.

| Agent | Cadence | Output | Budget |
|---|---|---|---|
| seo-audit | daily | Page-level meta + sitemap + orphan check | 1 min/day |
| content-pipeline | daily | 3 article drafts + shloka card | 0 min (no API calls) |
| lead-gen | daily | Supply-vs-target scoreboard | 0.5 min/day |
| growth-metrics | daily | Public counts + tripwire reminder | 0.5 min/day |
| social-queue | daily | 21 posts × 3 slots × 7 days | 0 min |
| onboarding-drip | daily | 7-touch sequence per role + Resend send if key set | 0 min |
| pr-outreach | weekly | 10 outlets + pitch templates | 0 min |
| investor-pipeline | weekly | Angel + VC list + per-persona pitch | 0 min |
| health-smoke | every 6h | Full role smoke against prod | 3 min/run |

**Total monthly GH minutes**: ~400 of 2000 free.

**Each agent is a real artifact**, not a doc. SEO agent surfaces real broken meta. Lead-gen agent counts actual prod inventory. Growth agent hits real endpoints. Health smoke runs the actual 89-check suite.

---

## 7. Free-tools stack (no $)

| Layer | Tool | Free tier |
|---|---|---|
| Hosting (web) | Cloudflare Pages | Unlimited bandwidth |
| Hosting (api) | Render free | 750h/month |
| DB | Supabase | 500MB |
| Auth | Custom JWT | $0 |
| Storage | Supabase | 1GB |
| Email | Resend | 3K/month |
| WhatsApp | Meta Cloud API | 1K user-init/mo |
| SMS | (skip — costly; rely on email + WhatsApp) | — |
| Push | FCM | unlimited |
| Cron | GitHub Actions | 2000 min/mo |
| Analytics | PostHog cloud | 1M events/mo |
| Analytics 2 | Cloudflare Web Analytics | unlimited |
| Errors | Sentry | 5K events/mo |
| Search | Algolia free | 10K records, 10K ops |
| AI | Groq (Llama 3.3 70B) | 14K req/day free |
| AI embed | Cohere | 100 req/min free |
| Maps | Mapbox | 50K loads/mo |
| Payment | Razorpay | live (% on txn only) |
| Payment USD | Stripe | live |
| Captcha | Cloudflare Turnstile | $0 |
| Image gen | Bing Create (DALL-E 3) | 25/day |
| Video host | YouTube | $0 |
| Live stream | YouTube Live + Cloudflare Stream free tier | $0 base |
| Social schedule | Buffer free | 10 scheduled |
| Heat-map | Microsoft Clarity | unlimited |
| Press | HARO + Qwoted | free |

**Total monthly fixed cost**: $0. Variable: Razorpay 2% on revenue, Stripe 2.9% on USD, FX on USD payouts.

---

## 8. Onboarding playbook per role (drip wired into agent)

See latest `docs/agent-reports/*-onboarding-drip.md`. Summary:

- **Devotee**: 7-touch over 30 days. Day 0 welcome → Day 30 NPS.
- **Pandit**: 5-touch over 14 days. Aadhaar push on day 1.
- **Temple**: 3-touch over 7 days. Live darshan setup is the unlock.
- **Gaushala**: 2-touch. Adopt-a-cow tier converts at 8%.
- **Astrologer**: 1-touch. Lowest-friction supply.
- **Store owner**: 1-touch. 10 SKU starter recipe.
- **Wellness**: 1-touch. Class formats + pricing tiers.

All sequences auto-send via `outreach-cron.ts` once Resend DNS is verified.

---

## 9. SEO content strategy (executed by content + SEO agents)

**Pillar pages** (need 5K-10K words each, evergreen):
- /sanatan — comprehensive Sanatan Dharma overview
- /ved — 4 Vedas + Upanishads + Vedanga
- /sanskrit — language history + learning path + free lessons
- /pujas — comprehensive puja types catalogue
- /temples — top temples of India, region-by-region
- /gurukuls — modern gurukul guide for parents
- /nri-pujas — NRI-specific guide (high commercial intent)

**Cluster pages** (1500 words each, daily content agent suggests):
- Deity-of-day articles (7 weekly)
- Vrata + ekadashi guides
- Festival calendars + significance
- Specific puja walk-throughs (Mahamrityunjaya, Sri Suktam, Sundara Kanda)
- Sanskrit shloka explanations

**Indexing strategy**:
- Submit each new URL to GSC Indexing API immediately
- Internal-link from pillar → cluster aggressively (5 links per cluster article)
- Schema.org markup on every page (Article, FAQPage, BreadcrumbList)
- Open Graph tags on every page (social-share friendliness)

**Target by day 90**: 100 indexed pages, 5K organic clicks/month, 3 keywords in top 10.

---

## 10. Hard rules (do not break)

1. Never compromise video proof — it is the trust unlock
2. NRI pricing is non-negotiable 9-10x — anchor the annual plan
3. KYC before payout, no exceptions
4. Don't pay for traffic that isn't measured (CAC tracked per channel)
5. Don't ship a feature that has no metric tied to it
6. Ship daily, even if it's a typo fix — momentum compounds
7. Talk to 5 users every week — phone or WhatsApp call
8. Public weekly update on Twitter/LinkedIn — numbers + learning + ask
9. Reply to every email/DM within 24h — small enough team that this is feasible
10. Don't raise from any VC who won't take a 30-min call before issuing term sheet

---

## 11. The week-1 immediate execution list

(Copy-paste into TASKS.md as W1 sprint)

- [ ] Verify GSC + Bing Webmaster + submit sitemap.xml
- [ ] Wire PostHog into web layout (lib/posthog.ts + Provider)
- [ ] Wire PostHog into mobile (_layout.tsx Provider)
- [ ] Add OG image + meta on each pillar page (use SEO agent report to find gaps)
- [ ] Create @darshya_app handle on Twitter, LinkedIn, Instagram, YouTube
- [ ] Buffer free signup + schedule first 21 posts from social-queue agent
- [ ] Set GH secrets: API_BASE_URL, WEB_BASE_URL, CRON_AUTH_TOKEN, RESEND_API_KEY (when ready)
- [ ] Trigger first agent run manually: Actions → Agent fleet — daily → Run workflow
- [ ] Personal outreach: 10 cold WhatsApp messages to temples in Varanasi
- [ ] Founder tweet: "Day 1 of building Darshya in public" + 3 numbers
- [ ] Apply: Stellaris Founders Forge, Antler India, AngelList Country syndicates

---

## 12. North-star metric

**Weekly active devotees who completed at least one of: booked puja / watched darshan / made donation / completed a Sanskrit lesson.**

Target by day 30: 200. Day 60: 2,000. Day 90: 10,000.

This is the single number every agent's report ladders up to. If it's not growing 20%+ week-over-week, the next agent run flags it.

---

*Owner: founder · Generated: 2026-05-27 · Refresh cadence: monthly · Next review: 2026-06-27*
