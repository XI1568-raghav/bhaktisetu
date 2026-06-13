# Agent Fleet Architecture Spec

> Comprehensive specification for Bhaktisetu's 28 daily AI agents. Foundation for Series A leverage story + scaling pattern.

## Why this matters

- 28 daily agents = solo founder operating at 10-person team velocity
- Series A pitch deck: "agent fleet" is differentiator vs traditional startups
- Foundation for Year 2 agent expansion (target: 50-60 daily agents)
- Cost-efficient operations (negligible incremental cost per agent)

## Current 28-agent fleet (per existing /admin/agents)

### Monitoring agents (5)
1. uptime-pinger — Health endpoint check every 5 min
2. broken-link — Daily crawl + report 404s
3. schema-validator — 14-URL JSON-LD validation
4. sentry-error-summary — Daily error pattern report
5. competitor-watch — RSS diff Sri Mandir + others

### SEO + content agents (8)
6. content-publisher — Daily MDX draft (per R-Q1-M-009)
7. gsc-submitter — Google Search Console auto-submit
8. indexnow-publisher — IndexNow API push
9. keyword-rank — 25 seed keywords daily tracking
10. backlinks-monitor — Backlink change report
11. founder-tweet-draft — Daily Twitter thread suggestion
12. founder-blog-draft — Weekly blog topic suggestion
13. review-harvest — Customer review aggregation

### Operational agents (6)
14. weekly-digest — Founder weekly digest
15. weekly-investor-update — Investor monthly summary
16. agent-issue-filer — Self-issuing GitHub issues
17. daily-cron — Daily ops cron (consultation expire, etc.)
18. pandit-no-show-alert — Pandit no-show pattern detection
19. video-proof-delay-alert — Video proof SLA monitor

### Drip campaign agents (7)
20. pundit-onboarding-drip — 5-email pandit onboarding
21. temple-onboarding-drip — 5-email temple onboarding
22. astrologer-onboarding-drip — 5-email astrologer onboarding
23. gaushala-onboarding-drip — 5-email gaushala onboarding
24. gurukul-onboarding-drip — 5-email gurukul onboarding
25. wellness-onboarding-drip — 5-email wellness onboarding
26. store-onboarding-drip — 5-email store onboarding

### CXO advisory agents (10 — monthly Monday cadence)
27. CXO-strategic-advisor (monthly)
28. CXO-technical-advisor (monthly)

## Architecture

### Infrastructure
- **Platform**: GitHub Actions cron jobs (free tier)
- **Concurrency**: Cron-scheduled to avoid simultaneous execution
- **Cost**: $0 ongoing (GitHub Actions free tier sufficient)
- **Failure**: Self-issuing GitHub issues for failed runs

### Code pattern
```yaml
# .github/workflows/agent-{name}.yml
name: agent-content-publisher
on:
  schedule:
    - cron: '0 6 * * *' # 6 AM IST daily
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm exec node scripts/agents/content-publisher/index.mjs
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Commit changes (if any)
        run: |
          git config user.name "Bhaktisetu Agent"
          git config user.email "agent@bhaktisetu.com"
          git add -A
          git commit -m "🤖 Agent: content-publisher daily run" || echo "No changes"
          git push
```

### Per-agent file structure
```
scripts/agents/
├── {agent-name}/
│   ├── index.mjs           # Main script
│   ├── prompts.mjs         # AI prompt templates
│   ├── output-schema.mjs   # Output validation
│   └── README.md           # Agent purpose + ownership
```

## Output destinations

- **GitHub repo commits** — content-publisher commits MDX drafts
- **docs/agent-reports/** — JSON output for /admin/agents UI
- **Slack #agents channel** — Real-time success/failure alerts
- **Email founder** — Weekly digest + critical alerts
- **/admin/agents UI** — Live agent status dashboard

## Year 2 expansion plan (target 50-60 agents)

### Q1 2027 (5 new agents)
- pandit-pipeline-health (verify KYC progress)
- temple-relationship-health (engagement scoring)
- bookings-funnel-anomaly (detect anomalies in funnel)
- nri-segment-growth (geo-specific analysis)
- referral-program-health (per R-Q2-M-011 monitoring)

### Q2 2027 (5 new agents)
- press-mentions-tracker (PR coverage aggregation)
- influencer-attribution (per R-Q4-M-009 tracking)
- AI-pandit-query-quality (sample 1% queries for quality)
- subscription-churn-prediction (early warning)
- enterprise-account-health-check (per R-Q4-SA-001)

### Q3 2027 (5 new agents)
- legal-compliance-monitor (DPDP + counsel signal scanning)
- vendor-health-monitor (Razorpay/Stripe/Resend SLA tracking)
- security-vulnerability-scan (weekly automated)
- cost-anomaly-detector (cloud + vendor cost spikes)
- competitive-product-feature-watch (new Sri Mandir / Utsav features)

### Q4 2027 (5 new agents)
- year-end-customer-NPS (annual quality measurement)
- investor-update-automation (monthly stats compilation)
- temple-partnership-scoring (anchor LoI pipeline)
- founder-content-calendar (weekly social content suggestion)
- internal-knowledge-base (Notion auto-update from operations data)

## Per-agent metadata schema

```json
{
  "agentId": "content-publisher",
  "version": "1.2",
  "owner": "founder@bhaktisetu.com",
  "schedule": "0 6 * * *",
  "purpose": "Daily MDX blog post draft generation",
  "lastRun": "2026-06-13T06:00:00Z",
  "lastSuccess": "2026-06-13T06:02:34Z",
  "lastFailure": null,
  "failureCount30Day": 1,
  "outputDestination": "docs/agent-reports/content-publisher-{date}.json",
  "alertChannels": ["slack:#agents", "email:founder"],
  "successCriteria": "MDX draft created OR explicit 'no new content' marker"
}
```

## Founder discipline + governance

- Weekly review of all agent runs (5 min)
- Failed agents auto-create GitHub issues
- Quarterly agent ROI assessment + retirement of low-value agents
- Annual agent fleet audit + roadmap planning
- New agent additions require founder approval

## Cost summary

- GitHub Actions: $0 (free tier)
- AI API costs: ~$10-20/mo (OpenAI + Groq + Cohere)
- Cron infrastructure: $0
- Founder time: 5-10 hours per week reviewing + iterating
- Total cost: <$30/month for ~28 daily agents

## ROI

- Solo founder operates at 10-person team velocity
- $30/mo agent cost vs ~₹15L+ team salary equivalent
- Series A pitch: "agent fleet" differentiator
- Mission alignment: agents serve devotee community 24/7

## Engineering tickets

- Quarterly: agent fleet expansion (5 new per quarter)
- Annually: agent fleet audit
- Per-agent: failure recovery + retry logic
- Per-agent: documentation update

## Risk + mitigation

- **Risk**: Agent generates inappropriate content
- **Mitigation**: Output gating + founder review
- **Risk**: Agent racks up API costs
- **Mitigation**: Cost alerts + rate-limit on AI calls
- **Risk**: Agent fails silently
- **Mitigation**: Self-issuing GitHub issues + Slack alerts
- **Risk**: Agent collisions (multiple agents touching same data)
- **Mitigation**: Scheduled offset; conflict-detection in code
