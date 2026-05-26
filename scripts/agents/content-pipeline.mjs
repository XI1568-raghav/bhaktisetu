#!/usr/bin/env node
// Content Agent — daily knowledge draft.
// Pulls today's panchang + suggests an article topic + draft outline.
// Output: docs/agent-reports/YYYY-MM-DD-content-draft.md
import { fetchJson, writeReport, TODAY, API_BASE } from './_lib.mjs';

const TOPICS = {
  Mon: { theme: 'Shiva', deity: 'Lord Shiva', knowledge: ['Rudra Suktam', 'Lingashtakam', 'Mahamrityunjaya'] },
  Tue: { theme: 'Hanuman', deity: 'Lord Hanuman', knowledge: ['Hanuman Chalisa', 'Sundara Kanda', 'Bajrang Baan'] },
  Wed: { theme: 'Ganesha', deity: 'Lord Ganesha', knowledge: ['Ganapati Atharvashirsha', 'Sankashti vrat'] },
  Thu: { theme: 'Guru / Vishnu', deity: 'Brihaspati & Vishnu', knowledge: ['Vishnu Sahasranama', 'Guru Stotram'] },
  Fri: { theme: 'Devi / Lakshmi', deity: 'Mahalakshmi', knowledge: ['Sri Suktam', 'Lalita Sahasranama'] },
  Sat: { theme: 'Shani', deity: 'Lord Shani', knowledge: ['Shani Stotram', 'Hanuman vrata for Shani'] },
  Sun: { theme: 'Surya', deity: 'Surya Bhagavan', knowledge: ['Aditya Hridayam', 'Surya Namaskar'] },
};

const SANSKRIT_SLOKAS = [
  { sloka: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः। सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत्॥', source: 'Brihadaranyaka Upanishad 1.4.14', english: 'May all be happy, may all be free from illness, may all see auspiciousness, may none suffer.' },
  { sloka: 'वसुधैव कुटुम्बकम्', source: 'Maha Upanishad 6.71', english: 'The whole world is one family.' },
  { sloka: 'सत्यमेव जयते', source: 'Mundaka Upanishad 3.1.6', english: 'Truth alone triumphs.' },
  { sloka: 'अहिंसा परमो धर्मः', source: 'Mahabharata 13.117.37', english: 'Non-violence is the highest dharma.' },
  { sloka: 'योगस्थः कुरु कर्माणि', source: 'Bhagavad Gita 2.48', english: 'Established in yoga, perform action.' },
];

const VED_ANGLES = [
  'Rigveda mandala overview', 'Yajurveda yajna procedures', 'Samaveda chant traditions',
  'Atharvaveda household sukthas', 'Upanishads — six classical', 'Vedanga sciences',
];

const SANATAN_THEMES = [
  'Dharma vs religion — civilizational view', '4 purusharthas explained', 'Ashramas of life',
  'Varna — original meaning vs colonial mistranslation', '16 samskaras', 'Pancha-mahabhuta',
];

function dayKey(d) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

async function run() {
  const dk = dayKey(new Date());
  const topic = TOPICS[dk];
  const sloka = SANSKRIT_SLOKAS[new Date().getDate() % SANSKRIT_SLOKAS.length];
  const vedAngle = VED_ANGLES[new Date().getDate() % VED_ANGLES.length];
  const sanatanTheme = SANATAN_THEMES[new Date().getDate() % SANATAN_THEMES.length];

  // Pull today's panchang for grounding.
  const p = await fetchJson(`${API_BASE}/api/v1/panchang/today?lat=28.6139&lng=77.2090`);
  const panchang = p.json?.panchang || p.json || {};

  const body = `# Content Drafts — ${TODAY} (${dk})

> Daily knowledge pipeline. 3 drafts/day: deity-of-day, Veda angle, Sanatan theme. Plus a Sanskrit shloka card.

## Today's deity (${topic.theme})

**Title suggestion**: "${topic.deity} — significance, practices for ${dk}day, and free chants"

**Outline**:
1. Why devotees worship ${topic.deity} on ${dk}day (scriptural source)
2. Daily 5-min practice (mantra + visualization)
3. Free downloadable: ${topic.knowledge.join(', ')}
4. Live darshan link — temples on Darshya broadcasting today
5. CTA: book a custom puja with a verified pandit (₹999 starting)

**Target keyword cluster**: \`${topic.deity.toLowerCase()} worship\`, \`${dk}day puja\`, \`${topic.knowledge[0].toLowerCase()} meaning\`

**Recommended slug**: \`/sanatan/${topic.theme.toLowerCase().replace(/\s.*/, '')}-${dk.toLowerCase()}day-guide\`

---

## Veda angle

**Title suggestion**: "${vedAngle} — beginner-friendly walkthrough"

**Outline**:
1. What it is (one paragraph, no Sanskrit jargon until defined)
2. Historical context (date range, regions, surviving recensions)
3. Three core ideas (with one shloka each)
4. Modern relevance — one practice or insight to take today
5. Reading order if user wants to go deeper
6. CTA: enroll in Darshya's free Sanskrit foundations (10 lessons)

**Target keyword cluster**: \`${vedAngle.toLowerCase()}\`, \`learn ved online\`, \`vedic knowledge for beginners\`

**Recommended slug**: \`/ved/${vedAngle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}\`

---

## Sanatan theme

**Title suggestion**: "${sanatanTheme} — civilizational perspective"

**Outline**:
1. Hook (a misconception or modern question)
2. Source texts and where to read them
3. Lived practice — examples from temples, festivals, householders
4. Why it still matters in 2026
5. Further reading
6. CTA: subscribe to Darshya weekly digest

**Target keyword cluster**: \`${sanatanTheme.toLowerCase()}\`, \`sanatan dharma meaning\`, \`hindu philosophy explained\`

**Recommended slug**: \`/sanatan/${sanatanTheme.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}\`

---

## Shloka card (social asset)

> **${sloka.sloka}**
>
> — ${sloka.source}
>
> *${sloka.english}*

**Use for**: Instagram + Twitter + WhatsApp status. Pair with deity-of-day banner.

---

## Today's panchang grounding

\`\`\`json
${JSON.stringify(panchang, null, 2).slice(0, 1200)}
\`\`\`

---

## Distribution checklist

- [ ] Publish all 3 drafts to MDX (\`apps/web/content/{sanatan,ved,knowledge}\`)
- [ ] Cross-post deity post to Instagram + Twitter
- [ ] Add to WhatsApp broadcast (when U7 unblocks)
- [ ] Internal-link from \`/knowledge\` hub
- [ ] Submit URL to GSC indexing API

---
*Agent: content-pipeline*
`;

  writeReport('content-draft', body);
  console.log(`Content drafts written for ${dk}.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
