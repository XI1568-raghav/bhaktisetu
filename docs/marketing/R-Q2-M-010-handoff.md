# R-Q2-M-010 — Press cycle 2 — Founder execution handoff

> Roadmap item: R-Q2-M-010 (P2) · Branch: marketing/R-Q2-M-010-batch-2026-06-15-r4
> Companion spec: `docs/marketing/press-cycle-2-q2-spec.md` (strategy + outlets + week-by-week sequence)
> Status: scaffold shipped (templates + tracker), KPI `press_pitches_sent: 3` requires founder action

## What's shipped here

- 3 reporter-specific pitch email templates (Economic Times / LiveMint / Mint)
- UTM convention + per-reporter tracking links
- Founder action checklist with explicit `[VERIFY-FOUNDER]` tokens for anything that cannot be fabricated
- Tracking ledger header for KPI rollup

## What this handoff does NOT do

- Send pitches. Pitches must go out from a real founder email under founder's own name. Do NOT use any agent service account.
- Fabricate journalist contact info. Templates assume founder confirms current beat / email for each reporter via the publication's masthead before sending.
- Fabricate founder quotes. All `[VERIFY-FOUNDER]` placeholders must be filled by the founder with their own words.
- Auto-flip status to `shipped`. KPI (3 pitches sent) requires founder confirmation — keep `in_progress` until ledger has 3 sent rows.

---

## Reporter contact verification checklist (do FIRST)

For each target outlet, founder must:

1. Open the publication's current masthead / about page.
2. Confirm the reporter still covers the named beat.
3. Confirm current email (publications rotate `firstname.lastname@` patterns).
4. Note any "do not pitch by email" disclaimers — some now require web form.

| Outlet | Suggested reporter | Beat fit | Founder confirms email | Founder confirms beat |
|---|---|---|---|---|
| Economic Times | Aditya Kalra | Religious tech / startups | [VERIFY-FOUNDER]@economictimes.indiatimes.com | [ ] yes [ ] swap reporter |
| LiveMint | Sneha Saha | Founder profiles / consumer apps | [VERIFY-FOUNDER]@livemint.com | [ ] yes [ ] swap reporter |
| Mint | Nitin Sreedhar | India consumer / NRI | [VERIFY-FOUNDER]@livemint.com | [ ] yes [ ] swap reporter |

If a named reporter has moved publications, founder picks closest current-beat replacement on same masthead before sending.

---

## UTM tracking convention

All press-coverage outbound links use:

```
utm_source=press
utm_medium=editorial
utm_campaign=press-cycle-2
utm_content=<outlet-slug>
```

| Outlet | utm_content | Landing URL |
|---|---|---|
| Economic Times | `et` | https://darshya.online/?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=et |
| LiveMint | `livemint` | https://darshya.online/?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=livemint |
| Mint | `mint` | https://darshya.online/?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=mint |

PostHog funnel filter: `properties.utm_campaign = "press-cycle-2"` → groups by `utm_content`.

---

## Pitch email template 1 — Economic Times (Aditya Kalra angle)

**Subject:** Bootstrap founder takes on Sri Mandir with video-proof puja booking — 5K MAU in 90 days

```
Hi Aditya,

I'm [VERIFY-FOUNDER name], founder of Darshya (darshya.online) — a devotional super-app
that hit 5K monthly actives 90 days after launch on a ₹0 marketing budget.

Why I think your readers care:

1. Competitive angle vs Sri Mandir / AppsForBharat — we ship video proof of every puja
   to the devotee, gated against priest payout. Sri Mandir doesn't.
2. Bootstrap unit economics — [VERIFY-FOUNDER blended CAC] vs Sri Mandir's reported
   paid-acquisition burn. Numbers I can share under embargo.
3. Founder story — [VERIFY-FOUNDER one-sentence founder origin].

I have a press kit (8 pages) + 3 case-study temples + a 30-min phone window any day
this week. Embargo 7 days, coordinated publish 14:00 IST.

Press kit: https://darshya.online/press?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=et

Worth a 15-min call?

[VERIFY-FOUNDER name]
[VERIFY-FOUNDER phone — direct dial, not switchboard]
[VERIFY-FOUNDER email]
```

Founder fills 5 `[VERIFY-FOUNDER]` tokens before sending. Do not auto-substitute.

---

## Pitch email template 2 — LiveMint (Sneha Saha angle)

**Subject:** Bootstrap founder, ₹0 → [VERIFY-FOUNDER MRR figure] in 90 days, devotional category

```
Hi Sneha,

I'm [VERIFY-FOUNDER name], solo founder of Darshya (darshya.online).

I built a devotional super-app — live darshan, puja booking with video proof, NRI
dual-currency checkout — solo, on a ₹0 marketing budget, while [VERIFY-FOUNDER day-job
context — e.g. "still consulting nights" or "between jobs"].

Numbers I can share under embargo:
- MAU at day 90: [VERIFY-FOUNDER]
- MRR: [VERIFY-FOUNDER]
- NRI share of MRR: [VERIFY-FOUNDER]%
- Highest-LTV cohort: [VERIFY-FOUNDER]

The honest part: [VERIFY-FOUNDER pick one — e.g. "I missed two retention tripwires in
month 2 and had to pivot pricing", or "USD signups outran INR 3:1 vs my forecast 1:1"].

Founder-profile fit your beat. Happy to do a 45-min call this week, share screen on
the live dashboard, walk you through what worked and what didn't.

Press kit: https://darshya.online/press?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=livemint

[VERIFY-FOUNDER name]
[VERIFY-FOUNDER phone]
[VERIFY-FOUNDER email]
```

---

## Pitch email template 3 — Mint (Nitin Sreedhar angle)

**Subject:** NRI puja booking unit economics — [VERIFY-FOUNDER NRI MRR figure] from [VERIFY-FOUNDER country count] countries

```
Hi Nitin,

I'm [VERIFY-FOUNDER name], founder of Darshya — devotional super-app with a thesis:
NRI families pay 9-10x domestic for puja bookings when video proof is mandatory.

90 days in, the thesis holds. Sharing under embargo:

- NRI MRR: [VERIFY-FOUNDER]
- Domestic MRR: [VERIFY-FOUNDER]
- NRI:domestic AOV ratio: [VERIFY-FOUNDER]
- Top NRI countries by GMV: [VERIFY-FOUNDER list]
- Retention day-30 NRI vs domestic: [VERIFY-FOUNDER]%

This is the cohort no Indian devotional app has cracked at unit-economics scale —
Sri Mandir is INR-only, Vama is INR-only. We took the wedge.

I have anonymized cohort data, a partner-temple list, and a 30-min phone window
this week. Embargo 7 days, coordinated publish 14:00 IST with ET + LiveMint.

Press kit: https://darshya.online/press?utm_source=press&utm_medium=editorial&utm_campaign=press-cycle-2&utm_content=mint

[VERIFY-FOUNDER name]
[VERIFY-FOUNDER phone]
[VERIFY-FOUNDER email]
```

---

## Founder action checklist (chronological)

### Week 0 — preflight (founder owns, no agent action)

- [ ] Verify 3 reporter emails + beats on each publication's current masthead
- [ ] Fill every `[VERIFY-FOUNDER]` token in 3 templates above with real founder data
- [ ] Confirm `/press` landing page is live and press kit PDF is downloadable
  (companion spec lists ticket R-Q2-M-010a for kit PDF — verify shipped before W1)
- [ ] Decide which 3 metric figures are share-under-embargo vs share-on-publish
- [ ] Decide founder phone number to publish in pitches (avoid personal mobile if possible)

### Week 1 — outreach

- [ ] Send all 3 pitches BCC to founder@ alias (creates a paper trail)
- [ ] Log each send in `_press-cycle-2-ledger.md` (this repo, this branch)
- [ ] Set 48h reminder per reporter for first follow-up

### Week 2 — briefings

- [ ] If reporter responds yes → schedule 30-min phone briefing
- [ ] If reporter responds no / silent at 48h → send one polite nudge with a new
      data point ("we just crossed X — wanted to update you")
- [ ] If still silent at W2 end → swap to reserve reporter from same masthead

### Week 3 — embargo lift + publish

- [ ] Confirm publish slot 14:00 IST coordinated date with each reporter
- [ ] Stand by during the publish window for fact-check pings
- [ ] Within 1h of publish: founder X-thread + LinkedIn post (drafts in
      companion spec sequence)

### Week 4 — measurement

- [ ] Pull PostHog funnel filter `utm_campaign=press-cycle-2`
- [ ] Compare 30-day organic signups vs baseline (W-2 to W-1 same length)
- [ ] Log final KPI value in the roadmap item — flip `status: shipped` only when
      `press_pitches_sent` actual value reaches target (3)

---

## Tracking ledger (founder appends rows as pitches go out)

See companion file `docs/marketing/_press-cycle-2-ledger.md` — append one row per
pitch event. Validator / KPI scraper reads count of `sent` rows to populate
`current` value on R-Q2-M-010.

## Caveats / risks

- **Do not fabricate metrics.** Every embargo-shared number must match the live
  PostHog / Stripe / Razorpay dashboards on the day the founder sends. Press
  retracts kill future cycles forever.
- **Do not use "Featured in TechCrunch" / "Featured in YourStory" placeholders
  on web copy** until those publications actually publish (Apple Guideline 2.3.7
  rejection grounds carry over to other app stores; same hygiene rule applies
  to web brand pages).
- **Press kit PDF must avoid bundle-bloat** if rendered into apps/web build
  (see `docs/cf-worker-budget.md` 3 MiB limit). Keep PDF on R2 / CF asset
  proxy, not in the Worker bundle.
- **Avoid sending all 3 pitches from the same IP / domain within 60 seconds** —
  triggers spam filters on Times Internet group infra (ET + LiveMint + Mint
  share infra). Stagger 10-15 min apart.
- **DPDP §6 consent for any quoted devotee/customer**: if founder quotes a
  customer in a pitch, get written DPDP §6 consent first. Templates above
  do not include customer quotes for this reason.
- **No NDA with reporters until publish** — standard practice. Embargo
  agreement by email is sufficient at this tier.

## What flips status to `shipped`

Three conditions, all must be true:

1. `_press-cycle-2-ledger.md` shows 3 rows with `state: sent` and verifiable
   founder send-date.
2. KPI scraper reads `press_pitches_sent.current = 3`.
3. Founder edits `docs/roadmap/items/Q2/marketing/010-press-cycle-2-economic-times-livemint-mint-post-ph.md`
   frontmatter: `status: shipped` + `shipped_at: <date>`.

Until all three: status remains `in_progress`. This PR ships scaffold only.
