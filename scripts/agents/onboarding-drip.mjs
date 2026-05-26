#!/usr/bin/env node
// Onboarding Agent — generates 7-touch drip sequence per role.
import { writeReport, TODAY, isoNow, fetchJson } from './_lib.mjs';

const SEQUENCES = {
  devotee: [
    { day: 0, subject: "Welcome to Darshya — your sacred dashboard is ready", body: `Namaste {name},

Your Darshya account is live. Three things to try this week:

1. Watch a live darshan: darshya.online/temples (10+ temples streaming now)
2. Book your first puja with a verified pandit (₹999 starting): darshya.online/pujas
3. Start a 5-min daily practice: darshya.online/sanskrit

Reply to this email if you have a special intention — we'll help find the right pandit.` },
    { day: 2, subject: "A 5-min morning routine devotees swear by", body: `Most devotees fall off after 3 days. Don't.

The simplest morning practice that builds the habit:

1. 1 min — light a diya, sit straight
2. 2 min — chant Om Namah Shivaya (or your ishta mantra)
3. 2 min — silence

That's it. We'll send you a 7-day shloka pack tomorrow.` },
    { day: 4, subject: "Free: 7 essential shlokas every Hindu should know", body: `Saved for you (no signup): darshya.online/sanskrit/shlokas-7

Includes Sanskrit + transliteration + meaning + audio.` },
    { day: 7, subject: "A real puja at Kashi, Tirupati or Vrindavan — booked from your phone", body: `Some of our most-booked pujas this week:

- Maha Mrityunjaya at Kashi (₹2,100) — 22 booked
- Sri Suktam at Tirupati (₹1,800) — 18 booked
- Govardhan puja at Vrindavan (₹2,400) — 15 booked

Video proof sent within 24h. 80G receipt if temple offers.

darshya.online/pujas` },
    { day: 12, subject: "🐄 Adopt a cow for ₹2,000/month — and get 80G", body: `One verified gaushala. One cow. One monthly photo update.

80G certificate issued within 24 hours.

More: darshya.online/gaushalas` },
    { day: 21, subject: "Are you NRI? Read this", body: `If you're outside India, you have a dedicated tier:

- USD pricing (no FX surprises)
- Annual plan: $399 (covers 12 monthly pujas + unlimited darshan)
- Save 30% vs per-puja

darshya.online/pricing/nri` },
    { day: 30, subject: "How was your first month? 1-question survey", body: `One question: On a scale of 0-10, how likely are you to recommend Darshya to a friend or family member?

Reply with just the number.

(If 0-6: please tell us what broke. If 7-8: what one feature would push you to 9? If 9-10: who in your circle would value this?)` },
  ],
  pandit: [
    { day: 0, subject: "Welcome — your Darshya pandit dashboard is ready", body: `Namaste Pandit ji,

Next steps:

1. Upload Aadhaar (required before first payout)
2. Add your puja offerings + pricing
3. Set your availability calendar

Link: darshya.online/priest/onboarding

We pay T+1 via UPI/IMPS. 20% platform commission. KYC takes 24h.` },
    { day: 1, subject: "KYC pending — payouts blocked until uploaded", body: `Aadhaar + PAN required for legal payout. 24h verification.

Upload: darshya.online/priest/kyc` },
    { day: 3, subject: "Why verified pandits get 3x more bookings", body: `Verification badge moves you to top of search.

Devotees filter for verified-only by default. Unverified profiles get 80% fewer impressions.

24h KYC: darshya.online/priest/kyc` },
    { day: 7, subject: "Add your puja offerings — first booking comes 2-3 days after", body: `Median time-to-first-booking for verified pandits: 3 days.

Minimum: 3 puja types with pricing.

Link: darshya.online/priest/pujas` },
    { day: 14, subject: "Video proof = trust = repeat bookings", body: `Devotees who get clear video proof book again within 30 days at 4x rate.

Quick guide: shoot in landscape, 1080p, narrate the sankalpa clearly.

If needed, we can pair you with a temple videographer for ₹500/puja.` },
  ],
  temple: [
    { day: 0, subject: "Welcome — Darshya temple portal is live", body: `Trustee onboarding:

1. Verify 12A + 80G registration (if applicable)
2. Add 3+ puja offerings
3. Set up live darshan stream (we provide RTMP credentials)
4. Add donation page

darshya.online/temple-portal` },
    { day: 2, subject: "Live darshan stream — 30-min setup", body: `Free RTMP credentials. Use OBS Studio + a phone or IP camera.

Once live, your temple appears on darshya.online/darshan + push notification to 8K+ devotees.

Guide: darshya.online/docs/live-darshan-setup` },
    { day: 7, subject: "How temples on Darshya are doing in week 1", body: `Average week-1 numbers for new temple partners:

- 4,000+ darshan views
- 12+ puja bookings
- ₹15,000+ donations
- 0% platform fee on donations during first 90 days` },
  ],
  gaushala: [
    { day: 0, subject: "Welcome — your gaushala portal is ready", body: `First steps:

1. Upload 12A/80G certificates
2. Add cow inventory (photos + names)
3. Create donation tiers (one-time + adopt-a-cow monthly)

darshya.online/gaushala-portal

80G donations: receipts auto-generated within 24h.` },
    { day: 3, subject: "Adopt-a-cow tier converts at 8% — vs 1.2% for generic donations", body: `Reason: emotional anchor (a specific cow, a specific name, monthly photo).

Setup: 5 cows, 5 names, 5 photos. ₹2,000/month each.

Darshya handles billing, receipt, monthly update.` },
  ],
  store_owner: [
    { day: 0, subject: "Welcome — Darshya store dashboard is ready", body: `Add your first 10 SKUs:

1. Diyas/agarbatti (always sells)
2. Idols (limit to 5 SKUs, high margin)
3. Puja kits (₹599-₹1,499)
4. Books in Devanagari

Medusa-powered. Razorpay/UPI ready. We take 8% platform fee.` },
  ],
  astrologer: [
    { day: 0, subject: "Welcome — your astrologer portal is ready", body: `3-step setup:

1. Add specialization + languages
2. Set per-minute consult rate (₹15-₹120/min standard)
3. Set availability slots

First free consultation matched within 7 days for verified astrologers.` },
  ],
  wellness: [
    { day: 0, subject: "Welcome — Darshya wellness instructor portal is live", body: `Setup:

1. Add your class formats (yoga, pranayama, meditation, sound healing)
2. Pricing: per-session + monthly + corporate
3. Schedule open slots

Group classes 70% take-home. 1:1 80% take-home.` },
  ],
};

async function maybeSend(toEmail, subject, body) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'RESEND_API_KEY not set' };
  const r = await fetchJson('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: 'Darshya <hello@darshya.online>', to: [toEmail], subject, text: body }),
  });
  return { sent: r.status === 200, status: r.status };
}

async function run() {
  const sections = Object.entries(SEQUENCES).map(([role, seq]) => {
    return `## ${role} (${seq.length} touches)

${seq.map((m) => `### Day ${m.day} — ${m.subject}

\`\`\`
${m.body}
\`\`\`
`).join('\n')}`;
  }).join('\n\n---\n\n');

  const body = `# Onboarding Drip — ${TODAY}

> 7-touch drip sequence per role. Stored here as the source of truth. \`apps/api/src/jobs/outreach-cron.ts\` reads this and sends via Resend when \`RESEND_API_KEY\` is set.

## Sequences

${sections}

## Wire-up instructions

1. Set \`RESEND_API_KEY\` in API env (Render)
2. Set \`DARSHYA_FROM_EMAIL=hello@darshya.online\` (or your verified sender)
3. Verify DNS for darshya.online on Resend dashboard (U13)
4. \`outreach-cron.ts\` runs daily 9:00 IST — picks users where \`createdAt = today - dayN\` and sends matching template
5. Track opens + clicks via Resend webhook → \`/api/v1/webhooks/resend\`

---
*Agent: onboarding-drip · timestamp: ${isoNow()}*
`;

  writeReport('onboarding-drip', body);
  console.log('Onboarding sequences written.');
}

run().catch((e) => { console.error(e); process.exit(1); });
