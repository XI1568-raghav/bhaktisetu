# R-Q2-G-007 — WhatsApp Diaspora Groups Seed Strategy

**Status:** in_progress (founder-action required — Bhaktisetu has no WhatsApp Business API integration shipped, group seeding is a personal/community-led activity)
**Category:** geo
**Priority:** P1
**Target metric:** 10 NRI WhatsApp groups seeded across Bay Area + NJ + London corridors

---

## Why this matters

NRI WhatsApp groups are the **#1 organic acquisition channel** for India-origin diaspora communities. Sri Mandir, Utsav, AppsForBharat all bootstrapped first 10K users through temple-community WA groups, NOT paid ads. Cost per acquired NRI through WA seeding: ~$0. CAC via Meta ads: $25-40.

**Three corridors chosen** (per year-1 plan + diaspora demographic data):

| Corridor | Indian diaspora size | Why prioritized |
|---|---|---|
| Bay Area (SF + South Bay) | ~700K | Highest disposable income, tech-employed, weekly puja propensity high |
| New Jersey + NY metro | ~600K | Oldest Indian-American cluster, multi-generational, gift-puja for India parents top use case |
| London (Greater) | ~500K | Strongest UK Hindu temple density (BAPS Neasden, Shree Sanatan Mandir Wembley), £ pricing tier ready |

**Target: 3-4 groups per corridor = 10 total.**

---

## Seed group recruitment playbook

### Step 1 — Identify natural anchor communities (DO BEFORE creating any group)

NEVER spam-create groups. Anchor each group on an **existing real community** the founder is already in or can be introduced to:

**Bay Area candidates:**
- Bay Area Tamil Sangam (~5K members, active WA broadcast list exists)
- Sunnyvale Hindu Temple devotee list
- BAPS Mountain View youth group parents
- Telugu Association of Bay Area (TABA)
- Marathi Mandal Bay Area

**NJ + NY candidates:**
- BAPS Robbinsville devotee list (the largest mandir outside India)
- Edison Indian Cultural Association
- Princeton ISKCON congregation
- Long Island Hindu Temple
- Garden State Bengali Association

**London candidates:**
- BAPS Neasden weekend-school parents
- Shree Sanatan Mandir Wembley youth wing
- ISKCON London Soho House
- Hindu Council of UK volunteer list
- Tamil Hindu Association UK

### Step 2 — Approach community organizer FIRST (NOT cold-start a group)

Founder reaches out to community organizer (NOT cold messages individual members) using this template:

```
Namaste {organizer_name},

I'm {founder_name}, founder of Bhaktisetu (https://darshya.online) —
we help Indian-origin families overseas book real-time live darshan,
book pujas at verified temples with video proof, and consult vetted
pandits / astrologers. We're already serving ~{N} users across India.

For our US/UK launch, we'd love to support {community_name} with:
- Free first puja for 10 members (₹0, normally $35-50)
- A weekly "ask a pandit" Q&A thread (founder personally moderates first month)
- Group panchang/festival reminders via our WA broadcast (opt-in, no marketing)

If this resonates, would you be open to a 15-min call to discuss?
We're NOT asking to spam your list — we'd love your guidance on
the right way to introduce this to your members.

Thanks for considering,
{founder_name}
```

### Step 3 — Group format (once organizer gives nod)

**Option A — Co-branded broadcast list** (preferred for first 3 corridors):
- Organizer remains admin, founder is co-admin
- Members opt-in via short Google form (collects: name, city, primary deity, gift-puja interest yes/no)
- Founder posts 2x/week max: 1 panchang/festival reminder + 1 pandit Q&A response
- NO promotional posts in first 8 weeks. Pure value.

**Option B — Festival-specific group** (preferred for 4th group in each corridor):
- "Bay Area Diwali 2026 Puja Coordination"
- Time-bounded (lifecycle: 6 weeks pre-festival → 1 week post)
- Founder seeds with 5 verified Bay Area Indian-American families
- Members self-invite cousins, in-laws, friends doing same festival
- Conversion: 3-5 group orders per festival per group typical

---

## Tracking — manual KPI source

Since WA seeding is offline activity, KPI source is **manual founder log**, NOT automated scrape.

**Tracking sheet schema** (Google Sheet or Notion DB, founder maintains weekly):

| corridor | group_name | seeded_at | organizer | admin_emails | member_count | weekly_active_msgs | bhaktisetu_referrals | first_booking_at | notes |
|---|---|---|---|---|---|---|---|---|---|

**Sub-KPIs to track per group:**
1. Member growth (weekly delta)
2. Weekly active conversation count (proxy for stickiness — dead groups don't convert)
3. UTM-tagged referrals to darshya.online (use per-group UTM tag like `?utm_source=wa_baps_robbinsville`)
4. First booking by any member (acquisition validation)
5. Cumulative GMV from group members (revenue validation)

---

## Bhaktisetu side — what platform already supports (zero new dev needed)

- ✅ Per-source UTM tracking via PostHog (already wired)
- ✅ NRI USD pricing tier (already shipped P2)
- ✅ Gift-puja flow with NRI sender → recipient WhatsApp delivery (shipped P16)
- ✅ /nri landing page with hreflang for SEO (shipped P19/P20)
- ✅ Free first-puja coupon code system (uses existing Razorpay/Stripe coupon)
- ✅ Founder personal WhatsApp number for "Ask Pandit" (env-or-noop on org wa.me)

## Bhaktisetu side — what's needed but NOT in scope of this item

- ⏳ WhatsApp Business API integration (Meta verification + cloud API, 4-6 week founder action gate U7)
- ⏳ Per-group analytics dashboard (would need API integration first)
- ⏳ Automated broadcast scheduler (would need WA Business API first)

These are tracked under separate roadmap items + U7 activation gate. Group seeding can begin TODAY without them.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Group organizer perceives outreach as spam | Always offer free value FIRST, never lead with "promote our app" |
| Members report Bhaktisetu, Meta flags account | NEVER mass-message. Always opt-in. Always provide unsubscribe. |
| Group becomes promotional dumping ground | Founder personally moderates first 8 weeks, hard limit 2 posts/week |
| Competitor (Sri Mandir / Utsav) joins group + scrapes | Accept as cost of doing business. Differentiate via service quality + community trust. |
| Time-zone fatigue (founder solo) | Schedule posts via WA scheduler (third-party), but DM responses always real-time during IST evening = US morning window |

---

## Success criteria (for this item to flip to status=shipped)

ALL of:
1. ≥10 active WhatsApp groups seeded across Bay Area (3-4) + NJ (3-4) + London (2-3)
2. ≥500 cumulative unique members across all 10 groups
3. ≥50 darshya.online sessions/week attributable to group UTMs (per PostHog)
4. ≥5 first-bookings sourced from group members (any corridor)
5. Tracking sheet populated weekly for ≥4 consecutive weeks

**Estimated calendar time:** 8-12 weeks of consistent founder outreach (3-4 hrs/week).

**Estimated direct cost:** $0 (organic). $200-500 if founder chooses to subsidize 10 free pujas per group for early traction.

---

## What was scaffolded in this PR

1. This handoff doc (recruitment playbook + templates + tracking schema + risk register)
2. KPI roadmap item `status` remains `in_progress` (NOT auto-flipped to shipped — KPI source is `manual` founder log, not platform metric)
3. Platform integrations needed (WA Business API per U7) tracked separately

## Founder action required to actually ship

1. Identify 1 organizer per target community (15 candidate communities listed above → aim for 10 conversions)
2. Send outreach template (above) to each organizer
3. Schedule 15-min intro calls
4. Co-create first 10 groups over 8-12 week window
5. Maintain manual tracking sheet weekly
6. Update KPI `current` value in `docs/roadmap/items/Q2/geo/007-*.md` as groups go live

---

## References

- Year-1 content sprint (bulk-import 2026-06-09)
- Activation gate U7 (WhatsApp Business API Meta verification) — `docs/activation-gates.md`
- /nri landing page — `apps/web/app/nri/page.tsx`
- Gift puja flow — `apps/api/src/routes/gift-puja.ts` (NRI sender USD → recipient WA delivery)
- PostHog UTM tracking — already wired site-wide
- Per-corridor diaspora data — US Census 2020 ACS 1-year + UK ONS 2021 Census
