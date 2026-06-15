# R-Q4-M-011 — Year-end devotee retention: Karwa Chauth + Diwali + Tulsi Vivah triple-cycle

> Status: handoff scaffold (spec was placeholder, populated this cycle).
> Category: marketing · Priority: P1 · Est: 28h · KPI: D30 retention 38%.
> Owner role: CMO. KPI requires real campaign send + post-festival D30 measurement — NOT auto-shippable. Status remains in_progress.

## Why this matters

Q4 holds the three highest-emotion Hindu festivals back-to-back inside a ~30-day window:

| Festival | Cycle 2026 (tentative) | Audience anchor |
|---|---|---|
| Karwa Chauth | 2026-10-29 (Thu) | Married women, evening moon-sighting puja, husband longevity vrat |
| Diwali (Lakshmi Puja main day) | 2026-11-08 (Sun) | Pan-Hindu, gift-puja gateway for NRI lane |
| Tulsi Vivah | 2026-11-22 (Sun) | Married women + Vaishnava devotees, marks wedding-season open |

A devotee who completes ≥1 booking on Karwa Chauth has a natural re-engagement vector on Diwali (10 days later) and Tulsi Vivah (14 days later). Triple-cycle nudge design is the highest-leverage D30 retention lever in the calendar.

Target: **38% D30 retention** for cohort = devotees who booked or watched a livestream during Karwa Chauth week (window: cycle_start - 3d → cycle_start + 1d).

## Triple-cycle nudge architecture

```
T-7   T-3   T-1   T   T+1   T+3   T+7   T+14
 │     │     │    │   │     │     │     │
 │     │     │    │   │     │     │     └─ next-festival teaser
 │     │     │    │   │     │     └─ thank-you + reflection
 │     │     │    │   │     └─ video-proof reminder if not viewed
 │     │     │    │   └─ post-puja gratitude (sender only)
 │     │     │    └─ day-of muhurat + livestream link
 │     │     └─ 24h reminder + checklist
 │     └─ 72h reminder + recipient confirm (NRI gift lane)
 └─ 7-day awareness + sankalp builder + temple shortlist
```

Per-cycle, each touchpoint fires on **WhatsApp primary** (already cleared per `docs/free-tier-budgets.md` ≤700/mo cap) with **Resend email fallback** (≤50/day, doc cap).

## Audience segmentation

| Segment | Triggers | Nudge variant |
|---|---|---|
| A — booked KC | KC booking confirmed | Diwali pre-bundle 15% off (gift to family) |
| B — watched KC livestream, not booked | Livestream session ≥3 min | Diwali "first puja free upgrade" offer |
| C — NRI gift sender | Country ≠ IN AND >$0 spent in last 60d | Diwali gift-puja w/ recipient WA delivery |
| D — dormant (no event 30d+) | Last_event_at < cycle_start - 30d | Light re-onboard: "Karwa Chauth muhurat tonight" |
| E — net-new (signup in cycle window) | Created ≥ cycle_start - 14d | Soft-intro: 3-cycle education sequence |

Segments are **mutually exclusive** in priority order A>C>B>D>E; each devotee receives exactly one segment's variant per cycle.

## Templates (DRAFT — pre-launch native review required)

All copy below is **English-only DRAFT**. Per `bhaktisetu-dev` skill rules + project pitfall guide: ta/te/bn/mr/ka variants MUST ship as DRAFT-tier through native reviewer before any auto-publish. NO fabricated names, NO invented "X% booked" stats — placeholders use `{{token}}` form.

### Karwa Chauth T-7 WhatsApp

```
🌙 Karwa Chauth approaches — {{days_until}} days.

This sacred vrat for your husband's longevity has been observed by countless women across {{years_count}} centuries. We can help you observe it with full vidhi:

• Sankalp builder personalized for your gotra
• {{nearby_temple_count}} Karwa Chauth pujas near you
• Live moon-sighting darshan at 8:14 PM IST

Tap to begin: {{deep_link}}
```

### Diwali T-3 WhatsApp (Segment A — booked KC)

```
✨ Aap ne Karwa Chauth ki puja safalta se puri ki. Dhanyavad.

Diwali Lakshmi Puja {{days_until}} din baad hai. Karwa Chauth grahaks ke liye:

• 15% saving on Lakshmi Puja booking
• Family gift option (parents + in-laws)
• Video proof within 24h

Limited slots at {{primary_temple_name}}: {{deep_link}}
```

### Tulsi Vivah T-1 Email fallback subject lines

- `Tulsi Vivah kal hai — wedding-season ka prarambh`
- `Aapki devotee profile par 2 chhute hue darshans hain`
- `NRI: send Tulsi Vivah blessings home in $24`

## Implementation tasks (founder + future agent)

1. **Cohort SQL** — Supabase view `vw_retention_cohort_kc_2026` populated from `bookings` + `livestream_sessions` tables filtered on cycle window. Owner-runnable.
2. **Nudge dispatcher** — extend `scripts/agents/onboarding-v2/_onboard-lib.mjs` with `dispatchFestivalNudge({ segment, cycle, touchpoint })`. Idempotent via `nudge_log` table (cohort_id × cycle × touchpoint composite key).
3. **WA template approval** — submit 5 segment × 7 touchpoint = 35 templates to Meta WA Cloud (gated on U7 founder paste). Templates must be `MARKETING` category; opt-in already covered via account creation TOS.
4. **PostHog cohort + funnel** — `kc_2026_cohort` cohort definition + funnel `booked_kc → viewed_diwali_offer → booked_diwali → booked_tulsi_vivah`. KPI query backfills `kpi.query` field on this roadmap item.
5. **D30 measurement script** — `scripts/agents/roadmap/_kpi-retention-d30.mjs` runs `cycle_start + 30d` reading from PostHog cohort + Supabase bookings. Populates `current` field.
6. **Native-language review** — ta/te/bn/mr/ka variants reviewed by paid native speakers BEFORE WA send. Budget: ₹500/lang × 35 templates × 5 langs ≈ ₹87,500. **Founder must approve.**

## Free-tier budget impact

| Resource | Per-cycle cost | 3-cycle cost | Cap | Headroom |
|---|---|---|---|---|
| WhatsApp Cloud | ~500 sends/cycle (assumes 2000-devotee cohort × 25% reachable) | ~1500/mo | 1000/mo | **OVER — request founder approval to upgrade OR reduce cadence** |
| Resend email | ~200 fallback/cycle | ~600/mo | 3000/mo | 80% headroom |
| Supabase row writes | <10MB/mo for nudge_log | <30MB/mo | 500MB | 94% headroom |
| GH Actions (dispatcher cron) | 5 min × 30d = 150 min/mo | 150/mo | 2000/mo | 92% headroom |
| Anthropic tokens (template personalization) | 0 (deterministic templates) | 0 | n/a | — |

**Budget violation flag:** 3-cycle WA sends exceed Meta 1000/mo free tier. Founder must either (a) approve paid upgrade, (b) reduce cohort to top 25% engaged segments only, or (c) shift Tulsi Vivah cycle to email-only.

## Founder action items before this can flip status=shipped

- [ ] **U7** — paste WhatsApp Meta Cloud credentials (gates entire send pipeline)
- [ ] Approve native-translation budget (~₹87,500) OR confirm English+Hindi-only scope
- [ ] Approve WA upgrade OR confirm cohort reduction plan above
- [ ] Approve template copy after CMO review (5 segments × 7 touchpoints = 35 messages)
- [ ] Confirm primary temple partners signed for Karwa Chauth + Diwali + Tulsi Vivah pujas (supply-side gate)
- [ ] Verify cohort SQL view privileges in Supabase (read-only role from advisory setup)

## Why status remains in_progress (not shipped)

Per `bhaktisetu-dev` skill rules + R2 PR rejection lessons: KPI requires post-festival measurement + founder action items above must close. Auto-claiming shipped on a campaign that hasn't sent = R2 lost-PR class of error.

This handoff scaffold IS the deliverable for this batch. Status flips to `shipped` only after Karwa Chauth cycle completes + D30 measurement runs + founder confirms ≥38% target met OR pivot path accepted.

## Tracking

| Milestone | Target date | Status |
|---|---|---|
| Spec scaffold (this doc) | 2026-06-15 | shipped this batch |
| WA templates submitted to Meta | 2026-08-15 | blocked on U7 |
| Cohort SQL view + PostHog funnel | 2026-09-15 | unblocked |
| Karwa Chauth cycle live | 2026-10-22 | blocked on supply + WA |
| D30 measurement | 2026-11-21 | blocked on cycle live |
| Final status update | 2026-12-22 | blocked on D30 |
