# Poojly: 12-Week Go-to-Market Launch Strategy

> From beta to 10,000 DAU in 12 weeks

---

## Executive Summary

This document outlines a phased 12-week launch strategy that takes Poojly from internal beta to a publicly available, revenue-generating devotional super-app with real temple partnerships, a growing NRI user base, and validated unit economics.

**Total Launch Budget:** ₹15-25 Lakhs (pre-Series funding, bootstrapped/angel phase)

---

## Phase 1: Soft Launch (Weeks 1-2)

### Objective
Validate core product flows with 500 controlled beta users. Identify and fix critical bugs before public exposure.

### Deployment

| Component | Platform | Details |
|---|---|---|
| Web App | Vercel | Next.js 15 SSR deployment, custom domain (poojly.com) |
| API Server | Railway | Fastify backend with auto-scaling, connected to Supabase |
| Database | Supabase | PostgreSQL with row-level security, real-time subscriptions enabled |
| CDN | Cloudflare | Asset caching, DDoS protection, SSL |
| Monitoring | Sentry + Vercel Analytics | Error tracking, performance monitoring, user session replay |

### Beta User Recruitment (Target: 500 users)

| Channel | Target | Method |
|---|---|---|
| Personal network | 100 users | Direct WhatsApp invitations to friends, family, and spiritual community members |
| Temple communities | 150 users | Partner with 2-3 local temple WhatsApp groups, offer free puja credits |
| Spiritual Facebook groups | 100 users | Post in 5-10 active Hindu devotional groups with beta signup link |
| Tech community | 50 users | Product Hunt "coming soon" page, Twitter/X announcement |
| NRI connections | 100 users | Reach out to Indian diaspora groups in US, UK, and UAE on WhatsApp and Facebook |

### Key Activities

**Week 1:**
- Deploy production environment (Vercel + Railway + Supabase)
- Configure Razorpay payment gateway (test mode, then live)
- Set up Sentry error tracking and Vercel Analytics
- Onboard beta cohort 1 (250 users) via invite-only access codes
- Daily monitoring of error rates, load times, and user drop-off points
- Set up customer support channel (WhatsApp Business + in-app chat)

**Week 2:**
- Onboard beta cohort 2 (250 users)
- Conduct 20 user interviews (10 domestic, 10 NRI) via video call
- Fix top 10 bugs identified from Week 1
- A/B test onboarding flow (3-step vs. 5-step)
- Validate puja booking flow end-to-end with a real priest (simulated video proof)
- Validate payment flow with real transactions (₹1 test charges)
- Collect NPS scores (target: 40+)

### KPIs

| Metric | Target | Measurement |
|---|---|---|
| Beta signups | 500 | Supabase auth records |
| Day 1 retention | 60%+ | Analytics |
| Puja booking completion rate | 30%+ | Funnel analytics |
| AI chatbot engagement | 40%+ of users try it | Event tracking |
| Critical bugs | <5 unresolved by end of Week 2 | Sentry |
| NPS | 40+ | Post-session survey |
| Average session duration | 5+ minutes | Vercel Analytics |

### Budget: ₹50,000

| Item | Cost |
|---|---|
| Vercel Pro plan | ₹1,700/month |
| Railway hosting | ₹3,000/month |
| Supabase Pro | ₹2,100/month |
| Cloudflare Pro | ₹1,700/month |
| Sentry | ₹0 (free tier) |
| Beta user incentives (free puja credits) | ₹30,000 |
| WhatsApp Business API | ₹5,000 |
| Miscellaneous | ₹6,500 |

---

## Phase 2: Temple Onboarding (Weeks 3-4)

### Objective
Establish live darshan streams from 5 real temples. Transition from simulated content to authentic, live spiritual experiences.

### Temple Partnership Strategy

**Target Temples (First 5):**

| Priority | Temple Type | Location | Why |
|---|---|---|---|
| 1 | Major pilgrimage temple | Varanasi (Kashi Vishwanath area) | Highest NRI demand, brand credibility |
| 2 | Popular city temple | Delhi NCR | Large local user base for testing |
| 3 | South Indian temple | Chennai or Bangalore | Regional diversity, strong devotee base |
| 4 | Regional heritage temple | Rajasthan or Gujarat | Unique content, NRI diaspora from these states |
| 5 | Emerging smart temple | Any metro | Tech-forward management, easy onboarding |

**Partnership Pitch to Temples:**
- Free HD camera and internet setup (we bear the cost)
- Revenue share on all pujas booked through Poojly (temple gets 60-80%)
- Digital donation channel with transparent reporting
- Increased visibility to NRI devotees worldwide
- Monthly analytics dashboard showing viewer counts and engagement

### Hardware Setup Per Temple

| Equipment | Cost per Temple | Details |
|---|---|---|
| HD PTZ camera (1080p) | ₹15,000 | Weatherproof, remote-controllable |
| Backup camera | ₹8,000 | Fixed angle, failover |
| 4G/5G router + SIM | ₹5,000 | Redundant internet (temple WiFi + cellular) |
| UPS backup (4 hours) | ₹4,000 | Power continuity during outages |
| Mounting and installation | ₹3,000 | Professional installation |
| **Total per temple** | **₹35,000** | |
| **5 temples total** | **₹1,75,000** | |

### Key Activities

**Week 3:**
- Visit 5 shortlisted temples with partnership proposal
- Sign MoUs with at least 3 temples (target: all 5)
- Begin hardware procurement and shipping
- Hire 2 temple liaison coordinators (part-time, ₹15,000/month each)
- Set up live streaming infrastructure (media server on Railway, HLS/DASH adaptive streaming)
- Create temple admin dashboard for managing schedules and viewing analytics

**Week 4:**
- Complete hardware installation at first 3 temples
- Test live darshan streams (latency target: <5 seconds)
- Onboard temple priests to the Priest Portal for puja management
- Record first batch of puja video proofs
- Begin installing at remaining 2 temples
- Create social media content from temple setup process (behind-the-scenes)
- Enable real puja bookings with video proof delivery

### KPIs

| Metric | Target | Measurement |
|---|---|---|
| Temples with signed MoUs | 5 | Legal documents |
| Temples with live streams | 3-5 | Stream uptime monitoring |
| Stream uptime | 95%+ | Automated health checks |
| Average stream latency | <5 seconds | Technical monitoring |
| Pujas booked (real) | 50+ | Database records |
| Video proofs delivered | 90%+ of bookings | Delivery tracking |
| Temple satisfaction score | 4/5+ | Partner survey |

### Budget: ₹3,50,000

| Item | Cost |
|---|---|
| Camera + hardware (5 temples) | ₹1,75,000 |
| Temple liaison coordinators (2, one month) | ₹30,000 |
| Travel for temple visits | ₹50,000 |
| Media server scaling (Railway) | ₹15,000 |
| Temple onboarding gifts/goodwill | ₹25,000 |
| Legal (MoU drafting) | ₹30,000 |
| Contingency | ₹25,000 |

---

## Phase 3: Public Launch (Weeks 5-6)

### Objective
Launch publicly on App Store, Play Store, and web. Drive 5,000+ downloads in the first 2 weeks through organic and earned media.

### App Store Launch

**Pre-Launch Checklist:**
- iOS app submitted to App Store review (allow 5-7 days for approval)
- Android app submitted to Google Play (allow 2-3 days)
- App Store Optimization (ASO):
  - Title: "Poojly: Live Darshan, Puja Booking & Spiritual Content"
  - Keywords: darshan, puja, mandir, aarti, Hindu, temple, spiritual, astrology, prasad
  - 6 screenshots per platform showcasing key features
  - 30-second app preview video
  - Localized listings in Hindi and English
- Web app SEO audit and optimization complete

### Launch Day Channels

| Channel | Action | Expected Reach |
|---|---|---|
| **Product Hunt** | Launch post with demo video, founder story | 5,000-15,000 views |
| **Twitter/X** | Thread on "Why we built India's devotional super-app" | 10,000-50,000 impressions |
| **LinkedIn** | Founder post + company page announcement | 5,000-20,000 impressions |
| **Instagram** | Launch reel (30s) + story series + carousel posts | 10,000-30,000 reach |
| **YouTube** | 3-minute product demo video | 2,000-10,000 views |
| **WhatsApp** | Broadcast to beta users asking for shares | 500 direct shares |
| **Reddit** | Posts in r/india, r/hinduism, r/startups | 2,000-10,000 views |
| **Press outreach** | YourStory, Inc42, TechCrunch India, Economic Times | 3-5 articles |

### SEO Strategy

**Target Keywords (Long-tail, high intent):**

| Keyword | Monthly Volume | Difficulty | Page |
|---|---|---|---|
| live darshan online | 50,000+ | Medium | /darshan |
| book puja online | 30,000+ | Medium | /pujas |
| kashi vishwanath live darshan | 20,000+ | Low | /darshan/kashi |
| online astrology consultation | 40,000+ | High | /astrology |
| send prasad online | 10,000+ | Low | /store/prasad |
| cow adoption india | 5,000+ | Low | /gaushala |
| bhagavad gita guidance | 8,000+ | Low | /ask-pandit |

**SEO Actions:**
- Publish 10 blog posts targeting long-tail keywords (temple guides, puja significance, festival calendars)
- Submit XML sitemap to Google Search Console
- Implement structured data (JSON-LD) for all product and temple pages
- Build backlinks through temple directory listings and spiritual blog guest posts

### Social Media Content Calendar (Weeks 5-6)

| Day | Platform | Content Type | Topic |
|---|---|---|---|
| Monday | Instagram + Facebook | Carousel | "5 reasons to book pujas online" |
| Tuesday | Twitter/X | Thread | Temple technology / behind-the-scenes |
| Wednesday | YouTube | Short (60s) | Live darshan highlight reel |
| Thursday | Instagram | Reel | Quick demo of a feature |
| Friday | LinkedIn | Article | Founder story / market insights |
| Saturday | All platforms | Festival post | Upcoming festival awareness |
| Sunday | WhatsApp + Instagram | Story | Morning aarti live snippet |

### KPIs

| Metric | Target | Measurement |
|---|---|---|
| App downloads (combined) | 5,000+ | App Store Connect + Play Console |
| Web visitors (unique) | 15,000+ | Vercel Analytics |
| Product Hunt upvotes | 200+ | Product Hunt dashboard |
| Press articles | 3-5 | Media tracking |
| App Store rating | 4.3+ stars | Store listings |
| Organic search impressions | 50,000+ | Google Search Console |
| Social media followers (total) | 2,000+ | Platform analytics |

### Budget: ₹2,00,000

| Item | Cost |
|---|---|
| App Store developer accounts (Apple + Google) | ₹10,000 |
| Product Hunt promotion (ProductHunt Ship) | ₹0 (free tier) |
| Press outreach and PR | ₹50,000 |
| Social media content creation (designer, one month) | ₹40,000 |
| YouTube video production | ₹20,000 |
| SEO tools (Ahrefs/Semrush, one month) | ₹15,000 |
| Blog content writing (10 posts) | ₹30,000 |
| App Store screenshot and preview design | ₹15,000 |
| Miscellaneous | ₹20,000 |

---

## Phase 4: Growth Campaigns (Weeks 7-8)

### Objective
Accelerate user acquisition to 10,000+ registered users through referral programs, festival-driven campaigns, and targeted paid advertising.

### Referral Program: "Punya Points"

**Mechanics:**
- Every existing user gets a unique referral code
- Referrer earns **50 Punya Points** (₹50 equivalent) for each successful referral
- Referred user earns **25 Punya Points** (₹25 equivalent) on signup
- Punya Points redeemable for: puja bookings, store purchases, Bhakti Pass subscription, prasad delivery
- Bonus: Refer 10 friends, unlock a free puja booking worth ₹500

**Viral Mechanics:**
- One-tap WhatsApp share with personalized message: "I just booked a puja at [Temple] through Poojly. Try it: [link]"
- Post-puja sharing prompt: "Share your puja blessings with family" (auto-generates a shareable card with temple image)
- Leaderboard: Top 10 referrers each month get featured + bonus rewards

**Projected Viral Coefficient:**
- Target: K-factor of 1.3 (each user brings 1.3 new users)
- With 5,000 existing users, this yields 6,500 new users in 2 weeks

### Festival Campaign: Targeted Pushes

| Festival (April-June 2026) | Campaign | Offer |
|---|---|---|
| Akshaya Tritiya | "Book a gold puja for eternal prosperity" | 20% off first puja booking |
| Buddha Purnima | "Wisdom of the ages, one tap away" | Free 7-day Bhakti Pass trial |
| Ganga Dussehra | "Bring the Ganges to your home" | Live Ganga Aarti + free prasad on first order |
| Jagannath Rath Yatra | "Watch the divine chariot live" | Premium darshan free for the day |

### Paid Advertising (Targeted)

**Google Ads:**

| Campaign | Keywords | Daily Budget | Expected CPC | Target |
|---|---|---|---|---|
| Darshan | "live darshan", "temple live stream" | ₹2,000 | ₹5-10 | 200-400 clicks/day |
| Puja Booking | "book puja online", "online havan" | ₹2,000 | ₹8-15 | 130-250 clicks/day |
| Astrology | "talk to astrologer", "kundali online" | ₹1,500 | ₹10-20 | 75-150 clicks/day |
| Brand | "poojly", "devotional app" | ₹500 | ₹2-5 | 100-250 clicks/day |

**Meta Ads (Facebook + Instagram):**

| Audience | Targeting | Daily Budget | Expected CPM |
|---|---|---|---|
| Devotees 25-55 | Interests: Hindu temples, Bhagavad Gita, meditation, yoga, astrology | ₹3,000 | ₹80-150 |
| NRI 30-60 (US/UK) | Indian diaspora + spiritual interests + high income | ₹2,000 | ₹200-400 |
| Temple visitors | Lookalike audience from beta users + temple geo-targeting | ₹2,000 | ₹100-200 |

**YouTube Ads:**

| Format | Targeting | Daily Budget | Expected CPV |
|---|---|---|---|
| 15s non-skip | Spiritual content viewers, aarti/bhajan channels | ₹1,500 | ₹1-3 |
| Discovery ad | Keywords: darshan, puja, mantra | ₹1,000 | ₹2-5 |

### Influencer Partnerships

| Tier | Followers | Count | Cost per Collab | Deliverable |
|---|---|---|---|---|
| Micro (spiritual niche) | 10K-50K | 10 | ₹5,000-15,000 | 1 reel + 2 stories |
| Mid (lifestyle/devotion) | 50K-200K | 3 | ₹25,000-50,000 | 1 dedicated video + stories |
| Macro (if budget allows) | 200K+ | 1 | ₹1,00,000 | Collaborative campaign |

### KPIs

| Metric | Target | Measurement |
|---|---|---|
| Registered users | 10,000+ | Supabase auth |
| DAU | 3,000-5,000 | Analytics |
| Referral signups | 3,000+ (from Punya Points) | Referral tracking |
| Viral coefficient | 1.3+ | Referral analytics |
| Paid CAC (blended) | <₹50 | Ad spend / paid conversions |
| Festival campaign conversions | 500+ puja bookings | Event tracking |
| Revenue (Month 2) | ₹3-5 Lakhs | Payment gateway reports |

### Budget: ₹8,00,000

| Item | Cost |
|---|---|
| Google Ads (2 weeks) | ₹84,000 |
| Meta Ads (2 weeks) | ₹98,000 |
| YouTube Ads (2 weeks) | ₹35,000 |
| Influencer collaborations | ₹2,50,000 |
| Referral program rewards (Punya Points) | ₹1,50,000 |
| Festival campaign creative production | ₹50,000 |
| Performance marketing tools | ₹15,000 |
| Contingency | ₹1,18,000 |

---

## Phase 5: NRI Expansion (Weeks 9-12)

### Objective
Launch dedicated NRI monetization with international payments, timezone-optimized features, and targeted campaigns in the US, UK, and UAE. Achieve 1,000+ NRI paying users.

### International Payment Setup

| Gateway | Market | Features |
|---|---|---|
| **Stripe** | US, UK, Canada, Australia | Credit/debit cards, Apple Pay, Google Pay in USD/GBP/AUD |
| **Razorpay International** | UAE, Singapore, Malaysia | Multi-currency support, UPI for NRI accounts |
| **PayPal** | Global fallback | Familiar to NRIs, buyer protection |

**Pricing Strategy (NRI Tiers):**

| Tier | Monthly Price | Annual Price | Includes |
|---|---|---|---|
| **Bhakti Basic** | $4.99 (₹99 domestic equivalent) | $49.99 | Ad-free darshan, 2 puja credits/month |
| **Bhakti Premium** | $14.99 | $149.99 | Unlimited darshan, 5 puja credits, priority booking, monthly prasad box |
| **Bhakti Family** | $29.99 | $299.99 | Up to 5 members, all Premium features, dedicated astrologer session/month |
| **Bhakti Patron** | $59.99 (₹4,999) | $599.99 | Everything + cow adoption, quarterly temple visit video, VIP priest access |

### NRI-Specific Features

| Feature | Description | Priority |
|---|---|---|
| **Timezone-aware scheduling** | Show aarti times in user's local timezone (EST, PST, GMT, GST) | Week 9 |
| **International prasad delivery** | Partner with logistics for US/UK/UAE prasad shipping (7-14 days) | Week 10 |
| **Family puja gifting** | NRI books a puja as a gift for family in India, family gets video + prasad | Week 9 |
| **Festival reminders (local time)** | Push notifications for festivals adjusted to NRI timezone | Week 10 |
| **USD/GBP/AED pricing display** | Auto-detect currency from IP, show localized pricing | Week 9 |
| **NRI community forum** | Dedicated space for diaspora to share experiences and connect | Week 11 |

### NRI Marketing Channels

**United States (Target: 500 users):**

| Channel | Strategy | Budget |
|---|---|---|
| Facebook/Instagram | Target Indian Americans 30-60, interests: Hindu temples, Diwali, yoga, meditation, Indian grocery stores | ₹1,50,000 |
| YouTube | Pre-roll ads on Indian American channels (Rajshri, T-Series Bhakti, Sadhguru) | ₹75,000 |
| Google Ads | Keywords: "hindu temple near me", "online puja from india", "send prasad to india" | ₹50,000 |
| Community | Partner with 10 US Hindu temples/cultural centers for co-branded promotion | ₹25,000 |
| WhatsApp | NRI WhatsApp group infiltration (Indian community groups in major US cities) | ₹10,000 |

**United Kingdom (Target: 250 users):**

| Channel | Strategy | Budget |
|---|---|---|
| Meta Ads | Target British Indians, Neasden Temple community, Leicester Hindu community | ₹75,000 |
| Google Ads | UK-specific spiritual search terms | ₹30,000 |
| Community | Partner with BAPS Shri Swaminarayan Mandir London, Bhaktivedanta Manor | ₹15,000 |

**UAE (Target: 250 users):**

| Channel | Strategy | Budget |
|---|---|---|
| Meta Ads | Target Indians in Dubai, Abu Dhabi, Sharjah (1M+ Indian population) | ₹50,000 |
| Google Ads | "Indian temple Dubai", "online puja booking" | ₹25,000 |
| Community | Partner with Hindu temples in Dubai, Indian association events | ₹15,000 |

### NRI Content Strategy

| Content Type | Frequency | Platform | Purpose |
|---|---|---|---|
| "Temple of the Week" video | Weekly | YouTube + Instagram | Showcase different temples, create FOMO |
| "NRI Devotee Stories" | Bi-weekly | Instagram Reels + Blog | Social proof from diaspora users |
| Festival live streams | Per festival | All platforms | Real-time connection to home temples |
| "Morning Darshan" daily clips | Daily | Instagram Stories + WhatsApp | Build daily habit, 6 AM IST = evening US time |
| Podcast: "Bridge to the Divine" | Bi-weekly | Spotify + Apple Podcasts | Long-form spiritual content for commuters |

### Key Activities by Week

**Week 9:**
- Integrate Stripe for USD/GBP payments
- Launch NRI subscription tiers
- Deploy timezone-aware features
- Begin US Facebook/Instagram ad campaigns
- Create NRI-specific landing page (poojly.com/nri)

**Week 10:**
- Launch UK and UAE campaigns
- Set up international prasad delivery partnerships (DHL/FedEx for prasad boxes)
- Release family puja gifting feature
- Onboard 5 NRI micro-influencers for testimonial content

**Week 11:**
- Optimize ad campaigns based on Week 9-10 data (cut underperformers, double down on winners)
- Launch NRI community forum
- Host first "Global Aarti" live event (synchronized viewing across timezones)
- Begin podcast production

**Week 12:**
- Analyze full NRI funnel: impression to paid subscription conversion rate
- Compile NRI ARPU data vs. projections
- Create NRI case studies for investor updates
- Plan Month 4-6 NRI scaling strategy
- Prepare seed round metrics package

### KPIs

| Metric | Target | Measurement |
|---|---|---|
| NRI registered users | 1,000+ | Geo-tagged signups |
| NRI paying subscribers | 200+ | Stripe subscription records |
| NRI Monthly ARPU | $40+ (building to $81) | Revenue / NRI subscribers |
| International prasad orders | 100+ | Order tracking |
| NRI referral rate | 2.0+ (higher than domestic) | Referral analytics |
| US app installs | 500+ | App Store Connect (US region) |
| UK app installs | 250+ | App Store Connect (UK region) |
| UAE app installs | 250+ | App Store Connect (UAE region) |
| NRI retention (Day 30) | 40%+ | Cohort analytics |

### Budget: ₹6,00,000

| Item | Cost |
|---|---|
| Meta Ads (US + UK + UAE) | ₹2,75,000 |
| Google Ads (international) | ₹1,05,000 |
| YouTube Ads | ₹75,000 |
| NRI influencer partnerships | ₹50,000 |
| International delivery setup | ₹30,000 |
| Stripe integration and testing | ₹15,000 |
| Podcast production (2 episodes) | ₹20,000 |
| NRI landing page and content | ₹15,000 |
| Contingency | ₹15,000 |

---

## 12-Week Summary Dashboard

### Timeline Overview

```
  WEEK  1   2   3   4   5   6   7   8   9  10  11  12
        |---SOFT LAUNCH---|                              
                    |---TEMPLE ONBOARD--|                 
                                |--PUBLIC LAUNCH-|       
                                        |--GROWTH PUSH--|
                                                |----NRI EXPANSION----|
```

### Cumulative KPI Targets

| Metric | Week 2 | Week 4 | Week 6 | Week 8 | Week 12 |
|---|---|---|---|---|---|
| Registered users | 500 | 1,500 | 6,500 | 12,000 | 15,000+ |
| DAU | 200 | 500 | 2,000 | 5,000 | 8,000-10,000 |
| Temples live | 0 | 3-5 | 5 | 5 | 5 |
| Pujas booked (total) | 10 | 60 | 200 | 700 | 1,500+ |
| Monthly revenue | ₹0 | ₹25,000 | ₹1,50,000 | ₹5,00,000 | ₹10,00,000+ |
| NRI users | 50 | 100 | 300 | 500 | 1,000+ |
| App Store rating | N/A | N/A | 4.3+ | 4.4+ | 4.5+ |

### Total Budget Breakdown

| Phase | Duration | Budget |
|---|---|---|
| Phase 1: Soft Launch | Weeks 1-2 | ₹50,000 |
| Phase 2: Temple Onboarding | Weeks 3-4 | ₹3,50,000 |
| Phase 3: Public Launch | Weeks 5-6 | ₹2,00,000 |
| Phase 4: Growth Campaigns | Weeks 7-8 | ₹8,00,000 |
| Phase 5: NRI Expansion | Weeks 9-12 | ₹6,00,000 |
| **Total** | **12 weeks** | **₹20,00,000 (₹20 Lakhs)** |

### Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Temple partnership delays | Medium | High | Start outreach 2 weeks early, have 10 temples in pipeline for 5 slots |
| App Store rejection | Low | High | Follow Apple/Google guidelines strictly, submit early in Week 3 |
| Low NRI conversion | Medium | Medium | Test pricing aggressively, offer 30-day free trial |
| Live stream technical issues | Medium | High | Redundant cameras + internet per temple, 24/7 monitoring alerts |
| Paid ad CAC higher than projected | Medium | Medium | Allocate 30% of ad budget as reserve, optimize weekly |
| Payment gateway issues | Low | High | Dual gateway setup (Razorpay + Stripe), manual fallback process |

### Success Criteria (End of Week 12)

The launch is considered successful if:

1. **10,000+ DAU** with 30%+ Day-7 retention
2. **₹10 Lakhs+ monthly revenue** from puja bookings, subscriptions, and store sales
3. **5 temples** streaming live darshan with 95%+ uptime
4. **1,000+ NRI users** with $40+ average monthly spend
5. **4.5+ App Store rating** with 200+ reviews
6. **LTV:CAC ratio of 5:1+** validated across user segments
7. **Investor-ready metrics** package compiled for seed round conversations

---

## Post-Launch: Month 4+ Preview

Upon successful completion of the 12-week launch:

- **Month 4-6:** Scale to 50 temples, launch Bhakti Pass subscription, target ₹50L/month revenue
- **Month 7-9:** Series A preparation, 100K users, NRI expansion to Canada/Australia/Singapore
- **Month 10-12:** Creator fund launch, regional language expansion, ₹1Cr/month revenue milestone

---

*This document is a living strategy. Review and adjust weekly based on actual performance data.*
