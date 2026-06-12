# ISKCON Outreach Kit v1 — Cold Email + WA + Founder Action Checklist

> **Purpose**: ready-to-send templates for the 3 central-deal + 5 individual-temple entry points named in `iskcon-org-map-2026-06.md`. Founder reviews each per-recipient before send.
>
> **Authoring date**: 2026-06-12 · **Hard rule**: ZERO sends from agent. Founder + Bhaktisetu Foundation board only. No bulk-tool (HubSpot/Mailchimp) — manual founder@bhaktisetu.com Gmail or WA personal account.

---

## A. Cold email — Bureau Secretary (central deal path)

**Subject**: Bhaktisetu Foundation — proposal for ISKCON partnership pilot (verified-temple platform, 80G rails)

**Body** (220 words):

```
Hare Krishna {Recipient name} ji,

I am {founder name}, founder of Bhaktisetu Foundation — an India Section 8
not-for-profit running a verified-temple platform at https://darshya.online.
We connect devotees worldwide with verified Hindu temples for live darshan,
remote puja booking with mandatory video proof, and 80G-eligible
temple-adoption subscriptions.

We are reaching out because ISKCON's combination of (a) doctrinal rigour,
(b) sankirtan-first culture, and (c) operational discipline across 50+ India
temples makes it the partnership we want to pilot most carefully — and we
want to start the conversation correctly with the Bureau, not by side-routing
through individual temple presidents.

Specific ask: a 30-minute introductory call to explore whether a 2-temple
pilot (specific ISKCON temples to be jointly chosen) could move forward
under a Bhaktisetu × ISKCON Letter of Intent in the next 60 days. Pilot terms
indicative: ISKCON-side retains 60-80% of devotee payment per puja, no
upfront fee from us, video proof mandatory, joint review at 90 days.

Bhaktisetu Foundation holds active 80G + CSR-1; happy to share our
foundation registration, board composition, and current donor counts +
GMV when useful.

Calendly link: {founder Calendly URL}
Alternative: I can call your office at a convenient slot — please share.

Hare Krishna,
{Founder name}
Founder, Bhaktisetu Foundation
{phone} · {email}
```

**When**: M-F 10:30 AM IST is the highest-open-rate window for India faith-org email per general inbox conventions. Wednesday is best (post-Monday inbox cleanup, pre-weekend hand-off).

**Tracking**: log to `data/sales/iskcon-outreach-tracker.csv` after send.

---

## B. Cold email — Individual TP (pilot path)

**Subject**: Bhaktisetu × ISKCON {city} — 30-minute exploration call?

**Body** (180 words):

```
Hare Krishna {TP name} ji,

I am {founder name}, founder of Bhaktisetu Foundation. We run a
verified-temple platform (https://darshya.online) where devotees book
remote pujas with mandatory video proof and adopt temples via 80G-eligible
recurring subscriptions.

ISKCON {city} stands out to us specifically — {one specific reason per TP:
e.g. "your darshan timing precision is the closest to professional that
we have seen across 30+ India temples we have evaluated" OR "your annual
Janmashtami event organisation is the gold standard"}.

I would value a 30-minute call to explore a pilot listing: ISKCON {city}
on Bhaktisetu for {2-3 specific puja types — e.g. Tulsi Archana, Janmashtami
sankalp}, with you retaining 60-80% of devotee payment, video proof
delivered by your team within 72 hours, and a 90-day joint review.

This would be a pilot only — no commitment beyond 90 days, no commercial
exclusivity, no payment from your side. If it works, we expand. If not, we
both walk away cleanly.

I am happy to also send a formal LOI for your review if it helps your
internal process.

Hare Krishna,
{Founder name}
Founder, Bhaktisetu Foundation
{phone} · {email}
```

**When**: avoid Janmashtami / Gaur Purnima / Ratha Yatra windows ± 2 weeks (TPs swamped). Best dates: late-Jun, Aug, Oct (post-Diwali), Jan (post-Sankranti).

---

## C. WhatsApp first-touch (warm intro path)

For when founder has a warm-intro angel (e.g. devotee who knows the TP). Send AFTER warm-intro confirms relay:

```
Hare Krishna {TP name} ji,

{Warm-intro person} ji ne aapka contact share kiya — I am {founder name},
founder of Bhaktisetu (https://darshya.online).

Maine ek email aaj subah aapko bheji hai ({subject line}). Wahaan se
context milega.

15-30 min ka time mil sakta hai is hafte? Pilot list karne ki conversation
hai — koi payment commitment nahi, video proof first principle hai humara.

Hare Krishna,
{Founder name}
```

**When**: same day as cold email, AFTER warm-intro acknowledges. NEVER as first contact (cold WA reads as spam in India temple context).

---

## D. Cold WA (if no warm intro, BUREAU permission to ping TP)

Only after Bureau secretary or regional sec says "feel free to contact TP directly":

```
Hare Krishna {TP name} ji,

{Bureau secretary OR regional secretary name} ji ne aapka contact share
kiya hai — main {founder name}, founder of Bhaktisetu Foundation
(https://darshya.online).

Aapko ek email subject "{subject line}" se bheji hai. Convenient samay
par 30-min call ke liye time mil sakta hai?

Hare Krishna.
```

---

## E. Follow-up sequence

| Touch | Day | Channel | Action |
|---|---|---|---|
| #1 | 0 | Email | Initial cold email (A or B template) |
| #2 | 0 (after) | WA | Warm-intro relay OR Bureau-permitted ping (C/D) |
| #3 | 7 | Email | One-line reply to original thread: "Hare Krishna, gentle bump — happy to send LOI for review if useful." |
| #4 | 21 | Email | One final reply: "Hare Krishna, no further follow-ups from me unless I hear back. Door stays open." |
| (silence) | 30 | — | Mark `dead` in tracker. Re-attempt earliest in 6 months via different entry point. |

**HARD RULE**: never more than 3 emails to same person. Faith-org outreach above 3-touch threshold reads as harassment.

---

## F. Founder action checklist (this week)

```markdown
- [ ] Verify all `[VERIFY-FOUNDER]` and `[UNVERIFIED]` markers in iskcon-org-map-2026-06.md against iskcon.org current Leadership page
- [ ] Pick path: PILOT (TP-led, recommended) OR CENTRAL (Bureau-led, slower)
- [ ] If PILOT: identify top-2 TPs from §7 of org-map (recommend Chowpatty + Bangalore IF Bangalore camp issue resolved; else Chowpatty + Mayapur)
- [ ] If CENTRAL: identify Bureau secretary email + 1 GBC name from §6 of org-map
- [ ] Personalise email template B or A per recipient (replace {one specific reason per TP} with real observation — generic = trash bin)
- [ ] Have Calendly link ready (15-min slot offerings, 3 in next 2 weeks)
- [ ] Have LOI v1 PDF ready to send on request (do NOT attach to first email — only on positive reply)
- [ ] Have Foundation 80G + CSR-1 + CIN ready to share on request (do NOT attach unsolicited)
- [ ] Send 1 email per day (NOT batched) for 5 days
- [ ] Log every send + reply in data/sales/iskcon-outreach-tracker.csv (created below)
- [ ] Review replies in batch each Friday — never reply same-day on Mondays (rushed)
```

---

## G. Tracker schema (for `data/sales/iskcon-outreach-tracker.csv`)

```
recipient_name,role,entity,channel,subject_or_intro,sent_at,replied_at,reply_sentiment,next_action,outcome,notes
```

- `role`: GBC / Bureau / Regional sec / TP
- `channel`: email / wa / call
- `reply_sentiment`: positive / neutral / negative / silent
- `next_action`: send LOI / call scheduled / dead / parked

---

## H. Pre-LOI conversation script (when call is scheduled)

15-30 min call. Founder leads. Agenda:

1. **2 min** — founder introduces Bhaktisetu briefly (history, donor base, current temples listed, technology stack)
2. **3 min** — listen to ISKCON-side's existing tech stack + devotee outreach (don't pitch yet)
3. **5 min** — propose pilot scope: 1-2 specific ISKCON temples, 2-3 puja types, 60-80% revenue split, video proof mandatory, 90-day review
4. **5 min** — Q&A from ISKCON-side
5. **5 min** — agree next step (send LOI / site visit / decline)

**Don't ask for**: signed deal, exclusivity, donor data transfer, money. Pilot trust first.

---

## Closes

Q-C-20260612T0503-R-Q2-S-011 (outreach-kit slice)
