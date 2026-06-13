# 5 NPS Survey Templates — Per Touch Point

> For R-Q2-CS-001 NPS automation. Different surveys per customer journey stage.

## Template 1 — Post-Puja NPS (most critical)

**Trigger:** 24 hours after video proof viewed by devotee
**Subject:** "How was your {{puja name}} experience, {{first name}}?"

**Email body:**
```
Namaste {{first name}},

We hope the {{puja name}} ceremony at {{temple name}} brought peace and blessings to your family.

On a scale of 0-10, how likely are you to recommend Bhaktisetu to a friend or family member?

[0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
Not at all                                 Extremely

Click your rating above. Optional: share any specific feedback in the reply.

If 0-6 (detractor): "We'd love to make this right. Sunil (founder) will call within 24 hours."
If 7-8 (passive): "Thanks for the feedback. What's one thing we could improve?"
If 9-10 (promoter): "Thank you! Would you mind sharing your experience publicly? Reply YES and we'll send a quick form."

🙏
Team Bhaktisetu
bhaktisetu.com
```

**Schema:**
```typescript
{
  surveyType: 'post_puja',
  triggerEvent: 'video_proof_viewed',
  delayHours: 24,
  channel: ['email', 'whatsapp'],
  reminderCount: 1,
  reminderDelayDays: 3
}
```

## Template 2 — Post-Live-Darshan NPS

**Trigger:** Within 1 hour of darshan session end (user watched 5+ min)
**Subject:** "Quick question about today's {{temple}} darshan"

**Body:**
```
Namaste {{first name}},

You joined the live darshan from {{temple name}} today.

How would you rate the experience (0-10)?

[Rating buttons]

Optional: "What one thing would make our live darshan better?"

🙏
Team Bhaktisetu
```

## Template 3 — Post-AI-Pandit Subscription NPS (monthly)

**Trigger:** Day 30 of monthly subscription
**Subject:** "Your AI Pandit experience — month 1 check-in"

**Body:**
```
Namaste {{first name}},

You've been a Bhakti Pro subscriber for 30 days. How has the AI Pandit experience been?

Rate 0-10:
[Rating buttons]

Specifically helpful with: [checkboxes]
☐ Kundli interpretation
☐ Festival timing questions
☐ Sanskrit shloka clarification
☐ Ritual guidance
☐ Other: ___

Any specific question we should improve at?

🙏
Sunil + Team
```

## Template 4 — Post-Yatra-Package NPS

**Trigger:** 7 days after yatra completion
**Subject:** "Your {{yatra name}} pilgrimage — how was it?"

**Body:**
```
Namaste {{first name}},

We hope your {{yatra name}} pilgrimage was deeply meaningful.

Rate the overall experience (0-10):
[Rating buttons]

Per-aspect quick rating:
- Tour coordinator: [1-5]
- Hotel accommodations: [1-5]
- Pandit at temple stops: [1-5]
- Transportation: [1-5]
- Overall value for money: [1-5]

Optional: "What was the best moment of your yatra?"
Optional: "What's one thing we could improve?"

🙏
Bhaktisetu Yatra Team
```

## Template 5 — Quarterly Active-Customer NPS

**Trigger:** Quarterly cron (Jan/Apr/Jul/Oct 1st) for users active in last 60 days
**Subject:** "Quick 30-second check-in from Bhaktisetu"

**Body:**
```
Namaste {{first name}},

Quarterly check-in from the team building Bhaktisetu.

On a scale of 0-10, how likely are you to recommend Bhaktisetu to a friend or family member?

[Rating buttons]

Specifically, in the last quarter:
- Did you book any pujas? [YES/NO]
- Did you use AI Pandit? [YES/NO]
- Did you watch live darshan? [YES/NO]
- Did you face any issues? [YES/NO + optional details]

Optional: "What's one specific thing you'd like us to build next?"

🙏
Sunil Kumar
Founder, Bhaktisetu Foundation
```

## Common features across all 5

### Detractor follow-up (0-6 ratings)
- Automated email to founder within 1 hour
- Founder personal call within 24 hours
- Wallet credit ₹500 issued as gesture
- Issue logged in detractor-themes database
- Quarterly LLM-classification of detractor themes for product backlog

### Promoter follow-up (9-10 ratings)
- Auto-email asking if testimonial can be shared
- Auto-add to potential testimonial pool
- Quarterly NPS top-promoter "ambassador" program eligibility
- Wallet credit ₹100 for promoters who agree to share testimonial

### Privacy
- Survey requires opt-in (default = YES at signup, easily togglable)
- One survey per customer per 90 days max (avoid fatigue)
- All ratings stored in NpsResponse table per R-Q2-CS-001 schema
- LLM classification anonymises before processing

## Survey delivery channels

- Email primary (via Resend transactional)
- WhatsApp secondary (per R-Q1-M-010 WA Cloud) for engaged users only
- In-app prompt for active users (post-booking flow)
- SMS only for low-rating follow-ups (high cost, founder direct outreach)

## Quarterly analytics

Per quarter generate:
- Overall NPS score (promoter % - detractor %)
- Per-cohort breakdown (NRI vs India, new vs mature, by puja type)
- Top 3 detractor themes (auto-classified via LLM)
- Top 3 promoter themes (used in marketing testimonials)
- Quarter-over-quarter delta
- Action items for product backlog
