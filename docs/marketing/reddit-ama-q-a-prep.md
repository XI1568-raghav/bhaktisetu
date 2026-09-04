# r/india AMA — 100 Pre-Answered Questions

> Per R-Q3-M-002. Pre-research likely questions + draft answers. Founder reads + customises live during 90-min AMA.

## Category 1 — Product (15 Qs)

**Q1: How is this different from Sri Mandir?**
A: Sri Mandir is excellent content + basic puja booking. Bhaktisetu adds: 24hr video proof on every puja, dual-currency NRI pricing (USD/GBP/CAD/AUD), 100+ Aadhaar-verified pandits, AI Pandit subscription, antim sanskar specialty product. We're complementary in many ways — they've built the content foundation, we're building the verification + trust layer.

**Q2: How do you verify pandits?**
A: 5+ years experience minimum + Aadhaar + PAN + bank proof + 2 reference video proofs + Sanskrit certification. Each pandit personally vetted by founder for first 100. Now scaling via community recommendations through Brahmin Samajs.

**Q3: What's stopping a pandit from faking the video proof?**
A: GPS metadata on video must match registered temple location. Live timestamp visible. Devotee verifies via 24hr review window. Repeat issues = pandit suspension. So far 0 fraud cases in 100+ pandits.

**Q4: Can I book pujas at specific temples like Tirupati TTD?**
A: We currently partner with verified non-TTD temples. TTD/Tirumala operates its own booking system. We focus on temples where we can offer the verification + video proof guarantee.

**Q5: What does the NRI puja booking flow look like?**
A: Browse /pujas → pick → select tier (basic/premium) → checkout in USD/GBP/CAD/AUD → pandit conducts puja at India temple within 48hr → video proof + 80G receipt via email + WhatsApp.

**Q6: 80G receipts — are they really tax-deductible?**
A: Yes, where applicable (Section 80G of Indian Income Tax Act). PAN of donor required. NRI customers may have limited deductibility depending on country (US no, India NRO yes).

**Q7: What about AI Pandit subscription?**
A: ₹199/mo unlimited Q&A grounded in Sanskrit scripture (Bhagavad Gita + Upanishads + Puranas). Free tier 3 questions/day. Useful for kundli interpretation, ritual guidance, scripture clarification.

**Q8-15:** [More product Qs — pricing tiers, cancellation, refunds, languages, etc.]

## Category 2 — Skeptical (20 Qs)

**Q16: Isn't this commercialising devotion?**
A: Hindu families have always paid pandits for service — that's not new. What we're doing is bringing transparency, verification, and access. A pandit in Kashi doing a Rudrabhishek for a Bengaluru family for ₹3K with video proof is more honest than the current "send ₹2000 to my WhatsApp" model.

**Q17: How does pandit revenue share work? Aren't you exploiting them?**
A: 70-80% of devotee payment goes directly to pandit. 20-30% covers platform + payment processing + Foundation overhead. Weekly Razorpay payout. Compare to traditional middleman networks where pandits often see 30-40%.

**Q18: What about caste discrimination in your pandit network?**
A: Bhaktisetu doesn't filter pandits by caste. We require certification + experience. Smarta, Vaishnav, Shaiva, and tribal traditions all welcome. Devotees can filter by tradition if they have specific preferences (e.g., Gaudiya Vaishnav for Krishna pujas).

**Q19-35:** [More skeptical Qs — revenue cuts, ethics, "anyone can call themselves Hindu", scaling concerns, etc.]

## Category 3 — Investor/Financial (20 Qs)

**Q36: How much have you raised?**
A: $XXX pre-seed just closed. Led by [LEAD], with [angels]. Going toward team + acquisition + infra scale.

**Q37: What's MRR/ARR?**
A: ₹10L MRR currently. On pace for ₹12L ARR. Target ₹1Cr ARR Q1 2027.

**Q38: Unit economics?**
A: Blended CAC ₹150. LTV 6-month ₹1200. LTV:CAC 8x. NRI CAC higher ($20) but LTV 10x higher.

**Q39: Burn rate?**
A: Currently ₹50K/mo solo founder, no team. Post pre-seed scaling to ₹2L/mo with 4 contractors. 18-month runway from pre-seed.

**Q40-55:** [More financial — valuation, market size, competition specifics, exit strategy, etc.]

## Category 4 — Tech (20 Qs)

**Q56: What's the stack?**
A: Next.js 15 + Fastify 5 + Prisma + Postgres on Supabase. Both web and API are hosted on Render (`render.yaml`), with Cloudflare providing DNS + edge proxy only. Expo 50 mobile. *(Corrected 2026-09-02, `OPS-10` — this answer used to say the web tier was hosted on Cloudflare Pages. It has not been since 2026-07-08, and this is a public-facing answer.)*

**Q57: Why so many agents?**
A: 28 daily AI agents handle SEO scraping + content drafting + competitor monitoring + uptime checks + lighthouse reports + investor digest. Solo founder × agent fleet = 10x leverage on $0 budget.

**Q58: What's the AI Pandit model?**
A: Groq llama-3.1-70b w/ RAG against 500K-token curated Sanskrit + Hindi scripture corpus (Bhagavad Gita + Upanishads + Puranas + curated pandit Q&A). Streaming responses w/ scripture citations.

**Q59-75:** [More tech — Sentry tuning, free-tier discipline, MCP servers, A/B testing, etc.]

## Category 5 — Future / Bigger picture (15 Qs)

**Q76: Will you ever IPO?**
A: Possible Year 7-10 if we hit ₹500 Cr ARR. Sri Mandir similar scale post-Series D. But not designed for IPO from day one — Section 8 structure prioritises long-term mission.

**Q77: What's your stance on AI replacing pandits?**
A: AI Pandit complements, doesn't replace. AI for quick Vedic Q&A. Real pandit for actual ritual + ceremony. We invest in both because they serve different needs.

**Q78: Hindu-only forever?**
A: Yes. Founder is unapologetic about the niche. India has 1B+ Hindus globally. That's enough TAM. Not building "spiritual app for everyone."

**Q79-90:** [More future — international expansion, AR/VR future, integrations, partnerships, etc.]

## Category 6 — Personal/founder (10 Qs)

**Q91: Why did you leave TCS?**
A: 14 years in IT services. Family puja booking experience triggered the idea. Quit Sep 2024. Bootstrapped 6 months. Launched March 2025.

**Q92: Family supportive?**
A: Mostly. Mom worried about salary risk initially. Now seeing the impact (50+ aunties booked pujas through me) — pride exceeds the worry.

**Q93-100:** [More personal — funding journey, mentors, hardest moments, day-in-life, etc.]

---

## Live AMA discipline (during 90min)

1. Pin top question + answer first (sets tone)
2. Respond to highest-upvoted comments first
3. Don't dodge hard questions (Q16-35 skeptical category — engage genuinely)
4. Quote tweet best Q&A pairs to amplify
5. Final 5 min: thank-you + bhaktisetu.com link + future updates promise

## Post-AMA

- Blog recap published next day
- Cross-post to r/IndianAmerican + r/india_speaks
- Track signups via UTM (utm_source=reddit_ama)
- Tier-1 angel DMs followed up within 24hr
