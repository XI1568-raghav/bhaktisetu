#!/usr/bin/env node
// Investor Agent — curated angel/VC targets + personalized intro draft per persona.
// Output: docs/agent-reports/YYYY-MM-DD-investor-pipeline.md
import { writeReport, TODAY, isoNow } from './_lib.mjs';

// Hand-curated set. Public info only. Stage + thesis fit reviewed.
const ANGELS = [
  { name: 'Kunal Shah', firm: 'CRED / angel', stage: 'pre-seed/seed', fit: 'Consumer India, retention, payments', warmIntros: 'CRED engineers, ex-Freecharge' },
  { name: 'Naval Ravikant', firm: 'AngelList', stage: 'seed', fit: 'Long-term, philosophical, India culture', warmIntros: 'Twitter DM with thoughtful 1-liner' },
  { name: 'Nithin Kamath', firm: 'Rainmatter', stage: 'seed/series A', fit: 'Indian context, social impact + commerce', warmIntros: 'Zerodha tech team' },
  { name: 'Sanjeev Bikhchandani', firm: 'Info Edge', stage: 'seed/A', fit: 'Marketplaces, India, content', warmIntros: 'Naukri, 99acres alumni' },
  { name: 'Anand Chandrasekaran', firm: 'angel', stage: 'pre-seed', fit: 'Consumer mobile, US-India', warmIntros: 'Ex-Snap/Bharti' },
];

const SEED_VCS = [
  { name: 'Blume Ventures', stage: 'seed', cheque: '$500K–$2M', thesis: 'India consumer + SaaS', portfolio: 'Dunzo, Purplle, IndiQube' },
  { name: 'Stellaris Venture Partners', stage: 'seed/A', cheque: '$1M–$5M', thesis: 'India-first consumer + AI', portfolio: 'Vogo, Sigmoid' },
  { name: 'Kalaari Capital', stage: 'seed/A', cheque: '$1M–$8M', thesis: 'Digital India consumer', portfolio: 'Cure.fit, Urban Ladder' },
  { name: '3one4 Capital', stage: 'seed', cheque: '$500K–$2M', thesis: 'Bharat consumer, fintech, content', portfolio: 'BetterPlace, DarwinBox' },
  { name: 'Inflection Point Ventures', stage: 'pre-seed/seed', cheque: '₹50L–₹3Cr', thesis: 'Idea–early consumer + SaaS', portfolio: '120+ companies' },
  { name: 'Better Capital', stage: 'pre-seed', cheque: '$100K–$500K', thesis: 'Pre-product/pre-revenue founders', portfolio: 'Open, Cashfree' },
  { name: 'WEH Ventures', stage: 'seed', cheque: '$250K–$1M', thesis: 'Consumer India', portfolio: 'Trell, Smallcase' },
  { name: 'India Quotient', stage: 'seed', cheque: '$500K–$1M', thesis: 'Bharat consumer mobile-first', portfolio: 'ShareChat, Roposo, Sugar' },
  { name: 'Speciale Invest', stage: 'pre-seed/seed', cheque: '$250K–$1M', thesis: 'Deep tech + emerging', portfolio: 'Wingman, Detect Technologies' },
  { name: 'Lightspeed India', stage: 'seed/A', cheque: '$2M–$10M', thesis: 'Consumer + enterprise India', portfolio: 'Udaan, Sharechat, Acko' },
];

const STRATEGIC = [
  { name: 'Rainmatter (Zerodha)', stage: 'seed', why: 'Social impact + finance angle (donations + 80G)' },
  { name: 'PeakXV (ex-Sequoia India)', stage: 'A+', why: 'Once at ~$3M ARR — Surge program' },
  { name: 'Z47 (ex-Matrix)', stage: 'A+', why: 'Once consumer flywheel proven — Cure.fit comparable' },
];

const PERSONA_PITCH = {
  consumerAngel: `**1-liner**: "Sri Mandir but with verified video proof + NRI USD billing + a real marketplace flywheel (pandits + temples + gaushalas + gurukuls)."

**3 numbers**: [bookings last 30d], [GMV ₹], [NRI %].

**Why now**: Sri Mandir at ₹350Cr ARR proves the wedge; we're #2 with vertical depth (gurukuls + Sanskrit + 80G) Sri Mandir won't build.

**Ask**: $250K SAFE at $4M cap.`,

  seedVC: `**Thesis fit**: India devotional commerce — $30B TAM, 8% online. Sri Mandir at ARR $40M validates. We pick the underserved long tail (gurukuls, learning, NRI premium).

**Traction proof points needed before raise**:
- 5K MAU sustained
- $10K MRR
- 30%+ NRI ARPU split
- 1 anchor temple chain partnership

**Round target**: $1.5M seed at $8M post.`,

  strategic: `**Strategic value**: Distribution into existing audiences (Zerodha social-impact arm, Razorpay devotional category, Cred Garage gifting).

**Ask**: Strategic check + integration + audience access.`,
};

async function run() {
  const body = `# Investor Pipeline — ${TODAY}

> Curated angel + seed VC targets for pre-revenue → seed raise. Personalized intro drafts per persona. Weekly refresh.

## Stage gate (current → ready)

- [ ] **Pre-revenue baseline** (today): demo accounts, 0 paying users, ship-ready product
- [ ] **Friends/family** ($50K-$150K): once 100 real signups + 5 bookings
- [ ] **Pre-seed** ($250K-$500K): once 5K MAU, $5K MRR, 4-week retention curve flat at 25%+
- [ ] **Seed** ($1.5M-$3M): once $25K MRR, NRI mix > 30%, anchor temple chain LOI

## Angels — first batch (Tier 1)

| Name | Firm | Stage | Why fit | Warm intro path |
|---|---|---|---|---|
${ANGELS.map((a) => `| ${a.name} | ${a.firm} | ${a.stage} | ${a.fit} | ${a.warmIntros} |`).join('\n')}

## Seed VCs (10)

| Fund | Stage | Cheque | Thesis | Portfolio signal |
|---|---|---|---|---|
${SEED_VCS.map((v) => `| ${v.name} | ${v.stage} | ${v.cheque} | ${v.thesis} | ${v.portfolio} |`).join('\n')}

## Strategic (Series A+)

${STRATEGIC.map((s) => `- **${s.name}** (${s.stage}) — ${s.why}`).join('\n')}

## Intro templates per persona

### Consumer angel (Kunal-style)

${PERSONA_PITCH.consumerAngel}

---

### Seed VC (Blume/Stellaris-style)

${PERSONA_PITCH.seedVC}

---

### Strategic (Rainmatter-style)

${PERSONA_PITCH.strategic}

## Pre-raise checklist

- [ ] **Deck v1** (12 slides max) — problem, why-now, solution, demo, market, business, traction, team, ask
- [ ] **Demo loop** — 90-sec screen recording: book puja → video proof → 80G receipt
- [ ] **Data room** — Notion site: financial model 3yr, cap table, KPIs weekly, prior commits
- [ ] **Reference checks** — 3 power users + 2 onboarded temples willing to talk
- [ ] **Press hits** — at least 1 YourStory or Inc42 mention (apply for emerging-startup features)
- [ ] **AngelList syndicate** — apply to syndicates run by Kunal, Nithin, or Naval — they auto-broadcast to 10K LPs
- [ ] **Tiger Twitter** — founders who tweet metrics weekly get unsolicited DMs from VCs

## Weekly cadence (this agent)

- **Mon**: Generate this list, identify 5 net-new targets
- **Tue**: Send 5 personalized outbound emails (don't mass)
- **Wed**: Follow up Mon's list
- **Thu**: Update data room with last week's metrics
- **Fri**: Public update tweet/LinkedIn — "Week in metrics"

## Cold-email rules

1. Subject line ≤ 5 words, lowercase, no \`!\`
2. First line: one specific reason for THIS person (not template)
3. Numbers in line 2 (3 max)
4. Ask is one line, one ask
5. Send Mon-Wed, 10am-12pm IST
6. No follow-up before day 4

---
*Agent: investor-pipeline · timestamp: ${isoNow()}*
`;

  writeReport('investor-pipeline', body);
  console.log('Investor pipeline refreshed.');
}

run().catch((e) => { console.error(e); process.exit(1); });
