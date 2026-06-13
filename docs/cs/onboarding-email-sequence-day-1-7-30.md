# Devotee Onboarding Email Sequence — Day 1 / 7 / 30

> 3-email onboarding flow for new Bhaktisetu signups. Drives Day-30 retention from 42% → 60% target.

## Day 0 — Account creation confirmation (immediate)

**Subject:** "Welcome to Bhaktisetu, {{first name}} — your spiritual journey begins"

```
Namaste {{first name}},

Welcome to Bhaktisetu Foundation 🙏

You've joined 5,000+ devotee families using verified pandit pujas + live darshan from India temples globally.

Three quick things to do in your first 24 hours:

1. **Browse our verified pandits** — bhaktisetu.com/pandits
   100+ Aadhaar-verified pandits across 7 Indian cities. Each with 5+ years experience and 2 reference video proofs.

2. **Watch live darshan** — bhaktisetu.com/today
   Multiple temples stream daily aartis live. NRI-friendly with IST timezone display.

3. **Set your notification preferences** — bhaktisetu.com/profile/notifications
   Daily aarti reminder, festival alerts, booking updates — customize what reaches your inbox.

If you have any questions, reply directly to this email or WhatsApp +91-XXXXX-XXXXX.

🙏
Sunil Kumar
Founder, Bhaktisetu Foundation
```

## Day 1 — First booking nudge (24 hours after signup)

**Subject:** "Try your first puja, {{first name}} — first booking is on us"

```
Namaste {{first name}},

You signed up yesterday. We want to make sure your first puja experience is exceptional.

**First-time booking benefit:**
- Use code FIRSTPUJA at checkout for ₹500 off your first booking
- Valid through {{date 7 days from signup}}
- Applies to any puja above ₹2,000 value

**Most popular pujas for new devotees:**

🪔 **Rudrabhishek at Kashi** (₹2,500 → ₹2,000 with code)
   Lord Shiva's foremost ritual. 90-minute live ceremony with 24hr video proof.

🌺 **Satyanarayan Puja** (₹3,000 → ₹2,500 with code)
   Family well-being and prosperity. Held at home or your chosen India temple.

✨ **Lakshmi Puja** (₹2,000 → ₹1,500 with code)
   Auspicious for new beginnings, business, financial well-being.

**How it works:**
1. Browse pujas → pick one
2. Add code FIRSTPUJA at checkout
3. We schedule pandit + send 24hr video proof
4. 80G receipt auto-issued

Your spiritual journey shouldn't have to wait. Book your first puja today.

bhaktisetu.com/pujas

🙏
Team Bhaktisetu
```

## Day 7 — Engagement check-in (1 week after signup)

**Subject:** "How's your first week going, {{first name}}?"

```
Namaste {{first name}},

Your first week with Bhaktisetu. Quick check-in.

**Have you used the platform yet?**

If YES — wonderful. Let us know what's been most useful:
[Reply with: "1" for live darshan was helpful]
[Reply with: "2" for found relevant pujas]
[Reply with: "3" for AI Pandit helped]
[Reply with: "4" for other (please share)]

If NO — that's okay too. Common reasons people pause:

❓ "Can't find the right puja" → 
   → Browse our /faqs page for "How to choose a puja"
   → Or reply with what life event/intention you're praying for — we'll match a puja for you

❓ "Pricing felt high" → 
   → We have free AI Pandit consultations
   → Use code FIRSTPUJA for ₹500 off your first booking (still valid)

❓ "Concerns about pandit verification" → 
   → All our pandits are Aadhaar-verified with 5+ years experience
   → 24hr video proof is included in every booking
   → Bhaktisetu is Section 8 (non-profit) registered with MCA

❓ "Just exploring for now" → 
   → No pressure. We're here when you're ready.
   → Browse daily aartis at /today for ongoing spiritual content

Reply to this email or WhatsApp +91-XXXXX-XXXXX if you have any questions.

🙏
Sunil Kumar
Founder, Bhaktisetu
```

## Day 30 — Long-term engagement (1 month after signup)

**Subject:** "{{first name}}, a personal note from the founder"

```
Namaste {{first name}},

A personal note as you complete 30 days with Bhaktisetu Foundation.

Whether you've booked pujas, watched live darshans, used AI Pandit, or simply browsed — you're now part of a community of 5,000+ Hindu families committed to verified, trustworthy devotional experiences.

**Three asks of you for the next 30 days:**

1. **Tell us how to serve you better.**
   Reply to this email with: what spiritual need is currently unmet for you and your family? We genuinely read every response.

2. **Share with one Hindu family who'd benefit.**
   Your referral code: {{user_referral_code}}
   For every friend who books a paid puja using your code, you get ₹100 wallet credit + they get ₹100 first-puja credit.

3. **Subscribe to Bhakti Pro** ({{₹199/mo)
   Unlimited AI Pandit Q&A, daily personalized horoscope, premium darshan streams.
   First month free with code FIRSTMONTH (use at bhaktisetu.com/subscribe).

**A note from me personally:**
I built Bhaktisetu because my brother in San Francisco kept asking me to book pujas for our parents in Bengaluru. Existing options were sketchy WhatsApp middlemen with no verification.

If we've served you well, please tell others. If we haven't, please tell me — I'll personally make it right.

🙏
Sunil Kumar
Founder & CEO, Bhaktisetu Foundation
+91-XXXXX-XXXXX (direct WhatsApp)
founder@bhaktisetu.com
```

## Implementation

```typescript
// apps/api/src/services/onboarding-emails.ts
import { Queue } from 'bullmq' // per R-Q2-E-012

const emailQueue = new Queue('email')

// On signup
export async function scheduleOnboardingFlow(userId: string, signupAt: Date) {
  await emailQueue.add('day0_welcome', { userId }, { delay: 0 })
  await emailQueue.add('day1_first_booking', { userId }, { delay: 24 * 60 * 60 * 1000 })
  await emailQueue.add('day7_engagement', { userId }, { delay: 7 * 24 * 60 * 60 * 1000 })
  await emailQueue.add('day30_long_term', { userId }, { delay: 30 * 24 * 60 * 60 * 1000 })
}
```

## Anti-pattern guard

- Skip Day 1 email if user already booked within 24hr
- Skip Day 7 email if user has booked 2+ times (already engaged)
- Skip Day 30 email if user unsubscribed earlier
- Unsubscribe link in every email

## Metrics to track

- Day 0 open rate
- Day 1 first-booking conversion (target 8%)
- Day 7 engagement reply rate (target 12%)
- Day 30 retention (booking in last 30 days) target 60%

## Channels

- Email primary (Resend transactional)
- WhatsApp Day 1 + Day 7 as gentle nudge for high-engagement segments
- In-app banner Day 30 for returning users (Bhakti Pro promotion)
