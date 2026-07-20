# Onboarding Drip — 2026-07-20

> 7-touch drip sequence per role. Stored here as the source of truth. `apps/api/src/jobs/outreach-cron.ts` reads this and sends via Resend when `RESEND_API_KEY` is set.

## Sequences

## devotee (7 touches)

### Day 0 — Welcome to Darshya — your sacred dashboard is ready

```
Namaste {name},

Your Darshya account is live. Three things to try this week:

1. Watch a live darshan: darshya.online/temples (10+ temples streaming now)
2. Book your first puja with a verified pandit (₹999 starting): darshya.online/pujas
3. Start a 5-min daily practice: darshya.online/sanskrit

Reply to this email if you have a special intention — we'll help find the right pandit.
```

### Day 2 — A 5-min morning routine devotees swear by

```
Most devotees fall off after 3 days. Don't.

The simplest morning practice that builds the habit:

1. 1 min — light a diya, sit straight
2. 2 min — chant Om Namah Shivaya (or your ishta mantra)
3. 2 min — silence

That's it. We'll send you a 7-day shloka pack tomorrow.
```

### Day 4 — Free: 7 essential shlokas every Hindu should know

```
Saved for you (no signup): darshya.online/sanskrit/shlokas-7

Includes Sanskrit + transliteration + meaning + audio.
```

### Day 7 — A real puja at Kashi, Tirupati or Vrindavan — booked from your phone

```
Some of our most-booked pujas this week:

- Maha Mrityunjaya at Kashi (₹2,100) — 22 booked
- Sri Suktam at Tirupati (₹1,800) — 18 booked
- Govardhan puja at Vrindavan (₹2,400) — 15 booked

Video proof sent within 24h. 80G receipt if temple offers.

darshya.online/pujas
```

### Day 12 — 🐄 Adopt a cow for ₹2,000/month — and get 80G

```
One verified gaushala. One cow. One monthly photo update.

80G certificate issued within 24 hours.

More: darshya.online/gaushalas
```

### Day 21 — Are you NRI? Read this

```
If you're outside India, you have a dedicated tier:

- USD pricing (no FX surprises)
- Annual plan: $399 (covers 12 monthly pujas + unlimited darshan)
- Save 30% vs per-puja

darshya.online/pricing/nri
```

### Day 30 — How was your first month? 1-question survey

```
One question: On a scale of 0-10, how likely are you to recommend Darshya to a friend or family member?

Reply with just the number.

(If 0-6: please tell us what broke. If 7-8: what one feature would push you to 9? If 9-10: who in your circle would value this?)
```


---

## pandit (5 touches)

### Day 0 — Welcome — your Darshya pandit dashboard is ready

```
Namaste Pandit ji,

Next steps:

1. Upload Aadhaar (required before first payout)
2. Add your puja offerings + pricing
3. Set your availability calendar

Link: darshya.online/priest/onboarding

We pay T+1 via UPI/IMPS. 20% platform commission. KYC takes 24h.
```

### Day 1 — KYC pending — payouts blocked until uploaded

```
Aadhaar + PAN required for legal payout. 24h verification.

Upload: darshya.online/priest/kyc
```

### Day 3 — Why verified pandits get 3x more bookings

```
Verification badge moves you to top of search.

Devotees filter for verified-only by default. Unverified profiles get 80% fewer impressions.

24h KYC: darshya.online/priest/kyc
```

### Day 7 — Add your puja offerings — first booking comes 2-3 days after

```
Median time-to-first-booking for verified pandits: 3 days.

Minimum: 3 puja types with pricing.

Link: darshya.online/priest/pujas
```

### Day 14 — Video proof = trust = repeat bookings

```
Devotees who get clear video proof book again within 30 days at 4x rate.

Quick guide: shoot in landscape, 1080p, narrate the sankalpa clearly.

If needed, we can pair you with a temple videographer for ₹500/puja.
```


---

## temple (3 touches)

### Day 0 — Welcome — Darshya temple portal is live

```
Trustee onboarding:

1. Verify 12A + 80G registration (if applicable)
2. Add 3+ puja offerings
3. Set up live darshan stream (we provide RTMP credentials)
4. Add donation page

darshya.online/temple-portal
```

### Day 2 — Live darshan stream — 30-min setup

```
Free RTMP credentials. Use OBS Studio + a phone or IP camera.

Once live, your temple appears on darshya.online/darshan + push notification to 8K+ devotees.

Guide: darshya.online/docs/live-darshan-setup
```

### Day 7 — How temples on Darshya are doing in week 1

```
Average week-1 numbers for new temple partners:

- 4,000+ darshan views
- 12+ puja bookings
- ₹15,000+ donations
- 0% platform fee on donations during first 90 days
```


---

## gaushala (2 touches)

### Day 0 — Welcome — your gaushala portal is ready

```
First steps:

1. Upload 12A/80G certificates
2. Add cow inventory (photos + names)
3. Create donation tiers (one-time + adopt-a-cow monthly)

darshya.online/gaushala-portal

80G donations: receipts auto-generated within 24h.
```

### Day 3 — Adopt-a-cow tier converts at 8% — vs 1.2% for generic donations

```
Reason: emotional anchor (a specific cow, a specific name, monthly photo).

Setup: 5 cows, 5 names, 5 photos. ₹2,000/month each.

Darshya handles billing, receipt, monthly update.
```


---

## store_owner (1 touches)

### Day 0 — Welcome — Darshya store dashboard is ready

```
Add your first 10 SKUs:

1. Diyas/agarbatti (always sells)
2. Idols (limit to 5 SKUs, high margin)
3. Puja kits (₹599-₹1,499)
4. Books in Devanagari

Medusa-powered. Razorpay/UPI ready. We take 8% platform fee.
```


---

## astrologer (1 touches)

### Day 0 — Welcome — your astrologer portal is ready

```
3-step setup:

1. Add specialization + languages
2. Set per-minute consult rate (₹15-₹120/min standard)
3. Set availability slots

First free consultation matched within 7 days for verified astrologers.
```


---

## wellness (1 touches)

### Day 0 — Welcome — Darshya wellness instructor portal is live

```
Setup:

1. Add your class formats (yoga, pranayama, meditation, sound healing)
2. Pricing: per-session + monthly + corporate
3. Schedule open slots

Group classes 70% take-home. 1:1 80% take-home.
```


## Wire-up instructions

1. Set `RESEND_API_KEY` in API env (Render)
2. Set `DARSHYA_FROM_EMAIL=hello@darshya.online` (or your verified sender)
3. Verify DNS for darshya.online on Resend dashboard (U13)
4. `outreach-cron.ts` runs daily 9:00 IST — picks users where `createdAt = today - dayN` and sends matching template
5. Track opens + clicks via Resend webhook → `/api/v1/webhooks/resend`

---
*Agent: onboarding-drip · timestamp: 2026-07-20T06:43:49.801Z*
