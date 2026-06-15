#!/usr/bin/env node
// YouTube content planner agent — R-Q2-M-009
// Deterministic 4-week content slate generator for Bhaktisetu YouTube channel.
// Outputs: docs/agent-reports/YYYY-MM-DD-youtube-content-plan.md
// No LLM calls. No YouTube API calls. Pure templating from rotating seed lists.
// Run weekly (founder-triggered). Zero free-tier impact.

import { writeReport, upsertLog, TODAY } from '../_lib.mjs';

// 12-week rotation of how-to-puja explainer topics. Long-tail SEO + scriptural.
const HOWTO_PUJAS = [
  { slug: 'rudrabhishek', title: 'Rudrabhishek at home — step-by-step', deity: 'Shiva', duration: '12-15 min', samagri: ['panchamrit', 'bilva patra', 'rudraksha', 'water'] },
  { slug: 'satyanarayan-katha', title: 'Satyanarayan Katha — full vidhi with mantras', deity: 'Vishnu', duration: '15-20 min', samagri: ['panchamrit', 'banana leaves', 'kalava', 'fruits'] },
  { slug: 'navagraha-puja', title: 'Navagraha puja — pacify all 9 planets', deity: 'Navagraha', duration: '12-15 min', samagri: ['9 colored cloths', 'navadhanya', 'panchamrit'] },
  { slug: 'griha-pravesh', title: 'Griha Pravesh — complete housewarming ritual', deity: 'Ganesha + Lakshmi', duration: '15-20 min', samagri: ['coconut', 'kalash', 'turmeric', 'rangoli'] },
  { slug: 'lakshmi-puja-diwali', title: 'Lakshmi Puja on Diwali — house + business', deity: 'Lakshmi', duration: '12-15 min', samagri: ['silver coins', 'kheel-batashe', 'lotus', 'diyas'] },
  { slug: 'durga-saptashati-path', title: 'Durga Saptashati path — 700 verses guide', deity: 'Durga', duration: '15-20 min', samagri: ['red flowers', 'sindoor', 'chunni', 'kalash'] },
  { slug: 'hanuman-chalisa-vidhi', title: 'Hanuman Chalisa — correct vidhi for max benefit', deity: 'Hanuman', duration: '10-12 min', samagri: ['sindoor', 'chola', 'jasmine oil', 'gud-chana'] },
  { slug: 'mahamrityunjaya-japa', title: 'Mahamrityunjaya Japa — 108 chant procedure', deity: 'Shiva', duration: '10-12 min', samagri: ['rudraksha mala', 'bilva patra', 'water', 'flowers'] },
  { slug: 'ganesh-chaturthi-sthapana', title: 'Ganesh Chaturthi — pranpratishtha + visarjan', deity: 'Ganesha', duration: '15-20 min', samagri: ['modak', '21 durva', 'red flowers', 'kalash'] },
  { slug: 'kaal-sarp-dosh-puja', title: 'Kaal Sarp Dosh remedy — Trimbakeshwar style', deity: 'Shiva + Nagas', duration: '12-15 min', samagri: ['silver naga', 'milk', 'panchamrit', 'bilva'] },
  { slug: 'shraadh-pitra-paksh', title: 'Shraadh ritual — Pitra Paksha complete guide', deity: 'Pitras', duration: '15-20 min', samagri: ['black sesame', 'rice balls', 'water', 'kusha grass'] },
  { slug: 'mangal-dosh-shanti', title: 'Mangal Dosh Shanti — marriage compatibility', deity: 'Mangal', duration: '10-12 min', samagri: ['red cloth', 'masoor dal', 'coral', 'red flowers'] },
];

// 8-week rotation of live darshan source temples. Diversity = wider YouTube reach.
const TEMPLE_DARSHAN = [
  { slug: 'kashi-vishwanath', name: 'Kashi Vishwanath, Varanasi', deity: 'Shiva', highlight: 'Mangla aarti pre-dawn' },
  { slug: 'mahalakshmi-mumbai', name: 'Mahalakshmi Temple, Mumbai', deity: 'Lakshmi', highlight: 'Friday evening aarti' },
  { slug: 'iskcon-vrindavan', name: 'ISKCON Vrindavan', deity: 'Krishna', highlight: 'Mangal aarti 4:30 AM' },
  { slug: 'tirumala-tirupati', name: 'Tirumala Tirupati Balaji', deity: 'Venkateshwara', highlight: 'Suprabhata seva' },
  { slug: 'siddhivinayak-mumbai', name: 'Siddhivinayak, Mumbai', deity: 'Ganesha', highlight: 'Tuesday Kakad aarti' },
  { slug: 'jagannath-puri', name: 'Jagannath Puri', deity: 'Jagannath', highlight: 'Mangal aarti + bhog' },
  { slug: 'somnath', name: 'Somnath Jyotirlinga', deity: 'Shiva', highlight: 'Evening sandhya aarti with sea backdrop' },
  { slug: 'vaishno-devi', name: 'Vaishno Devi, Katra', deity: 'Mata Rani', highlight: 'Bhawan darshan aarti' },
];

function buildHowToVideo(week, idx) {
  const p = HOWTO_PUJAS[(week + idx) % HOWTO_PUJAS.length];
  const date = addDays(idx * 7 + 5); // Saturday
  return {
    type: 'how-to-puja',
    schedule: `${date} (Sat) 12:00 IST`,
    title: p.title,
    description: buildHowToDescription(p),
    tags: buildTags(p),
    thumbnail: `Saffron bg + ${p.deity} silhouette + bold ${p.slug.replace(/-/g, ' ')} text + face overlay`,
    crossLink: `https://bhaktisetu.com/pujas/${p.slug}`,
    duration: p.duration,
  };
}

function buildDarshanVideo(week, idx) {
  const t = TEMPLE_DARSHAN[(week + idx) % TEMPLE_DARSHAN.length];
  const date = addDays(idx * 7 + 1); // Tuesday
  return {
    type: 'live-darshan-recording',
    schedule: `${date} (Tue) 12:00 IST`,
    title: `Live Darshan Highlights — ${t.name} | ${t.highlight}`,
    description: buildDarshanDescription(t),
    tags: buildDarshanTags(t),
    thumbnail: `${t.deity} closeup + LIVE badge + Hindi/Eng overlay`,
    crossLink: `https://bhaktisetu.com/darshan/${t.slug}`,
    duration: '15-30 min curated highlight',
  };
}

function buildHowToDescription(p) {
  return [
    `Learn how to perform ${p.title.split(' — ')[0]} at home with a verified Bhaktisetu pandit.`,
    '',
    `${p.deity} puja — full vidhi, mantras, samagri checklist, and scriptural references.`,
    '',
    'In this video:',
    `▸ Complete ${p.duration} step-by-step ritual`,
    `▸ Samagri checklist: ${p.samagri.join(', ')}`,
    '▸ Sanskrit mantras with transliteration + meaning',
    '▸ Common mistakes to avoid',
    '▸ When + where + who can perform',
    '',
    'Book a verified pandit at home (anywhere in India):',
    `→ https://bhaktisetu.com/pujas/${p.slug}`,
    '',
    'NRI gift puja (sponsor from US/UK/Canada/Australia):',
    '→ https://bhaktisetu.com/nri',
    '',
    'Get 80G tax receipt for temple donations:',
    '→ https://bhaktisetu.com/donate',
    '',
    'About Bhaktisetu:',
    'India\'s devotional super-app. Live darshan from 100+ verified temples, video-proof pujas, NRI gift seva, 80G receipts. Founded by devotees, for devotees.',
    '',
    `Scriptural references: see pinned comment for verse-level citations.`,
    '',
    '#bhaktisetu #hindupuja #vedicrituals #sanatandharma',
  ].join('\n');
}

function buildDarshanDescription(t) {
  return [
    `Curated highlights from this week's live darshan at ${t.name}.`,
    '',
    `Featured: ${t.highlight}`,
    `Presiding deity: ${t.deity}`,
    '',
    'In this video:',
    '▸ Mangla / Sandhya aarti highlights',
    '▸ Pandit-led bhog offering',
    '▸ Garbhagriha closeup darshan',
    '▸ Devotee testimonials',
    '',
    `Watch ${t.name} live every day on Bhaktisetu:`,
    `→ https://bhaktisetu.com/darshan/${t.slug}`,
    '',
    'Sponsor a puja at this temple (NRI dual-currency):',
    `→ https://bhaktisetu.com/pujas?temple=${t.slug}`,
    '',
    'Set aarti reminders + receive prasad at home:',
    '→ https://bhaktisetu.com',
    '',
    '#livedarshan #liveaarti #' + t.slug.replace(/-/g, '') + ' #bhaktisetu',
  ].join('\n');
}

function buildTags(p) {
  return [
    p.slug.replace(/-/g, ' '),
    `${p.deity.toLowerCase()} puja`,
    `how to do ${p.slug.replace(/-/g, ' ')}`,
    `${p.slug.replace(/-/g, ' ')} at home`,
    `${p.slug.replace(/-/g, ' ')} vidhi`,
    `${p.slug.replace(/-/g, ' ')} samagri`,
    `${p.slug.replace(/-/g, ' ')} mantra`,
    `${p.slug.replace(/-/g, ' ')} benefits`,
    'hindu puja',
    'vedic rituals',
    'sanatan dharma',
    'bhaktisetu',
    'pandit at home',
    'online puja booking',
    'india devotional app',
  ];
}

function buildDarshanTags(t) {
  return [
    `${t.name.toLowerCase()} live`,
    `${t.name.toLowerCase()} darshan today`,
    `${t.deity.toLowerCase()} aarti`,
    `live aarti ${t.slug.replace(/-/g, ' ')}`,
    `${t.slug.replace(/-/g, ' ')} live stream`,
    'live darshan',
    'live aarti india',
    'temple live stream',
    'devotional live',
    'bhaktisetu',
    'hindu temple live',
    'online darshan',
    'mangla aarti',
    'sandhya aarti',
    t.slug.replace(/-/g, ' '),
  ];
}

function addDays(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildShorts(week) {
  // Daily Mon-Fri 60-sec aarti reels — cross-posted from Instagram (R-Q2-M-004)
  const titles = [
    'Mangla aarti at Kashi Vishwanath — pre-dawn',
    'Friday evening Lakshmi aarti at Mahalakshmi Mandir',
    '108-bell Hanuman Chalisa at Salasar',
    'Sandhya aarti at Somnath with sea waves',
    'Mangal aarti at ISKCON Vrindavan — Krishna jhanki',
  ];
  return titles.map((t, i) => ({
    type: 'shorts',
    schedule: `${addDays(i)} (${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}) — auto Shorts shelf`,
    title: t,
    duration: '60 sec',
    source: 'Instagram reels cross-post (R-Q2-M-004)',
  }));
}

function buildSlate() {
  const slate = [];
  for (let week = 0; week < 4; week++) {
    slate.push({
      week: week + 1,
      darshan: buildDarshanVideo(week, week),
      howto: buildHowToVideo(week, week),
      shorts: buildShorts(week),
    });
  }
  return slate;
}

function renderReport(slate) {
  const lines = [
    `# YouTube Content Plan — 4-week slate generated ${TODAY}`,
    '',
    '> Run: `node scripts/agents/marketing/youtube-content-planner.mjs`',
    '> Owner: founder (records + uploads). Agent: schedule + copy only.',
    '> Roadmap: R-Q2-M-009',
    '',
    '## Cadence',
    '',
    '- **Tuesday 12:00 IST** — live darshan recording (15-30 min curated highlight)',
    '- **Saturday 12:00 IST** — how-to-puja explainer (10-15 min pandit-led)',
    '- **Mon-Fri** — 60-sec aarti reels → Shorts shelf (cross-post from Instagram)',
    '- **Monthly** — Q&A panel (deferred to month-end planning)',
    '',
    '---',
    '',
  ];

  for (const w of slate) {
    lines.push(`## Week ${w.week}`);
    lines.push('');
    lines.push(`### ${w.darshan.type} — ${w.darshan.schedule}`);
    lines.push('');
    lines.push(`**Title**: ${w.darshan.title}`);
    lines.push(`**Duration**: ${w.darshan.duration}`);
    lines.push(`**Thumbnail brief**: ${w.darshan.thumbnail}`);
    lines.push(`**Cross-link**: ${w.darshan.crossLink}`);
    lines.push('');
    lines.push('**Description** (paste into YouTube):');
    lines.push('```');
    lines.push(w.darshan.description);
    lines.push('```');
    lines.push('');
    lines.push(`**Tags**: \`${w.darshan.tags.join(', ')}\``);
    lines.push('');
    lines.push(`### ${w.howto.type} — ${w.howto.schedule}`);
    lines.push('');
    lines.push(`**Title**: ${w.howto.title}`);
    lines.push(`**Duration**: ${w.howto.duration}`);
    lines.push(`**Thumbnail brief**: ${w.howto.thumbnail}`);
    lines.push(`**Cross-link**: ${w.howto.crossLink}`);
    lines.push('');
    lines.push('**Description** (paste into YouTube):');
    lines.push('```');
    lines.push(w.howto.description);
    lines.push('```');
    lines.push('');
    lines.push(`**Tags**: \`${w.howto.tags.join(', ')}\``);
    lines.push('');
    lines.push(`### Daily Shorts (auto from Instagram reels)`);
    lines.push('');
    for (const s of w.shorts) {
      lines.push(`- ${s.schedule} — ${s.title} (${s.duration})`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('## Verification');
  lines.push('');
  lines.push('After uploading each video, founder verifies:');
  lines.push('1. Custom thumbnail matches brief');
  lines.push('2. Description has all cross-links');
  lines.push('3. 15+ tags applied');
  lines.push('4. End-screen card → bhaktisetu.com');
  lines.push('5. Pinned comment with scriptural verse citations');
  lines.push('');
  lines.push('## Subscriber tracking');
  lines.push('');
  lines.push('Manual snapshot weekly. Update `kpi.current` in `docs/roadmap/items/Q2/marketing/009-*.md` on Sunday.');
  lines.push('');
  lines.push('Target: 500 subscribers by end-Q2 (R-Q2-M-009 KPI).');
  lines.push('');

  return lines.join('\n');
}

function main() {
  const slate = buildSlate();
  const body = renderReport(slate);
  writeReport('youtube-content-plan', body);
  upsertLog('youtube-content-planner', `4-week slate generated (weeks ${slate[0].week}-${slate[3].week})`);
}

main();
