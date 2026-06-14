# R-Q1-SA-005 — First Investor Email Batch (5 Angels) — Founder Handoff

> **Status**: scaffold shipped, founder-action-required for actual sends.
> **KPI**: `investor_emails_sent: 0 → 5` (manual count, founder-attested).
> **Quarter**: Q1 · **Priority**: P1 · **Est hours**: 4 (founder time).
> **Linked spec**: `docs/sales/first-angel-investor-email-batch.md` (per-angel template + targets).

## Why this is founder-action

The KPI literally counts emails the founder sends from the founder's
own inbox to 5 named individuals in the founder's personal network.
The agent cannot:

- Send mail from a founder identity (would be impersonation + may
  trigger spam filters / break domain reputation).
- Choose who counts as "friends/family" in the founder's actual network.
- Vouch for the warm-intro path (the relationship is the asset).
- Decide $-ask sizing per recipient (depends on private knowledge of
  recipient liquidity + risk appetite).

What the agent CAN do — and has done — is reduce this to a paint-by-
numbers checklist so the founder can execute in one focused 90-minute
block instead of staring at a blank email draft.

## What ships in this handoff (agent-completed)

1. **Per-angel personalization workbook** (below) — 5 rows, each w/
   subject line + opening hook + custom paragraph slot the founder
   fills in 60 seconds per row.
2. **Send-day checklist** — exact ordering, time-of-day, follow-up
   cadence, calendar holds.
3. **Tracker** — `docs/sales/trackers/R-Q1-SA-005-send-tracker.md`
   (founder ticks 5 boxes; KPI auto-flips to 5 on the next orchestrator
   cycle once founder updates the KPI file).
4. **KPI update path** — exact file + field + line to flip when sends
   complete.
5. **Reject-handling playbook** — what to do if angel 1-3 pass, when
   to widen to 10 (R-Q2-F-002 territory).

## Personalization workbook — 5 rows

> Founder: spend 60-90s per row filling the `{...}` slots, then
> copy the resulting body into your own email client. **Do not** send
> from any darshya.online or bhaktisetu.com address — send from your
> personal/founder address that the recipient will recognize.

### Angel #1 — ex-Razorpay / Indian fintech infra angel

| Field | Value |
|---|---|
| Recipient name | `{VERIFY-FOUNDER: name}` |
| Recipient email | `{VERIFY-FOUNDER: email}` |
| Warm-intro path | `{e.g. "LinkedIn 2nd-deg via {mutual name}"}` |
| Subject | `Pre-seed: Bhaktisetu — devotional super-app (₹25L-1Cr friends round)` |
| Custom opening hook (1 sentence) | `{e.g. "Saw your Razorpay infra talk at Surge '24 — the 5-revenue-lanes architecture you outlined is what we've built."}` |
| Ask | `₹25L SAFE @ $1.5M post-money cap, 20% discount` |
| Best-fit slide from deck | Slide 7 (5-lane architecture) |
| Follow-up day if silent | T+7 |

### Angel #2 — ex-MakeMyTrip / India consumer angel

| Field | Value |
|---|---|
| Recipient name | `{VERIFY-FOUNDER: name}` |
| Recipient email | `{VERIFY-FOUNDER: email}` |
| Warm-intro path | `{e.g. "Founder personal network — met at {event}"}` |
| Subject | `Pre-seed: Bhaktisetu — India devotional + yatra commerce (₹25L-1Cr)` |
| Custom opening hook | `{e.g. "Your MakeMyTrip Char Dham SKU work in '22 is exactly the yatra-package lane we're scaling — but bundled w/ live darshan + pandit on the same trip."}` |
| Ask | `₹50L SAFE @ $1.5M post-money cap` |
| Best-fit slide | Slide 9 (yatra TAM ₹8000Cr) |
| Follow-up day if silent | T+7 |

### Angel #3 — NRI angel based USA (diaspora thesis)

| Field | Value |
|---|---|
| Recipient name | `{VERIFY-FOUNDER: name}` |
| Recipient email | `{VERIFY-FOUNDER: email}` |
| Warm-intro path | `{e.g. "Indian Founder Cabin Slack — DM intro via {host}"}` |
| Subject | `NRI-first devotional commerce — Bhaktisetu pre-seed ($25-50K)` |
| Custom opening hook | `{e.g. "Your thesis post on diaspora-as-distribution applies here: NRI USD pricing is 9-10x domestic, with 80G receipt as the unlock."}` |
| Ask | `$25-50K SAFE, USD denominated, GIFT-City structure if preferred` |
| Best-fit slide | Slide 11 (NRI lane, 9-10x ASP) |
| Follow-up day if silent | T+7 |

### Angel #4 — ex-Flipkart/Myntra exec turned angel

| Field | Value |
|---|---|
| Recipient name | `{VERIFY-FOUNDER: name}` |
| Recipient email | `{VERIFY-FOUNDER: email}` |
| Warm-intro path | `{e.g. "LinkedIn 1st-deg via {college name} batch"}` |
| Subject | `Pre-seed: Bhaktisetu — verified-temple commerce at India scale` |
| Custom opening hook | `{e.g. "Your Myntra '21 take-rate optimization playbook is exactly what we need — we're at 20-40% commission per temple, want your eyes on the unit economics."}` |
| Ask | `₹25-50L SAFE @ $1.5M cap` |
| Best-fit slide | Slide 14 (unit economics) |
| Follow-up day if silent | T+7 |

### Angel #5 — Indian-origin VC partner doing angel ticket

| Field | Value |
|---|---|
| Recipient name | `{VERIFY-FOUNDER: name}` |
| Recipient email | `{VERIFY-FOUNDER: email}` |
| Warm-intro path | `{e.g. "Founder personal warm-intro via {portfolio CEO}"}` |
| Subject | `Angel ticket — Bhaktisetu pre-seed, ₹25L-1Cr friends round` |
| Custom opening hook | `{e.g. "Putting this in front of you as an angel ticket (not the fund) — would love your founder hat on for 30 min before the seed round opens Q2."}` |
| Ask | `₹25L angel ticket + commitment to lead seed if metrics hit by Q2` |
| Best-fit slide | Slide 16 (12-month roadmap) |
| Follow-up day if silent | T+7 |

## Email body template (paste this for every angel, then customize)

```
Hi {Name},

{Founder name} here — building Bhaktisetu, India's verified-temple
devotional super-app with NRI USD pricing.

{CUSTOM OPENING HOOK from workbook row}

What we have today (4 months solo, $0 burn, free-tier infra):
- 107 roadmap items shipped via autonomous AI orchestrator
  (every 8h cycle, paste-receipt gated for safety)
- 30 BLR temple prospects in pipeline, 5 onboarded pilot
- Section 8 Foundation w/ 80G + CSR-1 registration in flight
  (compounding recurring revenue from corporate gifting + donations)
- 5 revenue lanes architected: puja booking, live darshan, NRI gift,
  yatra packages, store commerce
- Live demo: https://bhaktisetu.com
- Build-in-public dashboard: https://bhaktisetu.com/admin/roadmap

Ask: {ASK from workbook row}. 18-month runway target.

Deck (private link): {founder Calendly page link, or DocSend}
Calendly (15 min): {founder Calendly URL}

Happy to walk through the 5-lane unit economics and 12-month roadmap
on a quick call this week.

Thanks,
{founder name}
Bhaktisetu Foundation (Sec 8)
{phone} · {email}
```

## Send-day checklist (90 min focused block)

1. **T-1 day, evening**
   - Fill `{VERIFY-FOUNDER}` slots in workbook above (5 rows × 60s).
   - Confirm Calendly link works + 30-min slots open Mon-Fri next 2 weeks.
   - Confirm deck DocSend / private link is live, gated by email if private.
   - Block 90 min on calendar tomorrow 9-10:30 AM IST.

2. **T-0 send day (Mon-Fri, 9-10:30 AM IST)**
   - Send #1 (Razorpay angel) — Mon 9:00 AM
   - Send #2 (MMT angel) — Mon 10:00 AM
   - Send #3 (NRI angel) — Tue 8:00 AM IST (= 7:30 PM PT previous day)
   - Send #4 (Flipkart angel) — Wed 9:00 AM
   - Send #5 (VC-as-angel) — Thu 9:00 AM
   - **One-per-day spacing** prevents looking like a blast, lets you
     iterate the subject/hook based on opens.

3. **T+1 to T+6**
   - Check CRM (or whatever — Notion / Airtable / Gmail labels) daily
     for opens, replies, Calendly bookings.
   - Reply to any reply within 4 business hours.

4. **T+7 follow-up (if silent)**
   - One short follow-up per silent angel:
     ```
     Hi {Name}, circling back on this — no pressure if not a fit.
     Two updates since last week: {1 metric delta, e.g. "BLR pilot
     #3 went live"} and {1 product delta, e.g. "video-proof
     mandatory shipped"}. Open to a 15-min walkthrough if useful.
     ```

5. **T+14 close**
   - If no reply after T+7 → mark closed, do not chase 3rd time.
   - If reply but no commitment after 2 calls → ask for
     a 1-line referral to someone better fit.

## Tracker

→ `docs/sales/trackers/R-Q1-SA-005-send-tracker.md`

Update the tracker after each send. The KPI flips when 5 boxes are
ticked.

## KPI update path

When all 5 emails are sent, edit
`docs/roadmap/items/Q1/sales/005-first-investor-email-batch-5-angels-friends-family.md`:

```yaml
kpi:
  metric: "investor_emails_sent"
  current: 5             # was 0
  target: 5
  ...
status: shipped          # was in_progress
shipped_at: 2026-XX-XX   # date of 5th email send
```

The next orchestrator cycle (every 8h) picks up the change and
re-validates. The item moves out of the in_progress queue.

## Reject-handling playbook

| Outcome after T+7 | Action |
|---|---|
| 0/5 reply | Widen to 10 angels (R-Q2-F-002 territory). Adjust hook — likely too generic. |
| 1-2/5 reply, no commit | Take both calls. Convert at least 1 to ₹10-25L. Use as social proof for next batch. |
| 3-5/5 reply, 1-2 commits | Close friends/family round at ₹50L-1Cr. File SAFE / CCPS. Move to R-Q2-F-001 (institutional seed). |
| Polite passes w/ feedback | Distill 1-3 themes. Patch deck before next batch. |
| Ghosting | Do not chase past T+14. Move on. |

## What NOT to do

- Do not BCC all 5 on one mail. Each must be 1:1 and customized.
- Do not paste the deck link into the body if it's gated — use DocSend
  so you see who actually opened it.
- Do not mention valuation as $5M+ or "competitive round" — this is
  friends/family, not Series A theater.
- Do not offer warrants, bonuses, or unusual side letters in the email
  — keep terms standard SAFE / CCPS, negotiate per recipient on the call.

## When this item is done

Founder edits the YAML frontmatter as above. Orchestrator cron picks it
up. Item closes. R-Q2-F-001 (seed close meetings) unblocks if it was
gated on this batch.

## Closes

R-Q1-SA-005 — handoff + workbook + tracker shipped, awaits founder send.
