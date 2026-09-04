#!/usr/bin/env node
// Social Agent — generates 7-day social post queue (Twitter + LinkedIn + Instagram caption).
// No posting — drafts only. User pastes into Buffer free or schedule manually.
// Output: docs/agent-reports/YYYY-MM-DD-social-queue.md
import { writeReport, TODAY, isoNow, fetchJson, API_BASE } from './_lib.mjs';
// TC-01 / TC-08 — the 80G deduction and the pandit vetting process are both
// unbacked; see ./_claims.mjs. This queue is copy the founder pastes into a
// public post, so it is gated at the template rather than typed.
import { PANDIT_TRUST_SHORT, withEightyG } from './_claims.mjs';

const SLOTS = ['9:00 IST', '13:00 IST', '19:00 IST'];

const HOOKS = [
  { type: 'shloka', template: '🕉️ Shloka of the day\n\n{sanskrit}\n\n{english}\n\n— {source}\n\n#sanatandharma #sanskrit #wisdom' },
  { type: 'practice', template: "5-minute morning practice for {weekday}day:\n\n1. Light a diya\n2. Chant {mantra} (108x)\n3. Offer fresh water\n4. 2 min of silence\n\nThat's it. Try for 7 days.\n\n#sanatandharma #dailypractice" },
  { type: 'temple', template: '🛕 Did you know?\n\n{templeFact}\n\nLive darshan available on Darshya: darshya.online/temples\n\n#templesofindia #livedarshan' },
  { type: 'NRI', template: `For NRIs missing home:\n\nBook a Ganga aarti puja in Varanasi from anywhere in the world. ${PANDIT_TRUST_SHORT}. Fixed USD price, no surprise commission.\n\nStarting $49.\n\ndarshya.online/pujas\n\n#NRI #devotional #puja` },
  { type: 'gurukul', template: '📚 Free Sanskrit & Vedic learning\n\n10-lesson foundation course. No login required.\n\nStart: darshya.online/learn-sanskrit\n\n#sanskrit #vedic #learnonline' },
  { type: 'gaushala', template: `🐄 Adopt a cow.\n\n₹2,000/month feeds 1 gau-mata. ${withEightyG('80G certificate within 24 hours.', 'Numbered receipt PDF by email \u2014 proof of payment, not a tax certificate.')}\n\nVerified gaushalas only on Darshya.\n\ndarshya.online/gaushalas\n\n#gauseva${withEightyG(' #80G')} #donation` },
  { type: 'founder', template: 'Building Darshya in public — week update:\n\n- {weeklyWin}\n- {weeklyLearning}\n- {weeklyAsk}\n\n#buildinpublic #indianstartup' },
];

const TEMPLE_FACTS = [
  'Brihadeeswara temple in Tanjore was built in 1010 CE. Its 216-ft vimana casts no shadow at noon.',
  'The Sun Temple at Konark is a 13th-century chariot of Surya with 24 carved wheels showing time.',
  'Kashi Vishwanath has been rebuilt 7 times. The current structure dates to 1780.',
  'Padmanabhaswamy temple in Trivandrum holds vaults estimated to contain ₹1 lakh crore in treasures.',
  'Jagannath temple in Puri changes its idol every 12-19 years in a ritual called Nabakalebara.',
  'Madurai Meenakshi temple has 14 gopurams; the tallest is 170 ft, covered in 33,000 sculptures.',
  'The Ranganathaswamy temple at Srirangam covers 156 acres — the largest functioning Hindu temple complex.',
];

const MANTRAS = ['Om Namah Shivaya', 'Om Hanumate Namah', 'Om Gam Ganapataye Namah', 'Om Namo Narayanaya', 'Om Hreem Mahalakshmyai Namah', 'Om Sham Shanaishcharaya Namah', 'Om Suryaya Namah'];
const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur'];

async function run() {
  const start = new Date();
  const queue = [];

  for (let d = 0; d < 7; d++) {
    const day = new Date(start.getTime() + d * 86400000);
    const wd = day.getDay();
    const dateStr = day.toISOString().slice(0, 10);

    for (let s = 0; s < SLOTS.length; s++) {
      const hookIdx = (d * SLOTS.length + s) % HOOKS.length;
      const hook = HOOKS[hookIdx];
      let body = hook.template;
      body = body.replace('{weekday}', WEEKDAYS[wd]);
      body = body.replace('{mantra}', MANTRAS[wd]);
      body = body.replace('{templeFact}', TEMPLE_FACTS[d % TEMPLE_FACTS.length]);
      body = body.replace('{sanskrit}', 'सत्यमेव जयते');
      body = body.replace('{english}', 'Truth alone triumphs.');
      body = body.replace('{source}', 'Mundaka Upanishad 3.1.6');
      body = body.replace('{weeklyWin}', '(your win — e.g. "30 new signups, 2 NRI bookings")');
      body = body.replace('{weeklyLearning}', '(your learning — e.g. "Onboarding drop-off at Aadhaar step")');
      body = body.replace('{weeklyAsk}', '(your ask — e.g. "Anyone know a temple chain in Tamil Nadu we should partner with?")');

      queue.push({ date: dateStr, slot: SLOTS[s], type: hook.type, body });
    }
  }

  const body = `# Social Queue — ${TODAY} (7 days, ${queue.length} posts)

> Daily agent. Generates 7 days × 3 slots = 21 posts. Paste into Buffer (free 10-post plan) or Hootsuite trial. Twitter + LinkedIn + Instagram caption.

## Posting cadence

- **Twitter**: all 21 (cheap real estate)
- **LinkedIn**: type=NRI / gurukul / founder (12/week — keeps professional)
- **Instagram**: type=shloka / temple / gaushala (9/week — visual-heavy)

## Schedule

${queue.map((q, i) => `### ${i + 1}. ${q.date} · ${q.slot} · ${q.type}

\`\`\`
${q.body}
\`\`\`
`).join('\n')}

## Free posting tools

- **Buffer free** — 3 channels, 10 scheduled posts → re-queue weekly
- **Hootsuite 30-day trial** — full automation, then downgrade
- **Typefully** — Twitter threads + auto-DM new followers
- **Metricool free** — IG + LinkedIn scheduler, 50 posts/month

## Image asset prompts (use Bing Create / DALL-E free)

- "Devotional sunrise over Kashi ghats, hand-painted style, vertical 9:16 for IG story"
- "Sanskrit shloka card on textured saffron background, gold border, 1080x1080"
- "Modern minimal infographic: 3 steps to book a temple puja online, Devanagari + English"

## Cross-post checklist

- [ ] Save all 21 to Buffer
- [ ] Mark Mon/Wed/Fri slots for IG reels (record once weekly, 30s each)
- [ ] Pin best-performing tweet of the week to profile
- [ ] DM 5 followers who liked the founder-update post

---
*Agent: social-queue · timestamp: ${isoNow()}*
`;

  writeReport('social-queue', body);
  console.log(`Queued ${queue.length} posts for 7 days.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
