<!-- TC-01 / TC-08 (trust audit): the 80G deduction promise and the "verified
pandit" adjective were removed from this template. Darshya holds no Section 80G
registration (apps/web/lib/company.ts HAS_80G_VERIFIED is false, pan and
eightyGNumber null) and apps/api/src/lib/pdf-receipt.ts is80GEligible() needs a
donee 80G number AND PAN read from gaushala_profiles columns no route writes; and
nothing promotes a Priest to verified outside apps/api/prisma/seed.ts. This file
is plain markdown a human copies into a real message, so there is nothing to gate
it on: restore the wording by hand the day apps/api/src/lib/eighty-g.ts HAS_80G
and apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING are both true. -->

# Bengaluru Temple Partnership — Outreach v1

Two variants for the cold-temple-outreach agent. Per-row placeholder fill:
`{{TEMPLE_NAME}}`, `{{DEITY}}`, `{{LANDMARK}}`, `{{NEIGHBOR_TEMPLE}}`, `{{LOCALITY}}`, `{{FOUNDER_CONTACT}}` (e.g. `Sunil Kumar +91-XXXXXXXXXX`).

Kannada greeting `ನಮಸ್ಕಾರ / namaskara` opens both.

Partnership ask (all variants):
1. Live darshan stream of {{TEMPLE_NAME}} via Bhaktisetu app — we handle camera, RTMP encoder, CDN. Temple keeps full editorial control + can pause anytime.
2. Puja booking commission share — temple keeps 85%, Bhaktisetu 15% platform fee (priest payout via Aadhaar-gated payout per business rule).
3. Zero upfront cost. No subscription. Pay only when a booking lands.

Opt-out: every message ends with "If you do not wish to receive further messages, reply STOP" (WA) or "Unsubscribe" link (email).

---

## WhatsApp (target ≤120 words)

> ನಮಸ್ಕಾರ / namaskara 🙏
>
> {{TEMPLE_NAME}} ({{LOCALITY}}, near {{LANDMARK}}) — I am {{FOUNDER_CONTACT}} from Bhaktisetu, a Bengaluru-based devotional super-app.
>
> We help temples like {{NEIGHBOR_TEMPLE}} reach NRI devotees abroad through:
>
> 1. Live {{DEITY}} darshan streaming (we install camera + handle tech, zero cost to you)
> 2. Online puja booking — temple keeps 85%, we handle the platform
> 3. Numbered donation receipts for foreign devotees, emailed automatically
>
> No upfront fee. No subscription. You only earn when a booking lands.
>
> 5-minute call this week to show you the temple-portal demo?
>
> Reply YES for call, or STOP to opt out.
>
> 🕉 Bhaktisetu — bhakti.setu / darshya.online

Word count: ~115.

---

## Email (target ≤220 words)

**Subject:** Partnership invitation — {{TEMPLE_NAME}} live darshan + online puja booking

> ನಮಸ್ಕಾರ / namaskara 🙏
>
> Greetings to the {{TEMPLE_NAME}} office,
>
> My name is {{FOUNDER_CONTACT}} and I lead partnerships at Bhaktisetu (darshya.online) — a Bengaluru-based devotional platform that connects Hindu temples with devotees worldwide, particularly the Kannada NRI diaspora.
>
> I noticed your temple in {{LOCALITY}} (near {{LANDMARK}}, neighbour to {{NEIGHBOR_TEMPLE}}) and would love to explore a no-cost partnership across three areas:
>
> **1. Live {{DEITY}} darshan streaming.** We install a discreet IP camera + RTMP encoder at our cost. Daily darshan, special aartis, and festival pujas reach devotees in the US, UK, Gulf, and Australia. You retain full editorial control — pause or end the stream anytime.
>
> **2. Online puja sankalpa booking.** Devotees worldwide book sankalpa for archana, abhishekam, homas, special-occasion pujas. Temple receives the booking + sankalpa details (name, gotra, nakshatra) before the puja. Revenue split: temple 85%, Bhaktisetu 15% platform fee.
>
> **3. Numbered donation receipts for foreign devotees.** Bhaktisetu issues a numbered receipt PDF by email for every donation. It is proof of payment, not a tax-exemption certificate: we hold no Section 80G registration and do not handle a temple's own 80G or PAN compliance.
>
> Zero upfront cost. Zero monthly fee. We only earn when a booking lands. 200+ temples already onboarded across India.
>
> Could we schedule a 15-minute call or a temple-portal walkthrough this week?
>
> With prayers and respect,
> {{FOUNDER_CONTACT}}
> Bhaktisetu / Darshya
>
> ---
>
> _To unsubscribe from future partnership emails, reply UNSUBSCRIBE or click [here]._

Word count: ~215.

---

## Tone notes (for agent prompt tuning)

- Open with Kannada `ನಮಸ್ಕಾರ` — locality-respectful, not Hindi `namaste`
- Avoid Marwari/Gujarati/Hindi seva-bhasha; use Karnataka temple parlance (sankalpa, archana, abhishekam, homa)
- Never fabricate a connection ("I visited your temple last week") — devotees and pujaris notice
- Always include opt-out per India DND + WhatsApp Business policy
- Founder phone number must be the on-record Bhaktisetu sales line (not personal mobile) for trail compliance
- Do not promise specific revenue numbers. Soft language only ("100-500 bookings/month for similar-tier temples").
