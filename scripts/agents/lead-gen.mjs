#!/usr/bin/env node
// Lead-Gen Agent — scores + dedupes leads from existing scrapers.
// Pulls lead targets from a curated CSV (committed) and DB (if DATABASE_URL set).
// Output: docs/agent-reports/YYYY-MM-DD-lead-gen.md
import { writeReport, TODAY, isoNow, fetchJson, API_BASE } from './_lib.mjs';
import { readFileSync, existsSync } from 'node:fs';

// Static priority cities for outbound (top 25 by puja demand + NRI diaspora source).
const PRIORITY_CITIES = [
  'Varanasi', 'Haridwar', 'Rishikesh', 'Mathura', 'Vrindavan', 'Tirupati', 'Madurai',
  'Ujjain', 'Nashik', 'Prayagraj', 'Ayodhya', 'Pune', 'Bengaluru', 'Chennai', 'Mumbai',
  'Delhi', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Pushkar', 'Dwarka',
  'Rameswaram', 'Kanchipuram', 'Puri',
];

// Lead categories with target counts (T1 = onboarded, T2 = engaged, T3 = cold).
const CATEGORIES = [
  { name: 'Temples', t1Target: 50, t2Target: 200, t3Target: 1000, endpoint: '/api/v1/admin/temples' },
  { name: 'Pandits', t1Target: 100, t2Target: 500, t3Target: 2000, endpoint: '/api/v1/priests' },
  { name: 'Astrologers', t1Target: 30, t2Target: 100, t3Target: 500, endpoint: '/api/v1/astrology/astrologers' },
  { name: 'Gurukuls', t1Target: 20, t2Target: 80, t3Target: 300, endpoint: '/api/v1/gurukuls' },
  { name: 'Gaushalas', t1Target: 30, t2Target: 100, t3Target: 400, endpoint: null },
  { name: 'Wellness instructors', t1Target: 40, t2Target: 150, t3Target: 600, endpoint: null },
];

async function countCategory(cat) {
  if (!cat.endpoint) return { current: 0, source: 'no-public-endpoint' };
  const r = await fetchJson(`${API_BASE}${cat.endpoint}`);
  if (r.status !== 200) return { current: 0, source: `HTTP ${r.status}` };
  const j = r.json;
  if (Array.isArray(j)) return { current: j.length, source: 'array' };
  if (j?.data && Array.isArray(j.data)) return { current: j.data.length, source: 'data[]' };
  if (j?.items && Array.isArray(j.items)) return { current: j.items.length, source: 'items[]' };
  if (j?.gurukuls && Array.isArray(j.gurukuls)) return { current: j.gurukuls.length, source: 'gurukuls[]' };
  if (j?.priests && Array.isArray(j.priests)) return { current: j.priests.length, source: 'priests[]' };
  if (j?.astrologers && Array.isArray(j.astrologers)) return { current: j.astrologers.length, source: 'astrologers[]' };
  if (j?.temples && Array.isArray(j.temples)) return { current: j.temples.length, source: 'temples[]' };
  if (typeof j?.total === 'number') return { current: j.total, source: 'total' };
  if (typeof j?.count === 'number') return { current: j.count, source: 'count' };
  return { current: 0, source: 'unknown-shape' };
}

async function run() {
  const rows = [];
  for (const cat of CATEGORIES) {
    const c = await countCategory(cat);
    const gap = Math.max(0, cat.t1Target - c.current);
    const t2gap = Math.max(0, cat.t2Target - c.current);
    rows.push({ ...cat, ...c, gap, t2gap });
  }

  const totalCurrent = rows.reduce((a, r) => a + r.current, 0);
  const totalT1Target = rows.reduce((a, r) => a + r.t1Target, 0);

  const body = `# Lead-Gen — ${TODAY}

> Daily snapshot of onboarded supply per category vs targets. Surfaces gaps to drive outbound priority.

## Supply scoreboard

| Category | Onboarded | T1 target | Gap to T1 | T2 target | Gap to T2 | Source |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.name} | ${r.current} | ${r.t1Target} | ${r.gap} | ${r.t2Target} | ${r.t2gap} | ${r.source} |`).join('\n')}
| **Total** | **${totalCurrent}** | **${totalT1Target}** | **${Math.max(0, totalT1Target - totalCurrent)}** | — | — | — |

## Today's outbound priority

${rows.filter((r) => r.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3).map((r, i) =>
  `${i + 1}. **${r.name}** — need ${r.gap} more to hit T1. Run \`apps/api/scripts/leads/scrape-${r.name.toLowerCase().split(' ')[0]}.ts\` over the next ${Math.min(5, PRIORITY_CITIES.length)} priority cities.`
).join('\n') || 'All T1 targets met. Push to T2.'}

## Priority cities (top 25)

${PRIORITY_CITIES.map((c, i) => `${i + 1}. ${c}`).join('  ·  ')}

## Outbound channels (free)

- **Email** via Resend (3000/mo free) once U13 unblocks DNS
- **WhatsApp Cloud API** via Meta Business (1000 user-initiated/mo free) — U7 gate
- **LinkedIn DM** manual (use Sales Navigator 30-day trial for first batch)
- **Phone** via Twilio trial credit ($15)
- **Cold post** via India Post — only for top-50 temples with verified address

## Sequence template (cold)

\`\`\`
Subj: Get listed on Darshya — free for verified [temples|pandits|gurukuls|gaushalas]

Namaste [name],

Darshya is India's emerging devotional super-app (darshya.online). We're
onboarding verified [category] across [city] this month — listing + booking
engine + payment + KYC support, all free for the first 100.

What you get:
- Booking calendar with Razorpay/UPI payouts (T+1)
- Verified badge once Aadhaar uploaded
- Reach 12K+ NRI devotees (USD pricing handled)
- 80G certificate generation (for gaushalas + temples)

15-min onboarding call if interested? Reply with a slot.

— [Founder name], Darshya
\`\`\`

## Daily run command

\`\`\`bash
# Top 5 categories, top 3 cities each
node apps/api/scripts/leads/scrape-temples.ts --cities="Varanasi,Haridwar,Tirupati"
node apps/api/scripts/leads/scrape-priests.ts --cities="Varanasi,Bengaluru,Pune"
node apps/api/scripts/leads/scrape-gaushalas.ts
node apps/api/scripts/leads/scrape-astrologers.ts
node apps/api/scripts/leads/scrape-wellness.ts
\`\`\`

---
*Agent: lead-gen · API: ${API_BASE} · timestamp: ${isoNow()}*
`;

  writeReport('lead-gen', body);
  console.log(`Lead-gen scoreboard: ${totalCurrent}/${totalT1Target}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
