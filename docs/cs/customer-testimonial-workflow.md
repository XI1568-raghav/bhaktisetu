# Customer Testimonial Collection Workflow

> Operational playbook for harvesting + curating customer voice for marketing + investor pitch.

## Why testimonials matter

- 92% of B2C customers trust peer recommendations over brand claims (Nielsen 2024)
- NRI segment particularly responds to other-NRI testimonials (cultural validation)
- Investor pitch deck slides 5-6 (Product + Testimonials) carry most weight
- Reddit AMA + Twitter thread amplification requires concrete devotee voices

## Sourcing — Tier system

### Tier 1: High-value organic testimonials
- Post-puja completion + 24hr video proof view → automated email
- Subject: "How was your [puja name] experience?"
- Open-ended question + optional star rating
- Reply rate target: 15% (industry benchmark: 5%)
- Bhaktisetu uplift: dignified follow-up + personal founder note

### Tier 2: Solicited deeper testimonials
- Quarterly outreach to top 50 LTV customers
- Founder-personal email request: "Would you share a 30-second video for our pitch deck?"
- Incentive: ₹500 wallet credit + recognition on /testimonials page
- Founder-coordinated: ensures dignity (sensitive context for shraddha + antim sanskar)

### Tier 3: Reddit + community testimonials
- Monitor r/india + r/IndianAmerican + Hindu WA groups for organic mentions
- Document with screenshots + permission DM
- Cross-post to Bhaktisetu /testimonials with attribution

## Per-testimonial review framework

Founder + CS contractor review every testimonial against:

1. **Authenticity** — does it sound like real devotee voice?
2. **Specific detail** — does it cite specific puja + temple + outcome?
3. **Cultural sensitivity** — no caste/religious overgeneralisation
4. **Privacy** — explicit consent for name + city + photo before publishing
5. **Honest review** — even negative/lukewarm reviews welcomed for credibility
6. **Diversity** — domestic + NRI + age + tradition + language mix

## Permission framework

### Required before publication:
- Written email/DM consent confirming permission to publish
- Specify which details to share (full name? initials? city? photo? video?)
- Specify which channels (website, pitch deck, marketing emails, social)
- Right to revoke (per DPDP, customer can request removal anytime)

### Template consent message:
```
Hi {{customer name}},

Thanks for booking {{puja}} with Bhaktisetu. We'd love to share your experience with future customers — would you be comfortable with us publishing your review?

Please confirm what's okay:
☐ Use my first name (or initials)
☐ Mention my city
☐ Include my photo (if applicable)
☐ Include a 30-second video clip (we'll record briefly via Zoom)

You can revoke this anytime by emailing us — your testimonial will be removed within 7 days.

Thanks!
Sunil (Founder, Bhaktisetu)
```

## Format guidelines per channel

### Website /testimonials page
- 50-150 word quote
- First name + city + tradition
- Optional photo
- Date of experience
- Linked to the puja/service used

### Pitch deck (investor)
- 30-50 word quote
- Specific outcome metric (e.g., "saved $200 vs other platforms")
- NRI segment overweight (key differentiation story)
- 3-5 testimonials max per slide (cherry-picked diversity)

### Social media
- 80-150 character quote
- Tag customer if they're on platform (with permission)
- Image card with brand styling
- One per platform per week max (avoid fatigue)

### Reddit AMA + similar
- Long-form (200-500 word) detailed story
- Include specific situation (NRI emergency Pind Daan, etc.)
- Founder framing (not raw quote)
- Cross-post permission required

## Quarterly review

Each quarter:
- 30+ testimonials collected target
- 70%+ from NRI segment (per strategic priority)
- 5+ video testimonials (richer format for pitch deck)
- 0% fabricated/AI-generated (zero tolerance, kills credibility)

## Engineering ticket

`/testimonials` page implementation:
- SSR with all approved testimonials
- Schema.org `Review` JSON-LD
- Per-testimonial: name, date, rating, body, tags (puja type, NRI, etc.)
- Filterable by puja type + NRI/Domestic
- Carousel for video testimonials
- Last-updated timestamp visible

## Anti-fraud safeguards

- All testimonials require linked booking ID (verified purchase)
- No anonymous testimonials (basic identity required)
- No incentivized 5-star reviews — wallet credit unconditional, regardless of rating
- Negative reviews published openly (3-5 visible per page) for credibility
- Reviewer email verified before publication

## SLA

- Testimonial request email sent: 48 hours post-puja completion
- Consent confirmation: within 7 days of customer reply
- Publication on Bhaktisetu surfaces: within 14 days of consent
- Removal upon revocation: within 7 days of request
