# ProductHunt Launch Day Runbook — Bhaktisetu 2026

Hour-by-hour. All times in IST. Launch day = chosen Tuesday. PH day flips at 12:01am PST = 1:31pm IST.

---

## Pre-launch (T-1 day, Monday)

### Monday evening

- [ ] **9:00pm IST** — final preflight: site 200, API 200, payments live keys active, CF Pages on latest deploy
- [ ] **9:30pm IST** — confirm anchor hunter online and ready for 1:30pm IST submit
- [ ] **10:00pm IST** — first comment text staged in a notepad on founder's machine, copy-paste ready
- [ ] **10:30pm IST** — gallery 4 PNGs locked, no further edits
- [ ] **11:00pm IST** — sleep. Set alarm for 11:00am IST Tuesday.

---

## Launch day (T-0, Tuesday)

### Morning

| Time IST | Action | Owner |
|---|---|---|
| 11:00am | Wake. Coffee. No social yet. | Founder |
| 11:30am | Site preflight: curl darshya.online and api.darshya.online/health both 200 | Founder |
| 12:00pm | Open ProductHunt submit page in a fresh browser tab. Paste tagline + description + topics. Upload 4 gallery PNGs. Do NOT click submit. Tab stays open. | Founder |
| 12:30pm | Open Twitter/X compose tab with launch tweet draft. Open LinkedIn compose tab. Open WhatsApp web. | Founder |
| 1:00pm | Final check: anchor hunter confirms online | Founder + Anchor |
| 1:15pm | Founder logs in to PH on his own account in second browser. Ready to post first comment immediately after submit. | Founder |

### Submit window

| Time IST | Action | Owner |
|---|---|---|
| **1:30pm SHARP** | Anchor hunter clicks Submit on PH | Anchor |
| **1:31pm** | Bhaktisetu PH page goes live. Founder copies the URL. | Founder |
| **1:32pm** | Founder posts first comment (Maker comment) on PH | Founder |
| **1:33pm** | Founder tweets launch tweet with PH link | Founder |
| **1:34pm** | Founder posts LinkedIn launch post | Founder |
| **1:35pm** | Founder broadcasts to WhatsApp personal network | Founder |

### First hour

- [ ] **1:35-2:30pm IST** — respond to every PH comment within 15 min SLA
- [ ] **2:00pm IST** — third batch of hunter DMs (final 4 cold-aligned hunters), share PH link
- [ ] **2:30pm IST** — quick check: rank, comment count, upvote count. Screenshot for retro.

### Day-of pings (90-min cadence)

| Time IST | Action |
|---|---|
| 3:30pm | Hunter follow-up batch 1 — DM the 8 warm hunters who voted, thank them; DM the 4 cold-aligned with a friendly nudge if no response |
| 5:00pm | Hunter follow-up batch 2 + Twitter/X mid-day update with current rank |
| 6:30pm | Hunter follow-up batch 3 + LinkedIn mid-day update |
| 8:00pm | Final India-window DM batch + Twitter/X evening update with screenshot |
| 11:30pm | Diaspora ping batch — DM 8 diaspora hunters (US east coast morning starts) |

### Response SLA

- Every PH comment: respond within 15 min during 1:30pm-11:00pm IST window
- Every PH comment: respond within 60 min during 11:00pm-9:00am IST window (founder sleeps in shifts on launch night)
- Every DM response: reply within 30 min during India window, within 2h during diaspora window

### Twitter/X post template (launch tweet)

```
We are live on @ProductHunt today.

Bhaktisetu — the devotional super-app for India and the diaspora.

Live darshan. Video-proof pujas. 80G receipts. NRI dual currency. Built solo from rupees zero.

If it resonates, your upvote and honest comment would mean a lot.

[PH link]
```

### Twitter/X mid-day update template

```
3 hours in. Currently ranked #[N] on @ProductHunt today.

The thread of why we built this is [link to founder thread or pinned tweet].

Every comment on PH gets a reply. Every upvote means a parent in Varanasi gets one more devotee.

[PH link]
```

### LinkedIn launch post template

```
Today we launch Bhaktisetu on ProductHunt.

I built this because my grandmother kept asking me to send a puja to our family deity in Varanasi. Existing apps either took her money and sent a one-line confirmation, or charged enterprise-tier dollars for a 30-second video.

Bhaktisetu fixes that. Every puja booking gets mandatory video proof. Every donation gets an 80G receipt. Live darshan streams from participating temples. NRI dual currency because the cost of fulfilment and willingness to pay are both higher abroad.

If you find time today, an upvote and an honest comment on PH would mean a lot.

[PH link]

Built solo. Rupees zero budget. India 18+.
```

---

## End of day (T+0, Tuesday 11:30pm-Wednesday 12:00am IST)

- [ ] Capture final IST end-of-day rank
- [ ] Screenshot PH page
- [ ] Note top 3 comments by quality
- [ ] Thank-you DM to every hunter who voted (use vote_confirmed_at column in CSV)

---

## T+24h (Wednesday afternoon IST)

- [ ] Capture final PH rank (PH day rolls over 1:31pm IST Wednesday)
- [ ] Capture final upvote count
- [ ] Capture final comment count
- [ ] Enter rank into R-Q2-M-001 KPI manual entry
- [ ] Write thank-you post on Twitter/X and LinkedIn with final rank
- [ ] Write retro markdown to `docs/marketing/producthunt-launch-retro-2026.md` covering:
  - Final rank vs target ≤5
  - Hunter conversion rate (of 20 DMs, how many voted)
  - Comment quality
  - Conversion lift (sitewide signups in 48h post-launch vs 48h pre-launch)
  - What worked
  - What did not work
  - What to do differently next launch

---

## Failure modes and mitigations

| Failure | Mitigation |
|---|---|
| Anchor hunter no-shows at 1:30pm | Founder submits from his own account (still legal, lower visibility). Have a backup anchor confirmed by T-1 evening. |
| Site goes down at launch | Pre-staged status page at status.darshya.online (if exists) or pinned tweet. Apologise on PH first comment thread. Race to fix. |
| Razorpay or Stripe payments fail | Pre-staged email founder@darshya.online for manual order intake. Disclose in PH thread. |
| PH first comment gets buried | Pin it via Maker self-pin (PH allows). |
| Negative comment gains traction | Respond with empathy, ship a fix within 24h if valid, link to roadmap if not. Never argue. |
| Rank drops below 10 mid-day | Triple DM cadence, do a Twitter/X plea (sparingly), tag 2-3 friendly larger accounts. |

---

## Post-launch (T+1 to T+7)

- [ ] Daily review: signups, conversion, support tickets
- [ ] Week 1 retro on Friday
- [ ] Plan next channel push (Reddit r/india, X engagement, founder podcast circuit)
