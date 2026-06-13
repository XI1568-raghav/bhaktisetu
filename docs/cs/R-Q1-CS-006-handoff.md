# R-Q1-CS-006 — WA blast 21 founder-network contacts asking 5 referrals each

> **Status**: founder-action-required. Spec was placeholder-only on bulk import; this handoff documents the executable plan for the founder to run the blast manually.

## Why this matters

Warm intros from the founder's existing personal/professional network are the
cheapest, highest-trust channel for the first 100 paying users on Darshya.
21 warm contacts × 5 referrals each = 105 warm leads — a single afternoon of
outbound that beats a month of cold ads on conversion economics.

KPI: `wa_warm_intros_sent` → target 21 messages sent (founder-network contacts),
manual count, owner enters in `docs/roadmap/_manual-kpis.yml` after the blast.

## Founder action — 30-min execution

1. **Pick 21 contacts.** Filter your phone WhatsApp list to people who:
   - Know you personally (>1 year)
   - Live in India OR are NRI Hindu (US/UK/CA/AU)
   - Are 30+ (likely have older parents who book pujas)
   - Are NOT in the devotional/temple industry already

2. **Send the message template below** to each contact individually (NOT a
   broadcast list — broadcasts feel impersonal and get muted). 21 personalized
   sends, ~60 sec each = ~25 min.

3. **Track sent count** in `docs/roadmap/_manual-kpis.yml`:
   ```yaml
   wa_warm_intros_sent: 21
   ```

4. **Log replies + intros received** in a personal sheet for 14 days. Expect
   30-50% reply rate from warm contacts. Convert each reply to a real
   conversation, not a sales pitch.

## Message templates

### Template A — friends + close family (15 contacts)

```
Namaste {name} 🙏

Hope you and family are well. I've been quietly building something for the
last few months — Darshya (https://darshya.online) — a devotional super-app
where Indians and NRIs can book live darshan, pujas (with video proof),
astrology consults, and 80G donations to verified temples.

We're going live this week and I'm asking 5 close friends to share with
5 people they think would genuinely benefit (parents who book pujas, NRI
relatives missing home, anyone interested in Vedic astrology).

Would you share with 5 people? No formal pitch needed — just "my friend
built this, it's legit, check it out: https://darshya.online"

Thank you 🙏
```

### Template B — professional network (6 contacts)

```
Hi {name},

Hope you're doing well. Quick founder-mode ask:

I've been building Darshya (https://darshya.online) — a devotional super-app
for Indian/NRI Hindus. Live darshan, video-proof pujas, astrology, 80G
temple donations. Going live this week.

Would really appreciate if you could share with 5 people in your network
who might find it useful — parents/relatives who book pujas, NRI friends,
anyone into Vedic stuff. A line from you ("I know the founder, it's the
real thing") carries 100x more weight than any ad.

Happy to send a one-pager if helpful. Thank you.
```

## Tracking template

Copy this into a personal Google Sheet (NOT in repo — contains personal contacts):

| Date | Contact name | Relationship | Sent | Reply | Intros sent | Notes |
|---|---|---|---|---|---|---|

## Why this is not automatable

This task is intentionally **manual founder-action**:
- WhatsApp Business API rate-limits non-template messages
- Personal-network blast from a "noreply" sender = 0% conversion
- Each message needs a 1-line personalization the founder picks
- WhatsApp Cloud API for cold outbound requires Meta approval (U7 gate)

When the founder unlocks U7 (WhatsApp Cloud API) — see
`docs/activation-gates.md` — a templated drip can be added under
`scripts/agents/onboarding-v2/` for the cold-list flow. Warm
personal-network outbound stays manual.

## Done criteria

- 21 messages sent (founder confirms in `_manual-kpis.yml`)
- KPI `wa_warm_intros_sent: 21` committed
- Item status flipped `in_progress` → `shipped` with `shipped_at` set
- Reply/intro tracker maintained personally for 14 days

## Engineering hooks delivered with this handoff

- `apps/api/src/lib/wa-warm-intro-helpers.ts` — pure helpers to render the two
  templates with a contact name + tag rendered messages with the
  `wa-warm-intro` source so downstream signup attribution can be tracked.
- Vitest coverage of both templates ensures the founder-facing text stays
  stable as we iterate on copy.
