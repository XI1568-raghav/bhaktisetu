# Enterprise Account Management Playbook

> Post-deal-close playbook for B2B enterprise accounts (TCS Diwali, ISKCON LoI, etc.). Foundation for renewal + expansion.

## Why this matters

- Enterprise deals require dedicated management beyond initial sale
- Renewal + expansion drives 70%+ of long-term ARR per typical B2B SaaS
- Single founder cannot manually manage 5-10 enterprise accounts at scale
- CS-ops contractor (R-Q2-HR-001) + Q4 hire (R-Q4-H-001) split this load

## Per-account framework (4 phases)

### Phase 1: Onboarding (Day 0-30)

**Goals**: Customer + Bhaktisetu align on success metrics + execution roadmap

**Activities**:
- Day 1: Welcome call + kickoff meeting (3-5 stakeholders from customer side)
- Day 1-7: Implementation milestone scoping + timeline agreement
- Day 7-14: Operational pilot launch (10K-50K first batch for TCS Diwali example)
- Day 14-30: First-week metric review + iteration
- Day 30: Onboarding completion sign-off + transition to Phase 2

**Founder/CS time**: 8-10 hours total over 30 days

### Phase 2: Operations (Day 30-90)

**Goals**: Steady-state execution + customer satisfaction + metric tracking

**Activities**:
- Weekly Tuesday 30-min sync call w/ customer ops lead
- Daily monitoring dashboard updates (booking volume, video proof compliance, refund rate)
- Monthly executive review (founder + customer leadership)
- Quarterly business review (QBR) — 60min strategic discussion
- Issue escalation matrix (any P0/P1 issue → founder direct response within 4hr)

**Founder/CS time**: 4-6 hours/month per account

### Phase 3: Optimization (Day 90-180)

**Goals**: Improve performance metrics + identify expansion opportunities

**Activities**:
- 90-day metric review against original goals
- Optimization opportunities identified (pricing, service tier, integration)
- Expansion conversations (e.g., TCS Diwali → TCS Holi + Independence Day)
- Customer advocacy (case study, testimonial, founder podcast guest)

**Founder/CS time**: 3-4 hours/month per account

### Phase 4: Renewal + Expansion (Day 180+)

**Goals**: Renewal contract + 20%+ ARR expansion

**Activities**:
- Pre-renewal milestone review (3-month and 1-month before contract end)
- Renewal proposal w/ pricing + service tier optimization
- Expansion scoping (additional locations, products, employee count)
- Multi-year contract opportunity (2-3 year renewal w/ price lock)

**Founder/CS time**: 8-10 hours per renewal cycle

## Account scoring framework

Per-quarter, score each account on:

| Dimension | Weight | Scoring 0-5 |
|---|---|---|
| Metric performance vs SLA | 25% | 5 = exceeds all | 4 = exceeds most | 3 = meets | 2 = misses some | 1 = misses many |
| Customer satisfaction (NPS) | 25% | 5 = NPS 70+ | 4 = 50-70 | 3 = 30-50 | 2 = 0-30 | 1 = negative |
| Operational health | 20% | 5 = zero incidents | 4 = 1-2 minor | 3 = some recurring | 2 = significant | 1 = ongoing crisis |
| Renewal probability | 20% | 5 = signed already | 4 = strong signal | 3 = TBD | 2 = at risk | 1 = decline imminent |
| Expansion potential | 10% | 5 = active discussion | 4 = identified | 3 = potential | 2 = unclear | 1 = none |

Total score interpretation:
- 22-25: Star account (rare, replicate)
- 17-21: Healthy account (steady management)
- 12-16: At-risk (escalate + recover plan)
- 7-11: Critical (founder intervention)
- 0-6: Termination conversation needed

## Per-account file structure

`docs/accounts/{customer-slug}/` contains:

```
account-summary.md          # 1-page overview
quarterly-review-history/   # QBR notes
onboarding-doc.md           # Original kickoff scope
sla-tracker.md              # Monthly SLA performance
incidents-log.md            # All incidents + resolutions
renewal-pipeline.md         # Next renewal date + projections
expansion-opportunities.md  # Identified expansion ideas
customer-contacts.md        # Names + roles + escalation paths
```

## Renewal pipeline view

`/admin/accounts` dashboard:

- All accounts listed by renewal date proximity
- Per-account scoring + trend (Green/Yellow/Red)
- Total ARR + renewal probability weighted
- Expansion opportunities highlighted
- Renewal conversations status

## Founder enterprise discipline

- Founder personally signs first 5 enterprise contracts
- Founder hosts QBR meetings (transition to CS-ops contractor Q3 only)
- Direct WhatsApp + email for any enterprise customer escalation
- Annual founder visit to top-3 enterprise customers (in-person trust)

## Enterprise pricing transparency

- All enterprise pricing documented per customer in /docs/accounts/
- Annual price reviews coordinated with renewal cycles
- No hidden fees — all included in transparent pricing
- Custom enterprise discounts approved by founder personally

## CS-ops contractor onboarding

When CS-ops contractor joins (per R-Q2-HR-001 + R-Q1-H-001 trigger):

- Shadow founder on 10 enterprise interactions
- Take ownership of 1 pilot account
- Founder reviews first 90 days
- Permanent ownership of 5+ accounts at scale

## Q4 + Year 2 scaling

- Hire dedicated Customer Success Manager (full-time)
- Account-Manager-per-3-enterprise-accounts ratio
- Sales engineer for technical integrations (Q1 2027)
- Account-management software adoption (Notion-based custom currently → Salesforce/HubSpot Q1 2027)

## Metrics that matter

- Net Revenue Retention (NRR): target 120%+ (expansion exceeds churn)
- Gross Revenue Retention (GRR): target 95%+ (low churn)
- Average contract value: target ₹5L+ for enterprise tier
- Time-to-value: target <30 days from contract signing
- Customer health score: target 75%+ accounts in Green tier

## Risks + mitigation

- **Risk**: Single customer concentration >30% of revenue
- **Mitigation**: Q3+ active diversification across 10+ enterprise accounts
- **Risk**: Founder bandwidth limit
- **Mitigation**: CS-ops contractor Q3 + dedicated CSM Q4
- **Risk**: Customer escalation crisis affecting brand
- **Mitigation**: Crisis comms playbook (per separate doc) + insurance backstop
