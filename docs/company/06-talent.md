# 06 — Talent: A Solo Founder's Capacity Plan

Author: Head of Talent (which is also the founder, which is also me)
Date: 2026-04-27
Reality: 1 person, $0 hiring budget, 6-month runway of sweat.

This is not an org chart. It is a triage plan.

## 1. The brutal time math

A two-sided spiritual marketplace has five non-negotiable workstreams. Hours/week, honestly:

| Workstream | At 100 users | At 1,000 users |
|---|---|---|
| Supply moderation (priest KYC, listing review, fraud) | 4 | 18 |
| Customer support (refunds, "my pooja didn't happen", WhatsApp) | 3 | 20 |
| Content (livestream curation, festival calendar, blog/SEO) | 5 | 12 |
| Product + engineering (code, bugs, releases, infra) | 30 | 28 |
| Ops + growth (payments reconcile, analytics, marketing, partnerships) | 8 | 14 |
| **Total** | **50** | **92** |

A 60-hour week is the ceiling I'll admit to. At 100 users I am 10 hours under and brittle. At 1,000 users I am 32 hours **over** and the marketplace will eat me. The breaking point is roughly 400-500 active users — that's where unbundling stops being optional.

## 2. What MUST stay solo for the first 6 months

**Code, security calls, money decisions.** Every line of payment, auth, and KYC code touches my Razorpay merchant account, RBI-classified user data, and the founder's personal liability under the Packer Speed proprietorship. A contractor making a careless commit that exposes Aadhaar fragments or breaks a webhook signature check is a regulatory problem I cannot delegate. Until there is a co-founder with equity skin, the production deploy key, the Razorpay dashboard password, and the Firebase service account stay on one laptop.

Money decisions — refund policy, priest payout terms, take-rate changes, anything that touches the unit economics — also stay solo. Not because I'm precious, but because at this stage these decisions are the product. A support contractor approving a ₹5,000 refund without context can wipe a week of margin. The rule for the first 6 months: anyone external can *recommend*, the founder *decides*.

## 3. What can be unbundled cheaply

| Role | Where to source | Rate | Hours/wk |
|---|---|---|---|
| Priest verification reviewer | Internshala intern, Sanskrit / religious-studies grad from BHU, Tirupati Univ, or Somaiya | ₹8,000–₹12,000/mo `[ASSUMPTION — Internshala 2025 listings show ₹6-15K range for content interns]` | 10–15 |
| Darshan livestream curator | Volunteer pool: r/hinduism, r/IndiaSpeaks, Telegram bhakti channels | ₹0 + temple-visit reimbursement `[ASSUMPTION]` | 5–8 |
| Tier-1 customer support | Part-time via WorkIndia or Apna; Hindi+English+one South Indian language | ₹15,000–₹20,000/mo for 4hr/day `[ASSUMPTION — Apna 2024 BPO listings]` | 20 |
| Content / SEO writer | Upwork India or Refrens, devotional-content niche | ₹500–₹1,500 per 1,000-word post `[VERIFIED — public Upwork rates]` | per-piece |

The moderation panel itself is product work I build once and stays solo: a Retool or custom Next.js admin app that lets a non-engineer approve/reject with two clicks and an audit log.

## 4. AI as force-multiplier — halving each role

- **Priest verifier** — Claude reads the priest's uploaded credentials (gurukul certificate, ID, sample puja video transcript via Whisper) and produces a 5-line risk summary + flag list. The intern reviews the summary, not raw documents. ~50% time saved.
- **Livestream curator** — GPT-4o-mini watches the temple feed at 1 frame/30s, classifies aarti / crowd / silent, and auto-clips highlights. Volunteer only picks the thumbnail and writes the caption.
- **Customer support** — Claude drafts every reply in the support inbox using the refund-policy doc as a system prompt; agent edits and sends. Cuts handle time from 6 min to 2 min per ticket.
- **Content writer** — Claude generates a festival calendar + 3 outline drafts per week from the panchang API; writer only does the human storytelling pass. Output triples per ₹1,000 spent.

## 5. First hire — when and who

**Trigger metrics (any one fires):**
- 50 paying bookings/week sustained 3 weeks, OR
- support inbox first-response time > 2 hours for 5 consecutive days, OR
- founder is doing >15 hrs/wk on moderation.

**First hire: Operations Associate (contractor, not FT).**
- JD: Triage support inbox, run priest verification queue against AI summaries, weekly content scheduling, payments reconciliation in Razorpay dashboard.
- Hindi + English mandatory; basic Sheets; no code.
- Contract: 6-month renewable, 4 hrs/day, ₹25,000/mo `[ASSUMPTION — anchored to Apna/Internshala part-time ops listings]`. Contractor not FT — no PF, no notice-period drag, founder cash conservation.
- NOT a "head of ops." A pair of hands. The founder still decides.

## 6. Burnout tripwires

1. **Sleep < 6 hrs for 5 nights running** → mandatory 36-hour off-laptop reset; push every non-urgent ticket to a canned "back in 24h" reply.
2. **Code commits < 1/day for 4 weekdays** AND open tickets rising → I am underwater on ops, not lazy. Trigger the first hire even if metrics in §5 haven't fully fired.
3. **Unread support tickets > 30** → switch to support-only mode for one full day; ship nothing; clear the queue; write the canned-reply macros that should have existed.

## Confidence

Medium-low on the rates. I'd tighten with: 2026 Internshala India intern-rate scrape for religious-studies roles; Apna/WorkIndia listings for part-time bilingual support agents in Bengaluru/Pune; Upwork India devotional-content writer rate medians; AmbitionBox / Glassdoor data on Operations Associate contractor rates at sub-₹2cr-revenue startups. The hour estimates in §1 are anchored to my own time-tracking from the last 30 days, which makes the 100-user column reliable and the 1,000-user column a forward-projection that probably underestimates support by 20–30%.
