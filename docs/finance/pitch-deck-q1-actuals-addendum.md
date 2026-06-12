# Pitch Deck Q1-Actuals Addendum — v2 traction slides

> **Roadmap item**: R-Q2-M-002 (P0) · **Authored**: 2026-06-12 · **Companion to**: R-Q2-F-001 deck outline (already shipped at docs/finance/pitch-deck-v2-outline.md)
>
> **Purpose**: when Q1 closes (Sep 2026), founder updates pitch-deck slide 6 (Traction) + slide 7 (Business Model) w/ REAL Q1 actuals. This doc is the template + instructions for that update.

## When to update

End of Q1 (Sep 2026) — after 3 full months of data. Updating with cherry-picked early numbers reads weak; let 3-month sample size land first.

## Slide 6 (Traction) — Q1-actuals update

Replace the current "Built last 4 weeks" framing w/ "Q1 actuals" framing:

```
Q1 2026 traction (3 months):

USERS
- Monthly Active Users (MAU): {fill from PostHog Q1 month-3 number}
- Total signups Q1: {fill}
- Top 3 acquisition channels: {fill from PostHog by ref-source segmentation}

REVENUE
- Total Q1 GMV (Gross Merchandise Value): ₹{fill}
- Bhaktisetu platform fee Q1: ₹{fill}
- Q1 MRR end-of-quarter: ₹{fill}
- Q1-end revenue lane breakdown:
  L1 Puja bookings: ₹{fill} MRR
  L2 Adopt-a-Temple subs: ₹{fill} MRR
  L3 CSR match: ₹{fill} MRR
  L4 B2B SaaS: ₹{fill} MRR
  L5 Affiliate: ₹{fill} MRR

SUPPLY
- Verified temples onboarded: {fill}
- Verified pandits onboarded: {fill}
- Verified astrologers onboarded: {fill}
- Active gaushala partnerships: {fill}

RETENTION
- Day-30 retention: {fill}%
- Day-60 retention: {fill}%
- Day-90 retention: {fill}%
- Top quartile cohort: {fill}% Day-30 (the most loyal segment to characterize)

OPERATIONAL
- Free-tier monthly cost: ₹0 (verify still true)
- Founder hours/week: {fill}
- Total commits to main: {fill from git log}
- Test coverage: {fill}/{fill} (e.g. 54/54 GREEN — current session math)
- Cycle health: {fill}% green orchestrator cycles in Q1
```

## Slide 7 (Business Model) — Q1-actuals validation update

Update "Q2 target ₹5L MRR / Q4 target ₹12.5L MRR" w/ Q1 trajectory check:

```
Q1 trajectory:

Linear-to-target run rate at Q1-end: ₹{fill} MRR
On track for Q2 target ₹5L? [YES / NO + delta if NO]

Lane sensitivity:
- L1 Pujas: tracking at {X}% of Q1-target lane → projected Q2 {Y}% on target
- L2 Subs: tracking at {X}% → projected {Y}%
- L3 CSR: tracking at {X}% → projected {Y}%
- L4 B2B SaaS: tracking at {X}% → projected {Y}%
- L5 Affiliate: tracking at {X}% → projected {Y}%

Q1 mistakes + recoveries:
- {1-2 sentences on what we learned, candid}

Q2 forecast adjustment:
- {if behind, adjust Q2 target down + explain trigger for raising}
- {if ahead, adjust Q2 target up + explain confidence}
```

## Additional Q1-actuals talking points (during investor call)

Pre-prep:

**1. Customer testimonials (3-5 quotes)**
```
"{verbatim quote from devotee/temple TP/pandit/donor}" — {Name}, {city}, {role}
```

Source: docs/agent-reports/user-interviews.md once 5 interviews land (R-Q1-CS-003).

**2. The viral moment (if any)**
```
Q1 organic moment: {one event like Ganesh Chaturthi Aug 26 live darshan / Founder tweet that
went mini-viral / journalist mention / influencer organic mention / etc.}
Impact: {X new signups / Y press mentions / Z back-channel intros}
```

**3. Cohort retention chart** (data → screenshot from PostHog):

Show Day-0/7/30/60/90 retention by weekly cohort. Pre-seed investors love seeing >40% Day-30 in any cohort.

**4. Unit economics live numbers** (replace projected in F-001 deck Slide 8):

```
ACTUAL Q1 per-puja contribution: ₹{fill — should be close to ₹61 estimate)
ACTUAL Q1 LTV (India): ₹{fill}
ACTUAL Q1 LTV (NRI): ₹{fill if any NRI bookings — note "early small-N if pre-NRI launch"}
ACTUAL Q1 CAC: ₹{fill — should be very low given organic-only channels}
ACTUAL Q1 LTV/CAC: {ratio}
```

**5. Supply-side wins to call out**

```
Bengaluru deep-dive (per G-008 city-focus decision):
- {N} temples live-listed (target was 10)
- {N} pandits onboarded (target was 30)
- {Y/N} CSR partner signed
- {Y/N} 1 viral festival moment captured
```

## Investor Q&A prep

Likely questions + recommended answers (founder fills w/ Q1 specifics):

1. "Why no marketing spend?"
   → "Organic-only thesis: build-in-public + warm-network. We'll measure CAC; if ratio is good, we'll start paid. Premature optimization on CAC kills startups."

2. "Why solo founder still?"
   → "First hire (CS associate) when MRR hits ₹1L. Currently building infra so when CS hires, they have systems to plug into vs greenfield."

3. "Bangalore-ISKCON dispute — exposure?"
   → "We treat Bangalore-ISKCON as separate entity. Transparent. Pilot scope-limited until central ISKCON conversation matures (12+ months)."

4. "What kills this?"
   → "5 tripwires defined in docs/roadmap/_tripwires-global.yml — NRI D30 retention <25%, NRI CAC >$40, NRI:domestic ratio <1:3, Sri Mandir launches USD tier, regulatory shift on devotional payments. We fold to NRI-only if 2 tripwires hit same week."

5. "What's your Series A ask?"
   → "Bringing ARR to ₹3 Cr by FY27-end at break-even unit econ + 40%+ Day-30 retention. Series A 18-24 months out."

## Founder action

```markdown
- [ ] At Q1-end (Sep 2026): pull actual numbers from PostHog + Razorpay dashboard + admin/roadmap
- [ ] Fill {} placeholders in Slide 6 + Slide 7 above
- [ ] Update pitch-deck-v2 Figma slides 6 + 7 w/ actuals
- [ ] Pre-call: rehearse 5 Q&A above
- [ ] Investor pipeline tracker: docs/finance/investor-pipeline-2026-06.md (founder fills as outreach happens per F-001 §Investor target list)
- [ ] Aim 10 first-meetings → 2-3 second-meetings → 1 term-sheet by end Q2
```

## Out of scope

- Full new deck (F-001 already shipped 12-slide outline)
- 12-month financial model update (already in F-001 — refresh w/ Q1 actuals)
- Data-room compile (post-term-sheet activity)
- Cap table (post-funding only)
- Term-sheet negotiation strategy (separate ticket once first VC offer lands)

## Closes

R-Q2-M-002 — addendum shipped. Status flips to shipped after Q1-end fill + first investor meeting scheduled w/ Q1-actuals deck.
