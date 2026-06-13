# Outreach script — English email (fallback)

Use only when phone/WhatsApp paths exhausted or when temple admin is younger/English-comfortable (e.g. BHU New Vishwanath, Sarnath Buddhist site).

## Subject lines (A/B/C variants)

A. "{Temple name} — global devotee reach, zero upfront, 80G compliant"
B. "Invitation to partner with Darshya: live darshan + pooja booking platform"
C. "{Temple name}: 50,000+ NRI devotees waiting for your darshan"

Test all three. Track open rate via Resend per-link UTM. Move highest performer to default after 30 sends per variant.

## Body (≤180 words)

> Pranam {priest_name_or_trust_authority},
>
> I'm {founder_name}, founder of Darshya — a devotional platform connecting Indian temples with devotees across India and the diaspora. We help temples like yours reach a global devotee base through live darshan, scheduled pooja booking, and donation flows — all with automated 80G receipt compliance.
>
> Three things we offer:
>
> - **Reach** — 50,000+ verified devotees across India, US, UK, Canada, Australia actively seeking authentic temple connection.
> - **Compliance** — every donation generates a PAN-verified 80G receipt automatically. Zero ops burden on your trust.
> - **No upfront cost** — we earn only when bookings complete. Platform fee 20–40% depending on volume tier. No setup, no monthly.
>
> {Temple name} is on our priority list because {specific_reason — e.g. "Mahant Mishra ji's outreach work has inspired our approach"}. Would you have 15 minutes for a call or in-person meeting at the temple this week?
>
> Please book any slot that works: {{BOOKING_LINK}}
>
> With pranam,
> {founder_name}
> +91-{founder_phone} · founder@darshya.online

## CTA (one line)

> Please book a 15-minute slot here: {{BOOKING_LINK}}

## Signature

Single-line plain-text. No image (deliverability). Phone + email only.

## Follow-up sequence

- Day 0: send email A
- Day 3: WhatsApp cold first-touch (`whatsapp-templates.md`)
- Day 7: if no response, send email B with subject change
- Day 14: drop status to `dropped` and revisit in Q2 cycle

## Reply triage SLA

- Positive reply → respond within 4 working hours. Send physical meeting calendar link + 1-pager PDF.
- Negative reply → acknowledge, ask reason, log to `crm-tracking.csv` blocker column.
- Auto-reply / vacation → re-send Day 7 + 1.

## Compliance footer (required)

> Darshya is a brand of {legal_entity_name}, registered office: {address}. To opt out of future outreach, reply with "unsubscribe".
