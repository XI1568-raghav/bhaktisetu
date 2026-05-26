#!/usr/bin/env node
// PR Agent — generates press list + 3 pitch angles per outlet.
import { writeReport, TODAY, isoNow } from './_lib.mjs';

const OUTLETS = [
  { name: 'YourStory', beat: 'Indian startups', writer: 'Sindhu Kashyaap (consumer)', angle: 'pre-revenue traction stories' },
  { name: 'Inc42', beat: 'Indian startups', writer: 'Apoorva Mittal (D2C/consumer)', angle: 'cultural-tech category creation' },
  { name: 'ET Tech', beat: 'startup deals + product launches', writer: 'Beena Parmar', angle: 'NRI-focused India tech' },
  { name: 'TechCrunch India', beat: 'global tech reach', writer: 'Manish Singh', angle: 'India devotional + cultural commerce' },
  { name: 'The Ken', beat: 'paid analysis pieces', writer: 'Pratap Vikram Singh', angle: 'Sri Mandir vs Darshya — category dynamics' },
  { name: 'Moneycontrol Tech', beat: 'startup business stories', writer: 'consumer beat desk', angle: 'NRI premium tier economics' },
  { name: 'Hindu Business Line', beat: 'business + cultural angles', writer: 'tech beat', angle: 'gurukul digitization' },
  { name: 'Live Mint Lounge', beat: 'lifestyle + culture', writer: 'lifestyle desk', angle: 'how Gen-Z reconnects with Sanatan' },
  { name: 'Swarajya Magazine', beat: 'dharmic perspective', writer: 'tech + culture desk', angle: 'Sanskrit + Veda revival as product' },
  { name: 'OpIndia', beat: 'dharmic + civic', writer: 'tech desk', angle: 'tech serving Hindu civilizational continuity' },
];

const PITCH_ANGLES = [
  {
    title: "The NRI economics no one's talking about",
    hook: "NRI devotees pay 9-10x domestic for the same puja. Annual plan at $399 has 80% margin. Sri Mandir hasn't built USD billing — this is a real gap.",
    proof: ['NRI ARPU split', 'Annual plan retention', 'CAC payback < 60 days'],
  },
  {
    title: "A gurukul marketplace, built for Bharat 2026",
    hook: "For the first time, families can browse 100+ verified gurukuls (residential + online), filter by tradition + age, and apply in 3 minutes. Admissions used to take 6 months.",
    proof: ['Gurukul count onboarded', 'Applications submitted', 'First admission confirmed'],
  },
  {
    title: "Video proof — the trust unlock devotional tech missed",
    hook: "Every puja booking gets verified video proof within 24h. Repeat-booking rate is 4x higher for users who received clear video.",
    proof: ['Video proof completion %', 'Repeat-booking rate', 'NPS difference'],
  },
];

async function run() {
  const body = `# PR Outreach — ${TODAY}

> Weekly press list + tested pitch angles. 3 active hooks. Pitch one outlet at a time, never bulk.

## Outlets (10, ranked by fit)

| Outlet | Beat | Writer | Best angle |
|---|---|---|---|
${OUTLETS.map((o) => `| ${o.name} | ${o.beat} | ${o.writer} | ${o.angle} |`).join('\n')}

## Active pitch angles

${PITCH_ANGLES.map((p, i) => `### ${i + 1}. ${p.title}

**Hook**: ${p.hook}

**Required proof** (need these numbers before pitching):
${p.proof.map((x) => `- ${x}`).join('\n')}
`).join('\n')}

## Cold pitch template

\`\`\`
Subj: [outlet-specific 5-word hook]

Hi [first name],

I'm building Darshya (darshya.online) — short version: [pitch hook adapted to outlet].

The story angle that I think fits [outlet]: [angle].

Three data points:
- [proof 1]
- [proof 2]
- [proof 3]

If interesting, happy to do a 15-min call this week. Demo: [90-sec loom].

Thanks,
[Founder name]
[Phone]
\`\`\`

## Weekly cadence

- **Mon**: Pick one outlet, send tailored pitch
- **Wed**: Reply to anyone who engaged, send to outlet #2
- **Fri**: Soft follow-up on Monday's, send to outlet #3

## Free tools

- **HARO** (helpareporter.com) — daily journalist queries, reply if relevant
- **Qwoted** — similar to HARO
- **Twitter advanced search** — find journalists tweeting about Sri Mandir, AppsForBharat, devotional tech; reply with 1 useful insight
- **Founders India WhatsApp group** — get warm intros via founder community

## Founder content cadence (own channel)

- **Twitter**: 1 thread/week — "What we shipped this week"
- **LinkedIn**: 1 longform/week — "Building Darshya: month X retrospective"
- **YouTube short**: 1/week — 60-sec demo of a feature
- **Substack**: optional — monthly investor update made public

---
*Agent: pr-outreach · timestamp: ${isoNow()}*
`;

  writeReport('pr-outreach', body);
  console.log('PR outreach kit written.');
}

run().catch((e) => { console.error(e); process.exit(1); });
